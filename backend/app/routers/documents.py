import uuid
import os
import json
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

from app.config import STORAGE_PATH, ALLOWED_EXTENSIONS, BACKEND_URL

router = APIRouter()


def get_file_extension(filename: str) -> str:
    return Path(filename).suffix.lower()


def get_metadata_path(doc_id: str) -> Path:
    """Get the metadata file path for a document"""
    return STORAGE_PATH / f"{doc_id}.meta.json"


def save_metadata(doc_id: str, original_filename: str):
    """Save document metadata including original filename"""
    metadata = {"original_filename": original_filename}
    with open(get_metadata_path(doc_id), "w") as f:
        json.dump(metadata, f)


def load_metadata(doc_id: str) -> dict:
    """Load document metadata, returns empty dict if not found"""
    meta_path = get_metadata_path(doc_id)
    if meta_path.exists():
        with open(meta_path, "r") as f:
            return json.load(f)
    return {}


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
        # Save metadata with original filename
        save_metadata(doc_id, file.filename or safe_filename)
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
    
    metadata = load_metadata(doc_id)
    filename = metadata.get("original_filename", f"{doc_id}.docx")
    
    return {
        "id": doc_id,
        "filename": filename,
        "url": f"{BACKEND_URL}/storage/{doc_id}.docx",
        "key": doc_id,  # ONLYOFFICE document key
    }


@router.get("")
async def list_documents():
    """List all uploaded documents"""
    
    # Pre-load all metadata files in one pass for efficiency
    metadata_cache = {}
    for meta_path in STORAGE_PATH.glob("*.meta.json"):
        doc_id = meta_path.stem.replace(".meta", "")
        try:
            with open(meta_path, "r") as f:
                metadata_cache[doc_id] = json.load(f)
        except Exception:
            pass
    
    documents = []
    for file_path in STORAGE_PATH.glob("*.docx"):
        doc_id = file_path.stem
        metadata = metadata_cache.get(doc_id, {})
        # Use original filename from metadata, fall back to stored filename
        filename = metadata.get("original_filename", file_path.name)
        documents.append({
            "id": doc_id,
            "filename": filename,
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
        # Also remove metadata file if it exists
        meta_path = get_metadata_path(doc_id)
        if meta_path.exists():
            os.remove(meta_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")
    
    return {"message": "Document deleted successfully"}

