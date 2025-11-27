from fastapi import APIRouter, HTTPException
from app.config import STORAGE_PATH
from app.services.spellcheck import SpellcheckService

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
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Spellcheck failed: {str(e)}")

