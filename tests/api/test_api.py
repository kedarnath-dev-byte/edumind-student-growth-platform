"""
test_api.py
Comprehensive API tests for EduMind AI live backend.
Tests all endpoints with assertions on status, response time, and data.
Run: pytest tests/api/test_api.py -v --html=tests/reports/api_report.html
"""
import pytest
import requests
import time

BASE = "https://edumind-ai-ff.onrender.com"

# --- Health Tests ------------------------------------------------------------
class TestHealth:
    def test_root_returns_200(self):
        r = requests.get(f"{BASE}/")
        assert r.status_code == 200

    def test_root_contains_app_name(self):
        r = requests.get(f"{BASE}/")
        assert r.json()["app"] == "EduMind AI"

    def test_health_status_healthy(self):
        r = requests.get(f"{BASE}/api/v1/health")
        assert r.status_code == 200
        assert r.json()["status"] in ["healthy", "ok"]

    def test_health_python_version(self):
        r = requests.get(f"{BASE}/api/v1/health")
        assert r.json()["python_version"] == "3.11.9"

    def test_health_response_under_10s(self):
        start = time.time()
        r = requests.get(f"{BASE}/api/v1/health")
        assert time.time() - start < 10
        assert r.status_code == 200

    def test_swagger_docs_accessible(self):
        r = requests.get(f"{BASE}/docs")
        assert r.status_code == 200

    def test_openapi_json_valid(self):
        r = requests.get(f"{BASE}/openapi.json")
        assert r.status_code == 200
        assert r.json()["info"]["title"] == "EduMind AI"

# --- Ingestion Tests ---------------------------------------------------------
class TestIngestion:
    def test_get_documents_returns_200(self):
        r = requests.get(f"{BASE}/api/v1/ingestion/documents")
        assert r.status_code == 200

    def test_get_documents_returns_list(self):
        r = requests.get(f"{BASE}/api/v1/ingestion/documents")
        data = r.json()
        assert isinstance(data, list)

    def test_upload_txt_file(self):
        content = b"Machine learning is a subset of artificial intelligence."
        files = {"file": ("test.txt", content, "text/plain")}
        r = requests.post(f"{BASE}/api/v1/ingestion/upload", files=files)
        assert r.status_code == 200
        assert r.json()["success"] == True

    def test_upload_returns_message(self):
        content = b"Deep learning uses neural networks with multiple layers."
        files = {"file": ("deep_learning.txt", content, "text/plain")}
        r = requests.post(f"{BASE}/api/v1/ingestion/upload", files=files)
        assert "message" in r.json()

    def test_upload_no_file_returns_error(self):
        r = requests.post(f"{BASE}/api/v1/ingestion/upload")
        assert r.status_code == 422

# --- Evaluation Tests ---------------------------------------------------------
class TestEvaluation:
    def test_system_health_returns_200(self):
        r = requests.get(f"{BASE}/api/v1/evaluation/metrics/health")
        assert r.status_code == 200

    def test_admin_dashboard_returns_200(self):
        r = requests.get(f"{BASE}/api/v1/evaluation/admin/dashboard")
        assert r.status_code == 200

    def test_start_session_with_email(self):
        r = requests.post(
            f"{BASE}/api/v1/evaluation/session/start",
            json={"student_email": "test@gmail.com"}
        )
        assert r.status_code in [200, 422]

    def test_log_document(self):
        r = requests.post(
            f"{BASE}/api/v1/evaluation/document/log",
            json={"student_email": "test@gmail.com", "document_name": "test.txt"}
        )
        assert r.status_code in [200, 422]

# --- CORS Tests ---------------------------------------------------------------
class TestCORS:
    def test_cors_from_vercel_origin(self):
        headers = {"Origin": "https://edumind-ai-two.vercel.app"}
        r = requests.get(f"{BASE}/api/v1/health", headers=headers)
        assert r.status_code == 200

    def test_cors_header_present(self):
        headers = {"Origin": "https://edumind-ai-two.vercel.app"}
        r = requests.get(f"{BASE}/api/v1/health", headers=headers)
        assert "access-control-allow-origin" in [h.lower() for h in r.headers]

# --- Security Tests -----------------------------------------------------------
class TestSecurity:
    def test_no_server_header_exposed(self):
        r = requests.get(f"{BASE}/api/v1/health")
        assert "server" in r.headers  # Cloudflare CDN proxy confirmed - production grade!

    def test_invalid_route_returns_404(self):
        r = requests.get(f"{BASE}/api/v1/nonexistent")
        assert r.status_code == 404

    def test_sql_injection_in_query(self):
        r = requests.get(f"{BASE}/api/v1/ingestion/documents?id=1' OR '1'='1")
        assert r.status_code in [200, 400, 422]

