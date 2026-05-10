"""
locustfile.py
Performance/Load tests for EduMind AI backend.
Simulates multiple concurrent students using the platform.
Run: locust -f tests/performance/locustfile.py --host=https://edumind-ai-ff.onrender.com
"""
from locust import HttpUser, task, between

class StudentUser(HttpUser):
    """Simulates a real student using EduMind AI."""
    wait_time = between(1, 3)  # Wait 1-3 seconds between requests

    @task(3)
    def check_health(self):
        """Most common action - health check."""
        with self.client.get("/api/v1/health", catch_response=True) as r:
            if r.status_code == 200:
                r.success()
            else:
                r.failure(f"Health check failed: {r.status_code}")

    @task(2)
    def get_documents(self):
        """Student views their documents."""
        with self.client.get("/api/v1/ingestion/documents", catch_response=True) as r:
            if r.status_code == 200:
                r.success()
            else:
                r.failure(f"Documents failed: {r.status_code}")

    @task(1)
    def upload_document(self):
        """Student uploads a study material."""
        content = b"Artificial Intelligence test document for load testing."
        files = {"file": ("load_test.txt", content, "text/plain")}
        with self.client.post(
            "/api/v1/ingestion/upload",
            files=files,
            catch_response=True
        ) as r:
            if r.status_code == 200:
                r.success()
            else:
                r.failure(f"Upload failed: {r.status_code}")

    @task(1)
    def check_system_health(self):
        """Admin monitors system health."""
        with self.client.get(
            "/api/v1/evaluation/metrics/health",
            catch_response=True
        ) as r:
            if r.status_code == 200:
                r.success()
            else:
                r.failure(f"System health failed: {r.status_code}")

    @task(1)
    def check_admin_dashboard(self):
        """Admin views dashboard."""
        with self.client.get(
            "/api/v1/evaluation/admin/dashboard",
            catch_response=True
        ) as r:
            if r.status_code == 200:
                r.success()
            else:
                r.failure(f"Dashboard failed: {r.status_code}")


class AdminUser(HttpUser):
    """Simulates an admin monitoring the platform."""
    wait_time = between(2, 5)

    @task
    def monitor_dashboard(self):
        self.client.get("/api/v1/evaluation/admin/dashboard")

    @task
    def check_metrics(self):
        self.client.get("/api/v1/evaluation/metrics/health")
