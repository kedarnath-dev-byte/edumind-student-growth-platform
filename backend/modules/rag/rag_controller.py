"""
@module RagController
@description FastAPI router for RAG query endpoints.
             Uses keyword search over in-memory chunks from
             ingestion_controller to avoid ChromaDB OOM on free tier.
             Follows Controller -> Service -> Repository pattern.
@author      EduMind AI Engineering
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from groq import Groq
import os

from modules.ingestion.ingestion_controller import chunk_store

router = APIRouter(prefix="/api/v1/rag", tags=["RAG"])


class QueryRequest(BaseModel):
    """Request body for RAG query."""
    question: str
    document_id: str = None  # Optional: search specific doc only


def keyword_search(question: str, document_id: str = None, top_k: int = 5) -> list:
    """
    Search chunks using simple keyword matching.
    Returns top_k most relevant chunks.
    No embeddings needed — saves RAM on free tier.
    """
    question_words = set(question.lower().split())
    scored_chunks = []

    docs_to_search = (
        {document_id: chunk_store[document_id]}
        if document_id and document_id in chunk_store
        else chunk_store
    )

    for doc_id, chunks in docs_to_search.items():
        for chunk in chunks:
            chunk_words = set(chunk.lower().split())
            score = len(question_words & chunk_words)
            if score > 0:
                scored_chunks.append((score, chunk, doc_id))

    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    return scored_chunks[:top_k]


@router.post("/query")
async def query_rag(request: QueryRequest):
    """
    Answer a question using RAG:
    1. Keyword search over in-memory chunks
    2. Build context from top results
    3. Send to Groq LLM for final answer
    """
    try:
        if not chunk_store:
            raise HTTPException(
                status_code=400,
                detail="No documents uploaded yet. Please upload a document first."
            )

        top_chunks = keyword_search(request.question, request.document_id)

        if not top_chunks:
            context = "No relevant content found in uploaded documents."
        else:
            context = "\n\n".join([chunk for _, chunk, _ in top_chunks])

        prompt = f"""You are EduMind AI, an intelligent education assistant.
Use the following context from uploaded documents to answer the question.
If the answer is not in the context, say so honestly.

CONTEXT:
{context}

QUESTION:
{request.question}

ANSWER:"""

        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1024
        )

        answer = response.choices[0].message.content

        return JSONResponse({
            "status": "success",
            "question": request.question,
            "answer": answer,
            "chunks_used": len(top_chunks),
            "sources": list(set([doc_id for _, _, doc_id in top_chunks]))
        })

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))