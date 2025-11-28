"""
Spellcheck router - runs spellcheck on documents stored in GridFS
"""
import logging
import traceback
import tempfile
import os
from bson import ObjectId
from fastapi import APIRouter, HTTPException

from app.database import get_documents_collection, get_gridfs
from app.services.spellcheck import SpellcheckService, DocumentParseError

logger = logging.getLogger(__name__)

router = APIRouter()

spellcheck_service = SpellcheckService()


@router.get("/{doc_id}")
async def spellcheck_document(doc_id: str):
    """Run spellcheck on a document and return errors with suggestions"""
    
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
    temp_file = None
    try:
        # Get file from GridFS
        gridfs_file_id = ObjectId(doc["gridfs_file_id"])
        grid_out = await gridfs.open_download_stream(gridfs_file_id)
        content = await grid_out.read()
        
        # Write to temporary file
        temp_file = tempfile.NamedTemporaryFile(suffix=".docx", delete=False)
        temp_file.write(content)
        temp_file.close()
        
        # Run spellcheck
        errors = spellcheck_service.check_document(temp_file.name)
        
        return {
            "document_id": doc_id,
            "error_count": len(errors),
            "errors": errors
        }
    except DocumentParseError as e:
        # Document format not supported - return empty results gracefully
        logger.warning(f"Document {doc_id} could not be parsed for spellcheck: {str(e)}")
        return {
            "document_id": doc_id,
            "error_count": 0,
            "errors": [],
            "warning": "Document format not fully supported for spellcheck analysis"
        }
    except Exception as e:
        logger.error(f"Spellcheck failed for {doc_id}: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Spellcheck failed: {str(e)}")
    finally:
        # Clean up temporary file
        if temp_file and os.path.exists(temp_file.name):
            try:
                os.unlink(temp_file.name)
            except Exception:
                pass
