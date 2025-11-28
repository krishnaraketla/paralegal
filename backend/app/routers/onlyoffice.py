"""
OnlyOffice integration router - handles callbacks and config generation
"""
from datetime import datetime
from typing import Optional
from bson import ObjectId
import jwt
import requests
from fastapi import APIRouter, Request, HTTPException, Query
from fastapi.responses import JSONResponse

from app.config import ONLYOFFICE_JWT_SECRET, BACKEND_DOCKER_URL
from app.database import get_documents_collection, get_gridfs

router = APIRouter()


@router.post("/callback")
async def onlyoffice_callback(request: Request):
    """
    Handle ONLYOFFICE Document Server callbacks
    
    Status codes from ONLYOFFICE:
    0 - No document with the key identifier could be found
    1 - Document is being edited
    2 - Document is ready for saving
    3 - Document saving error has occurred
    4 - Document is closed with no changes
    6 - Document is being edited, but the current document state is saved
    7 - Error has occurred while force saving the document
    """
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    status = body.get("status")
    key = body.get("key")
    
    # Extract doc_id from key (format: docId__sessionKey or just docId)
    doc_id = key.split("__")[0] if key and "__" in key else key
    
    # Status 2 or 6 means document is ready for saving
    if status in [2, 6]:
        download_url = body.get("url")
        
        if not download_url:
            return JSONResponse(content={"error": 1}, status_code=200)
        
        try:
            # Download the updated document from ONLYOFFICE
            response = requests.get(download_url, timeout=30)
            response.raise_for_status()
            content = response.content
            
            # Get the document metadata
            documents = get_documents_collection()
            doc = await documents.find_one({"_id": ObjectId(doc_id)})
            
            if not doc:
                print(f"Document not found: {doc_id}")
                return JSONResponse(content={"error": 1})
            
            # Get GridFS
            gridfs = get_gridfs()
            
            # Delete old file from GridFS
            try:
                await gridfs.delete(ObjectId(doc["gridfs_file_id"]))
            except Exception as e:
                print(f"Warning: Failed to delete old GridFS file: {e}")
            
            # Upload new file to GridFS
            new_gridfs_id = await gridfs.upload_from_stream(
                doc["original_filename"],
                content,
                metadata={
                    "content_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                }
            )
            
            # Update document metadata with new GridFS file ID
            await documents.update_one(
                {"_id": ObjectId(doc_id)},
                {
                    "$set": {
                        "gridfs_file_id": str(new_gridfs_id),
                        "updated_at": datetime.utcnow(),
                    }
                }
            )
            
            return JSONResponse(content={"error": 0})
        except Exception as e:
            print(f"Error saving document: {e}")
            return JSONResponse(content={"error": 1})
    
    # For other statuses, just acknowledge
    return JSONResponse(content={"error": 0})


@router.get("/config/{doc_id}")
async def get_onlyoffice_config(
    doc_id: str, 
    request: Request,
    filename: Optional[str] = Query(None, description="Original filename to display"),
    session_key: Optional[str] = Query(None, description="Unique session key for this editor instance")
):
    """Generate ONLYOFFICE editor configuration for a document"""
    
    documents = get_documents_collection()
    
    try:
        doc = await documents.find_one({"_id": ObjectId(doc_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID")
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Use BACKEND_DOCKER_URL for URLs that OnlyOffice (in Docker) needs to access
    docker_url = BACKEND_DOCKER_URL.rstrip("/")
    
    # Use provided filename or fall back to original filename
    display_title = filename if filename else doc["original_filename"]
    
    # Use unique session key so each editor session is completely separate
    document_key = f"{doc_id}__{session_key}" if session_key else doc_id
    
    config = {
        "document": {
            "fileType": "docx",
            "key": document_key,
            "title": display_title,
            "url": f"{docker_url}/storage/{doc_id}",
            "permissions": {
                "edit": True,
                "download": True,
                "print": True,
                "review": True,
                "comment": True,
            }
        },
        "editorConfig": {
            "mode": "edit",
            "header": False,
            "user": {
                "id": doc.get("created_by", "1234567890"),
                "name": "User",
                "email": "user@example.com"
            },
            "callbackUrl": f"{docker_url}/api/onlyoffice/callback",
            "lang": "en",
            "customization": {
                "autosave": True,
                "chat": False,
                "comments": True,
                "compactHeader": True,
                "compactToolbar": True,
                "feedback": False,
                "forcesave": True,
                "help": False,
                "hideRightMenu": True,
                "hideRulers": False,
                "showReviewChanges": False,
                "spellcheck": True,
                "toolbarNoTabs": False,
                "unit": "inch",
                "zoom": 100,
                "uiTheme": "gray",
                "toolbar": "classic",
            }
        },
        "documentType": "word"
    }
    
    # Sign the config with JWT token for OnlyOffice Document Server
    token = jwt.encode(config, ONLYOFFICE_JWT_SECRET, algorithm="HS256")
    config["token"] = token
    
    return config
