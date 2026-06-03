"""
FastAPI application for the proofreading agent service

Provides SSE streaming endpoint for real-time proofreading results.
"""
import json
import logging
import tempfile
import os
import uuid
from typing import AsyncGenerator, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
import google.generativeai as genai

from config import (
    GOOGLE_API_KEY,
    AGENT_PORT,
    MONGODB_URI,
    DATABASE_NAME,
)
from agents.proofreader import proofreading_agent, AGENT_STATUS
from tools.document import get_full_text

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure Gemini
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
else:
    logger.warning("GOOGLE_API_KEY not set - agent will not function")

# MongoDB client (lazy initialization)
_mongo_client = None
_db = None
_gridfs = None


def get_mongo_client():
    global _mongo_client
    if _mongo_client is None:
        _mongo_client = AsyncIOMotorClient(MONGODB_URI)
    return _mongo_client


def get_database():
    global _db
    if _db is None:
        _db = get_mongo_client()[DATABASE_NAME]
    return _db


def get_gridfs():
    global _gridfs
    if _gridfs is None:
        _gridfs = AsyncIOMotorGridFSBucket(get_database())
    return _gridfs


# FastAPI app
app = FastAPI(
    title="Proofreading Agent Service",
    description="Multi-agent proofreading service using Google ADK",
    version="0.1.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def download_document(doc_id: str) -> str:
    """
    Download document from MongoDB GridFS to a temporary file.
    
    Args:
        doc_id: Document ID in the database
        
    Returns:
        Path to temporary file
    """
    db = get_database()
    gridfs = get_gridfs()
    
    # Get document metadata
    try:
        doc = await db.documents.find_one({"_id": ObjectId(doc_id)})
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid document ID: {e}")
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Download from GridFS
    try:
        gridfs_file_id = ObjectId(doc["gridfs_file_id"])
        grid_out = await gridfs.open_download_stream(gridfs_file_id)
        content = await grid_out.read()
        
        # Write to temp file
        temp_file = tempfile.NamedTemporaryFile(suffix=".docx", delete=False)
        temp_file.write(content)
        temp_file.close()
        
        return temp_file.name
    except Exception as e:
        logger.error(f"Failed to download document: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to download document: {e}")


def parse_issues(issues_json: str, category: str) -> list[dict[str, Any]]:
    """
    Parse issues from agent output and add category/id.
    
    Args:
        issues_json: JSON string from agent output
        category: Category name (spelling, grammar, consistency, formatting)
        
    Returns:
        List of issue dictionaries
    """
    try:
        # Handle if already a list
        if isinstance(issues_json, list):
            issues = issues_json
        else:
            # Parse JSON string
            text = str(issues_json).strip()
            
            # Remove markdown code blocks if present
            if text.startswith("```"):
                lines = text.split("\n")
                json_lines = []
                in_block = False
                for line in lines:
                    if line.startswith("```"):
                        in_block = not in_block
                        continue
                    if in_block:
                        json_lines.append(line)
                text = "\n".join(json_lines).strip()
            
            issues = json.loads(text)
        
        if not isinstance(issues, list):
            return []
        
        # Add category and ID to each issue
        result = []
        for issue in issues:
            if isinstance(issue, dict) and issue.get("find"):
                issue["id"] = str(uuid.uuid4())[:8]
                issue["category"] = category
                result.append(issue)
        
        return result
    except (json.JSONDecodeError, Exception) as e:
        logger.warning(f"Failed to parse issues: {e}")
        return []


async def generate_proofreading_events(
    doc_id: str,
    temp_path: str,
) -> AsyncGenerator[str, None]:
    """
    Generate SSE events for proofreading.
    
    Yields events:
    - status: Agent status updates
    - issue: Individual proofreading issues
    - done: Completion notification
    """
    try:
        # Send initial status
        yield f"event: status\ndata: {json.dumps({'message': 'Starting analysis...'})}\n\n"
        
        # Get document text
        doc_data = get_full_text(temp_path)
        if "error" in doc_data:
            yield f"event: error\ndata: {json.dumps({'error': doc_data['error']})}\n\n"
            return
        
        document_text = doc_data["text"]
        
        if not document_text.strip():
            yield f"event: status\ndata: {json.dumps({'message': 'Document is empty'})}\n\n"
            yield f"event: done\ndata: {json.dumps({'total': 0})}\n\n"
            return
        
        # Create session and runner
        session_service = InMemorySessionService()
        runner = Runner(
            agent=proofreading_agent,
            app_name="proofreader",
            session_service=session_service,
        )
        
        # Create session with file path in state
        session = await session_service.create_session(
            app_name="proofreader",
            user_id="user",
            state={"file_path": temp_path},
        )
        
        agents_started = set()
        total_issues = 0
        
        # Run the parallel agent
        user_message_text = f"""The document file is at: {temp_path}

Use the available tools to analyze the document and find issues.

DOCUMENT TEXT:
---
{document_text}
---

Find and report all issues in the document."""

        # Wrap in Content object with role for Google ADK
        user_content = types.Content(
            role="user",
            parts=[types.Part(text=user_message_text)]
        )

        async for event in runner.run_async(
            session_id=session.id,
            user_id="user",
            new_message=user_content,
        ):
            # Send status when an agent starts
            author = getattr(event, 'author', None)
            if author and author not in agents_started and author in AGENT_STATUS:
                agents_started.add(author)
                status_msg = AGENT_STATUS.get(author, f"{author} processing...")
                yield f"event: status\ndata: {json.dumps({'message': status_msg, 'agent': author})}\n\n"
            
            # Check for state updates (agent outputs)
            actions = getattr(event, 'actions', None)
            if actions:
                state_delta = getattr(actions, 'state_delta', None)
                if state_delta:
                    for key, value in state_delta.items():
                        if key.endswith("_issues"):
                            category = key.replace("_issues", "")
                            issues = parse_issues(value, category)
                            for issue in issues:
                                total_issues += 1
                                yield f"event: issue\ndata: {json.dumps(issue)}\n\n"
        
        # Send completion
        yield f"event: status\ndata: {json.dumps({'message': 'Analysis complete!'})}\n\n"
        yield f"event: done\ndata: {json.dumps({'total': total_issues})}\n\n"
        
    except Exception as e:
        logger.error(f"Proofreading error: {e}", exc_info=True)
        yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
    
    finally:
        # Clean up temp file
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except Exception:
                pass


@app.get("/proofread/{doc_id}")
async def proofread_document(doc_id: str):
    """
    Stream proofreading issues for a document using Server-Sent Events.
    
    SSE Event Types:
    - status: Agent status message (what the agent is doing)
    - issue: A proofreading issue found
    - done: Proofreading complete with total count
    - error: An error occurred
    """
    # Download document to temp file
    temp_path = await download_document(doc_id)
    
    return StreamingResponse(
        generate_proofreading_events(doc_id, temp_path),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "proofreading-agent",
        "gemini_configured": bool(GOOGLE_API_KEY),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=AGENT_PORT)


