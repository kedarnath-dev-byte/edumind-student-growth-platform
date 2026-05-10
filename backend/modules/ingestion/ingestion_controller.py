"""
@module IngestionController
@description FastAPI router for document ingestion endpoints.
             Stores chunks in a shared in-memory store instead of
             ChromaDB to avoid OOM on Render free tier (512MB limit).
             Follows Controller -> Service -> Repository pattern.
@author      EduMind AI Engineering
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import tempfile
import os

# Shared in-memory chunk store — imported by rag_controller too
chunk_store: dict = {}

router = APIRouter(prefix="/api/v1/ingestion", tags=["Ingestion"])


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload a PDF or text document and store its chunks in memory."""
    try:
        suffix = os.path.splitext(file.filename)[-1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        text = ""
        if suffix.lower() == ".pdf":
            import fitz
            doc = fitz.open(tmp_path)
            for page in doc:
                text += page.get_text()
            doc.close()
        else:
            with open(tmp_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()

        os.unlink(tmp_path)

        chunk_size = 500
        overlap = 50
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunks.append(text[start:end])
            start += chunk_size - overlap

        doc_id = file.filename
        chunk_store[doc_id] = chunks

        return JSONResponse({
            "status": "success",
            "document_id": doc_id,
            "chunks": len(chunks),
            "message": f"Document ingested with {len(chunks)} chunks"
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/documents")
async def list_documents():
    """List all documents currently stored in memory."""
    try:
        documents = [
            {"document_id": doc_id, "chunks": len(chunks)}
            for doc_id, chunks in chunk_store.items()
        ]
        return JSONResponse({"status": "success", "documents": documents})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))