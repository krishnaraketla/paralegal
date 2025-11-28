"""
Proofreading router - SSE streaming endpoint for document proofreading
"""
import logging
import traceback
import tempfile
import os
import json
from bson import ObjectId
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.database import get_documents_collection, get_gridfs
from app.services.proofreading import ProofreadingService, DocumentParseError

logger = logging.getLogger(__name__)

router = APIRouter()

proofreading_service = ProofreadingService()


async def generate_sse_events(doc_id: str, temp_file_path: str):
    """Generator that yields SSE events for proofreading issues"""
    try:
        issue_count = 0
        for issue in proofreading_service.proofread_document_stream(temp_file_path):
            issue_count += 1
            # SSE format: event type + data
            yield f"event: issue\ndata: {json.dumps(issue)}\n\n"
        
        # Send done event
        yield f"event: done\ndata: {json.dumps({'total': issue_count})}\n\n"
        
    except DocumentParseError as e:
        logger.warning(f"Document {doc_id} could not be parsed: {str(e)}")
        yield f"event: error\ndata: {json.dumps({'error': 'Document format not supported'})}\n\n"
    except Exception as e:
        logger.error(f"Proofreading failed for {doc_id}: {str(e)}")
        logger.error(traceback.format_exc())
        yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
    finally:
        # Clean up temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
            except Exception:
                pass


@router.get("/{doc_id}")
async def proofread_document(doc_id: str):
    """
    Stream proofreading issues for a document using Server-Sent Events.
    
    SSE Event Types:
    - issue: A proofreading issue found (data contains the issue object)
    - done: Proofreading complete (data contains total count)
    - error: An error occurred (data contains error message)
    """
    documents = get_documents_collection()
    gridfs = get_gridfs()
    
    # Get document metadata
    try:
        doc = await documents.find_one({"_id": ObjectId(doc_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID")
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Download file from GridFS to a temporary file
    try:
        gridfs_file_id = ObjectId(doc["gridfs_file_id"])
        grid_out = await gridfs.open_download_stream(gridfs_file_id)
        content = await grid_out.read()
        
        # Write to temporary file
        temp_file = tempfile.NamedTemporaryFile(suffix=".docx", delete=False)
        temp_file.write(content)
        temp_file.close()
        
        # Return SSE streaming response
        return StreamingResponse(
            generate_sse_events(doc_id, temp_file.name),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",  # Disable nginx buffering
            }
        )
    except Exception as e:
        logger.error(f"Failed to prepare document for proofreading: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to prepare document: {str(e)}")

