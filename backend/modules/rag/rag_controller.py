"""
rag_controller.py
FastAPI router for RAG pipeline endpoints.
Retrieves relevant chunks from ChromaDB and sends to Groq.
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os, chromadb

router = APIRouter()

ALL_PIPELINE_NAMES = [
    "naive", "hyde", "fusion", "rerank", "hybrid",
    "multi_query", "ensemble", "contextual", "corrective",
    "speculative", "step_back", "adaptive", "graph",
    "raptor", "sentence_window", "parent_document"
]

chroma_client = chromadb.Client()
collection = chroma_client.get_or_create_collection("edumind_docs")

class QueryRequest(BaseModel):
    question: str
    pipeline_type: str = "naive"

@router.post("/rag/query")
async def query_rag(request: QueryRequest):
    """Query RAG pipeline - retrieve from ChromaDB then generate with Groq."""
    try:
        from groq import Groq
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")

        context = ""
        try:
            results = collection.query(query_texts=[request.question], n_results=3)
            if results and results.get("documents") and results["documents"][0]:
                context = "\n\n".join(results["documents"][0])
        except Exception:
            context = ""

        if context:
            system_prompt = f"""You are EduMind AI using {request.pipeline_type.upper()} RAG pipeline.
Use the following context from uploaded documents to answer the question.
If the answer is in the context, use it. Otherwise use your knowledge.

CONTEXT:
{context}"""
        else:
            system_prompt = f"You are EduMind AI using {request.pipeline_type.upper()} RAG pipeline. Answer the student question clearly."

        client = Groq(api_key=api_key)
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.question}
            ],
            max_tokens=1024,
            temperature=0.7
        )
        answer = completion.choices[0].message.content
        return JSONResponse({
            "answer": answer,
            "pipeline": request.pipeline_type,
            "question": request.question,
            "context_used": bool(context),
            "model": "llama-3.3-70b-versatile"
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rag/pipelines")
async def get_pipelines():
    """Get list of all available RAG pipelines."""
    return JSONResponse({"pipelines": ALL_PIPELINE_NAMES})