"""
steps/edumind_steps.py
BDD Step definitions for EduMind AI feature tests.
Maps Gherkin plain-English steps to Python test code.
"""
from behave import given, when, then
import requests

BASE_URL = ""

@given('the EduMind AI backend is running at "{url}"')
def step_set_base_url(context, url):
    context.base_url = url
    context.headers = {}

@given('I have a text file with content "{content}"')
def step_create_file(context, content):
    context.file_content = content.encode()
    context.file_name = "test_bdd.txt"

@given('the request origin is "{origin}"')
def step_set_origin(context, origin):
    context.headers = {"Origin": origin}

@when('I call the health endpoint')
def step_call_health(context):
    context.response = requests.get(
        f"{context.base_url}/api/v1/health",
        headers=getattr(context, 'headers', {})
    )

@when('I visit the docs endpoint')
def step_visit_docs(context):
    context.response = requests.get(f"{context.base_url}/docs")

@when('I call the root endpoint')
def step_call_root(context):
    context.response = requests.get(f"{context.base_url}/")

@when('I upload the file to the ingestion endpoint')
def step_upload_file(context):
    files = {"file": (context.file_name, context.file_content, "text/plain")}
    context.response = requests.post(
        f"{context.base_url}/api/v1/ingestion/upload",
        files=files
    )

@when('I request the documents list')
def step_get_documents(context):
    context.response = requests.get(
        f"{context.base_url}/api/v1/ingestion/documents"
    )

@when('I call the upload endpoint without a file')
def step_upload_no_file(context):
    context.response = requests.post(
        f"{context.base_url}/api/v1/ingestion/upload"
    )

@when('I call the admin dashboard endpoint')
def step_admin_dashboard(context):
    context.response = requests.get(
        f"{context.base_url}/api/v1/evaluation/admin/dashboard"
    )

@when('I call the system health metrics endpoint')
def step_system_health(context):
    context.response = requests.get(
        f"{context.base_url}/api/v1/evaluation/metrics/health"
    )

@when('I call a non-existent endpoint')
def step_nonexistent(context):
    context.response = requests.get(
        f"{context.base_url}/api/v1/nonexistent_route_xyz"
    )

@then('the response status should be {status:d}')
def step_check_status(context, status):
    assert context.response.status_code == status, \
        f"Expected {status}, got {context.response.status_code}: {context.response.text}"

@then('the response should contain "{text}"')
def step_check_contains(context, text):
    assert text in context.response.text, \
        f"'{text}' not found in response: {context.response.text}"

@then('the upload should be successful')
def step_upload_success(context):
    data = context.response.json()
    assert data.get("success") == True, f"Upload failed: {data}"

@then('the response should be a valid list')
def step_valid_list(context):
    data = context.response.json()
    assert isinstance(data, list), f"Expected list, got: {type(data)}"
