"""
Storage router - serves files from GridFS
"""
from io import BytesIO
from bson import ObjectId
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.database import get_documents_collection, get_gridfs

router = APIRouter()


@router.get("/{doc_id}")
async def get_file(doc_id: str):
    """Stream a document file from GridFS"""
    documents = get_documents_collection()
    gridfs = get_gridfs()
    
    # Get document metadata
    try:
        doc = await documents.find_one({"_id": ObjectId(doc_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID")
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get file from GridFS
    try:
        gridfs_file_id = ObjectId(doc["gridfs_file_id"])
        grid_out = await gridfs.open_download_stream(gridfs_file_id)
        
        # Read file content
        content = await grid_out.read()
        
        # Determine content type
        content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        if grid_out.metadata and "content_type" in grid_out.metadata:
            content_type = grid_out.metadata["content_type"]
        
        # Return as streaming response
        return StreamingResponse(
            BytesIO(content),
            media_type=content_type,
            headers={
                "Content-Disposition": f'inline; filename="{doc["original_filename"]}"',
                "Content-Length": str(len(content)),
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve file: {str(e)}")

