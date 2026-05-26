# edumind-ai

An intelligent education platform built around RAG, LangGraph-style workflows, evaluation, ingestion, and a FastAPI backend with a frontend workspace.

## Portfolio Role

This repository is maintained by Mamani Kedarnath as an applied AI education platform project. It demonstrates backend API structure, document ingestion, RAG flow design, evaluation endpoints, and full-stack project organization.

## Core Capabilities

- FastAPI backend with modular routers
- Health, ingestion, RAG, and evaluation APIs
- Database initialization on application startup
- Timing middleware for evaluation/latency visibility
- Frontend workspace for the education UI
- Environment and dependency structure for local development

## Backend Entry Point

```text
backend/main.py
```

The FastAPI app registers:

- Health routes
- Ingestion routes
- RAG routes
- Evaluation routes
- Timing middleware

## Suggested Local Run

```bash
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

## Tech Stack

- Python
- FastAPI
- RAG architecture
- LangGraph-oriented workflow design
- Database-backed backend modules
- JavaScript frontend workspace

## Future Improvements

- Add API examples for ingestion and RAG endpoints
- Add screenshots or a demo video
- Add `.env.example`
- Add tests for health, ingestion, and RAG routes
- Rename the repository from `edumind-ai-` to `edumind-ai-platform`

## EduMind Student Growth Platform Direction

EduMind AI is evolving into the EduMind Student Growth Platform: a school and college product for daily learning logs, honest understanding tracking, short student explanation videos, spaced revision, teacher visibility, and parent progress monitoring.

The core student loop is: teacher teaches a topic, student records what was taught, what they understood, what they did not understand yet, and a short explanation video. The app then creates revision tasks after 24H, 7D, 1M, 3M, and 6M so students build memory, confidence, and communication through consistent revision.

Future work should preserve the existing RAG, ingestion, health, and evaluation modules while adding new student-growth features through FastAPI, modular services, SQLAlchemy, Pydantic, React/Vite/Tailwind, and `/api/v1` APIs. Student benefit comes first: avoid shame, fear, fake understanding, and unhealthy comparison. Reward honesty, revision, improvement, consistency, and communication.
