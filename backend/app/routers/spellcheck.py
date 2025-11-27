import logging
import traceback
from fastapi import APIRouter, HTTPException
from app.config import STORAGE_PATH
from app.services.spellcheck import SpellcheckService, DocumentParseError

logger = logging.getLogger(__name__)

router = APIRouter()

spellcheck_service = SpellcheckService()


@router.get("/{doc_id}")
async def spellcheck_document(doc_id: str):
    """Run spellcheck on a document and return errors with suggestions"""
    
    docx_path = STORAGE_PATH / f"{doc_id}.docx"
    
    if not docx_path.exists():
        raise HTTPException(status_code=404, detail="Document not found")
    
    try:
        errors = spellcheck_service.check_document(str(docx_path))
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

