"""
@module    ingestion_controller
@description FastAPI router for document ingestion endpoints.
             Handles file upload and document listing.
             Follows Repository -> Service -> Controller pattern.
@author    EduMind AI Engineering
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import tempfile, os, shutil
from modules.ingestion.ingestion_service import IngestionService

router = APIRouter()
service = IngestionService()

# In-memory document list (resets on server restart - OK for demo)
ingested_docs = []

@router.post("/ingestion/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload and ingest a document (PDF, DOCX, TXT)."""
    try:
        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name
        result = service.ingest(tmp_path)
        os.unlink(tmp_path)
        ingested_docs.append({
            "filename": file.filename,
            "chunks": result.get("chunks", 0),
            "status": "success"
        })
        return JSONResponse({"success": True, "message": f"Ingested {file.filename}", "result": result})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ingestion/documents")
async def get_documents():
    """Get list of all ingested documents."""
    try:
        return JSONResponse(ingested_docs)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

