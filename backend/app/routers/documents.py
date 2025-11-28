"""
Documents router - CRUD with MongoDB + GridFS, scoped to cases
"""
from datetime import datetime
from typing import List
from pathlib import Path
from bson import ObjectId
from fastapi import APIRouter, UploadFile, File, HTTPException, Query

from app.config import ALLOWED_EXTENSIONS, BACKEND_URL
from app.database import (
    get_documents_collection,
    get_cases_collection,
    get_users_collection,
    get_gridfs,
)
from app.models.document import DocumentResponse

router = APIRouter()


def get_file_extension(filename: str) -> str:
    return Path(filename).suffix.lower()


@router.post("", response_model=DocumentResponse)
async def upload_document(
    case_id: str,
    created_by: str,
    file: UploadFile = File(...),
):
    """Upload a document to a case"""
    documents = get_documents_collection()
    cases = get_cases_collection()
    users = get_users_collection()
    gridfs = get_gridfs()
    
    # Validate file extension
    ext = get_file_extension(file.filename or "")
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Verify case exists
    try:
        case = await cases.find_one({"_id": ObjectId(case_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid case ID")
    
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Verify user exists
    try:
        user = await users.find_one({"_id": ObjectId(created_by)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Read file content
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read file: {str(e)}")
    
    # Store file in GridFS
    try:
        gridfs_file_id = await gridfs.upload_from_stream(
            file.filename or "document.docx",
            content,
            metadata={
                "content_type": file.content_type or "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to store file: {str(e)}")
    
    now = datetime.utcnow()
    
    # Create document metadata
    doc_data = {
        "case_id": case_id,
        "original_filename": file.filename or "document.docx",
        "gridfs_file_id": str(gridfs_file_id),
        "created_by": created_by,
        "created_at": now,
        "updated_at": now,
    }
    
    result = await documents.insert_one(doc_data)
    doc_id = str(result.inserted_id)
    
    return DocumentResponse(
        id=doc_id,
        case_id=case_id,
        original_filename=doc_data["original_filename"],
        created_by=created_by,
        created_at=now,
        updated_at=now,
        url=f"{BACKEND_URL}/storage/{doc_id}",
    )


@router.get("", response_model=List[DocumentResponse])
async def list_documents(case_id: str = Query(..., description="Case ID to list documents for")):
    """List all documents in a case"""
    documents = get_documents_collection()
    cases = get_cases_collection()
    
    # Verify case exists
    try:
        case = await cases.find_one({"_id": ObjectId(case_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid case ID")
    
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    result = []
    async for doc in documents.find({"case_id": case_id}):
        result.append(DocumentResponse(
            id=str(doc["_id"]),
            case_id=doc["case_id"],
            original_filename=doc["original_filename"],
            created_by=doc["created_by"],
            created_at=doc["created_at"],
            updated_at=doc["updated_at"],
            url=f"{BACKEND_URL}/storage/{str(doc['_id'])}",
        ))
    
    return result


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: str):
    """Get document metadata"""
    documents = get_documents_collection()
    
    try:
        doc = await documents.find_one({"_id": ObjectId(doc_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID")
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return DocumentResponse(
        id=str(doc["_id"]),
        case_id=doc["case_id"],
        original_filename=doc["original_filename"],
        created_by=doc["created_by"],
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
        url=f"{BACKEND_URL}/storage/{doc_id}",
    )


@router.delete("/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document and its file from GridFS"""
    documents = get_documents_collection()
    gridfs = get_gridfs()
    
    try:
        doc = await documents.find_one({"_id": ObjectId(doc_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID")
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete file from GridFS
    try:
        await gridfs.delete(ObjectId(doc["gridfs_file_id"]))
    except Exception as e:
        print(f"Warning: Failed to delete GridFS file: {e}")
    
    # Delete document metadata
    await documents.delete_one({"_id": ObjectId(doc_id)})
    
    return {"message": "Document deleted successfully"}
