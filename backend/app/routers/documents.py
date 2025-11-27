import uuid
import os
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

from app.config import STORAGE_PATH, ALLOWED_EXTENSIONS, BACKEND_URL

router = APIRouter()


def get_file_extension(filename: str) -> str:
    return Path(filename).suffix.lower()


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload a DOCX document"""
    
    # Validate file extension
    ext = get_file_extension(file.filename or "")
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Generate unique ID and filename
    doc_id = str(uuid.uuid4())
    safe_filename = f"{doc_id}{ext}"
    file_path = STORAGE_PATH / safe_filename
    
    # Save file
    try:
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    return {
        "id": doc_id,
        "filename": file.filename,
        "stored_filename": safe_filename,
        "url": f"{BACKEND_URL}/storage/{safe_filename}"
    }


@router.get("/{doc_id}")
async def get_document(doc_id: str):
    """Get document metadata for ONLYOFFICE integration"""
    
    # Find the document file
    docx_path = STORAGE_PATH / f"{doc_id}.docx"
    
    if not docx_path.exists():
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {
        "id": doc_id,
        "filename": f"{doc_id}.docx",
        "url": f"{BACKEND_URL}/storage/{doc_id}.docx",
        "key": doc_id,  # ONLYOFFICE document key
    }


@router.get("")
async def list_documents():
    """List all uploaded documents"""
    
    documents = []
    for file_path in STORAGE_PATH.glob("*.docx"):
        doc_id = file_path.stem
        documents.append({
            "id": doc_id,
            "filename": file_path.name,
            "url": f"{BACKEND_URL}/storage/{file_path.name}"
        })
    
    return {"documents": documents}


@router.delete("/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document"""
    
    docx_path = STORAGE_PATH / f"{doc_id}.docx"
    
    if not docx_path.exists():
        raise HTTPException(status_code=404, detail="Document not found")
    
    try:
        os.remove(docx_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")
    
    return {"message": "Document deleted successfully"}

