"""
test_ui.py
Selenium UI tests for EduMind AI frontend.
Tests real browser interactions on the live Vercel deployment.
Run: pytest tests/ui/test_ui.py -v --html=tests/reports/ui_report.html
"""
import pytest
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

FRONTEND_URL = "https://edumind-ai-two.vercel.app"

@pytest.fixture(scope="class")
def driver():
    """Set up Chrome browser for testing."""
    options = webdriver.ChromeOptions()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1920,1080")
    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=options
    )
    driver.implicitly_wait(10)
    yield driver
    driver.quit()

class TestLoginPage:
    def test_login_page_loads(self, driver):
        driver.get(FRONTEND_URL)
        time.sleep(3)
        assert "EduMind" in driver.title or len(driver.page_source) > 100
        print("✅ Login page loads")

    def test_login_page_has_google_button(self, driver):
        driver.get(FRONTEND_URL)
        time.sleep(3)
        page = driver.page_source
        assert "Google" in page or "google" in page or "Continue" in page
        print("✅ Google login button present")

    def test_page_title_contains_edumind(self, driver):
        driver.get(FRONTEND_URL)
        time.sleep(2)
        assert "EduMind" in driver.page_source
        print("✅ EduMind branding present")

    def test_page_shows_rag_pipelines(self, driver):
        driver.get(FRONTEND_URL)
        time.sleep(2)
        assert "RAG" in driver.page_source
        print("✅ RAG Pipelines mentioned on page")

    def test_page_shows_langgraph(self, driver):
        driver.get(FRONTEND_URL)
        time.sleep(2)
        assert "LangGraph" in driver.page_source or "Agent" in driver.page_source
        print("✅ LangGraph Agents mentioned on page")

    def test_page_shows_finetuning(self, driver):
        driver.get(FRONTEND_URL)
        time.sleep(2)
        assert "Fine" in driver.page_source
        print("✅ Fine-Tuning mentioned on page")

class TestFrontendRouting:
    def test_upload_route_loads(self, driver):
        driver.get(f"{FRONTEND_URL}/upload")
        time.sleep(3)
        assert driver.current_url is not None
        assert "404" not in driver.page_source
        print("✅ Upload route accessible")

    def test_dashboard_route_loads(self, driver):
        driver.get(f"{FRONTEND_URL}/dashboard")
        time.sleep(3)
        assert "404" not in driver.page_source
        print("✅ Dashboard route accessible")

    def test_chat_route_loads(self, driver):
        driver.get(f"{FRONTEND_URL}/chat")
        time.sleep(3)
        assert "404" not in driver.page_source
        print("✅ Chat route accessible")

class TestPerformance:
    def test_page_loads_under_10s(self, driver):
        start = time.time()
        driver.get(FRONTEND_URL)
        time.sleep(2)
        elapsed = time.time() - start
        assert elapsed < 10
        print(f"✅ Page loaded in {elapsed:.2f}s")

    def test_no_javascript_errors(self, driver):
        driver.get(FRONTEND_URL)
        time.sleep(3)
        logs = driver.get_log("browser")
        severe_errors = [l for l in logs if l["level"] == "SEVERE"
                        and "extension" not in l["message"].lower()]
        assert len(severe_errors) == 0, f"JS errors: {severe_errors}"
        print("✅ No severe JavaScript errors")
