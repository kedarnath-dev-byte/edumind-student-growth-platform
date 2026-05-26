# EduMind AI Deployment Guide

This project has two deployable applications:

- Backend: FastAPI API, deployed on Render.
- Frontend: React/Vite website, deployed on Vercel.

Do not open `localhost:8000` unless the backend server is running locally. `localhost` only means "this computer"; schools cannot access it from their devices.

## 1. Backend Deployment on Render

1. Push this repository to GitHub.
2. Go to Render and create a new Web Service from the repository.
3. Use the existing `render.yaml` blueprint if Render detects it.
4. Confirm these settings:

```text
Root Directory: backend
Build Command: pip install -r requirements.txt
Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
Python Version: 3.11.9
Health Check Path: /api/v1/health
```

5. Add environment variables in Render:

```text
ENVIRONMENT=production
SECRET_KEY=<long-random-secret>
GROQ_API_KEY=<your-groq-api-key>
DATABASE_URL=<optional-render-postgres-url>
```

SQLite can work for a simple demo, but for school pilots use PostgreSQL so data survives redeploys more reliably.

After deployment, test:

```text
https://your-render-service-name.onrender.com/
https://your-render-service-name.onrender.com/api/v1/health
```

Expected backend root response:

```json
{"status":"ok","app":"EduMind AI","version":"1.0.0"}
```

## 2. Frontend Deployment on Vercel

1. Import the same GitHub repository into Vercel.
2. Set the project root directory to:

```text
frontend
```

3. Use these settings:

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

4. Add this Vercel environment variable:

```text
VITE_API_BASE_URL=https://your-render-service-name.onrender.com
```

5. Redeploy the frontend after adding the environment variable.

## 3. Local Development

Use Python 3.11 for the backend.

Backend:

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open the frontend URL shown by Vite, usually:

```text
http://localhost:5173
```

The backend health URL is:

```text
http://localhost:8000/api/v1/health
```

## 4. What To Tell Schools

EduMind AI is deployed as a web application:

- Schools open the Vercel frontend URL.
- The frontend calls the Render backend API.
- The backend handles document ingestion, RAG question answering, evaluation, and AI workflows.

For a real pilot, prepare:

- a stable domain name
- PostgreSQL database
- protected admin access
- uploaded-document storage policy
- privacy and student-data handling policy
- monitoring for API errors and usage

## 5. Common Confusion

`localhost:8000` is not the public website. It is only the local backend API address while developing on your own computer.

For demoing to schools, share the Vercel frontend URL, not a localhost URL.
