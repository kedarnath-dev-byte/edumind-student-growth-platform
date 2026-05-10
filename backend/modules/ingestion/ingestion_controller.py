"""
ingestion_controller.py
FastAPI router for document ingestion endpoints.
Stores document chunks in ChromaDB for RAG retrieval.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import tempfile, os, shutil, chromadb

from modules.ingestion.ingestion_service import IngestionService

router = APIRouter()
service = IngestionService()
ingested_docs = []

# ChromaDB client - persistent storage
chroma_client = chromadb.Client()
collection = chroma_client.get_or_create_collection("edumind_docs")

@router.post("/ingestion/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload, chunk, and store document in ChromaDB."""
    try:
        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name
        result = service.ingest(tmp_path)
        os.unlink(tmp_path)

        if result.get("success") and result.get("chunks"):
            chunks = result["chunks"]
            texts = [c["content"] for c in chunks]
            ids = [f"{file.filename}_chunk_{c['chunk_index']}" for c in chunks]
            metadatas = [{"filename": file.filename, "chunk_index": c["chunk_index"]} for c in chunks]
            collection.upsert(documents=texts, ids=ids, metadatas=metadatas)

        ingested_docs.append({
            "filename": file.filename,
            "chunks": result.get("total_chunks", 0),
            "status": "success"
        })
        return JSONResponse({
            "success": True,
            "message": f"Ingested {file.filename}",
            "chunks_stored": result.get("total_chunks", 0)
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ingestion/documents")
async def get_documents():
    """Get list of all ingested documents."""
    try:
        return JSONResponse(ingested_docs)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))