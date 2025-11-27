import os
import jwt
import requests
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse

from app.config import STORAGE_PATH, ONLYOFFICE_JWT_SECRET, BACKEND_DOCKER_URL

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
    
    # Status 2 or 6 means document is ready for saving
    if status in [2, 6]:
        download_url = body.get("url")
        
        if not download_url:
            return JSONResponse(content={"error": 1}, status_code=200)
        
        try:
            # Download the updated document from ONLYOFFICE
            response = requests.get(download_url, timeout=30)
            response.raise_for_status()
            
            # Save the document
            file_path = STORAGE_PATH / f"{key}.docx"
            with open(file_path, "wb") as f:
                f.write(response.content)
            
            return JSONResponse(content={"error": 0})
        except Exception as e:
            print(f"Error saving document: {e}")
            return JSONResponse(content={"error": 1})
    
    # For other statuses, just acknowledge
    return JSONResponse(content={"error": 0})


@router.get("/config/{doc_id}")
async def get_onlyoffice_config(doc_id: str, request: Request):
    """Generate ONLYOFFICE editor configuration for a document"""
    
    docx_path = STORAGE_PATH / f"{doc_id}.docx"
    
    if not docx_path.exists():
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Use BACKEND_DOCKER_URL for URLs that OnlyOffice (in Docker) needs to access
    # This uses host.docker.internal to reach the host machine from Docker
    docker_url = BACKEND_DOCKER_URL.rstrip("/")
    
    config = {
        "document": {
            "fileType": "docx",
            "key": doc_id,
            "title": f"{doc_id}.docx",
            "url": f"{docker_url}/storage/{doc_id}.docx",
            "permissions": {
                "edit": True,
                "download": True,
                "print": True,
                "review": True,  # Enable Track Changes
                "comment": True,
            }
        },
        "editorConfig": {
            "mode": "edit",
            "header": False,
            "user": {
                "id": "1234567890",
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

