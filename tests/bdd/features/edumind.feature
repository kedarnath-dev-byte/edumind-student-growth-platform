Feature: EduMind AI Platform
  As a student
  I want to use EduMind AI
  So that I can study smarter with AI assistance

  Background:
    Given the EduMind AI backend is running at "https://edumind-ai-ff.onrender.com"

  Scenario: Backend health check passes
    When I call the health endpoint
    Then the response status should be 200
    And the response should contain "healthy"

  Scenario: Root endpoint returns app info
    When I call the root endpoint
    Then the response should contain "EduMind AI"

  Scenario: Student uploads a TXT document
    Given I have a text file with content "RAG stands for Retrieval Augmented Generation"
    When I upload the file to the ingestion endpoint
    Then the response status should be 200
    And the upload should be successful

  Scenario: Student views uploaded documents
    When I request the documents list
    Then the response status should be 200
    And the response should be a valid list

  Scenario: Upload fails without a file
    When I call the upload endpoint without a file
    Then the response status should be 422

  Scenario: Admin dashboard is accessible
    When I call the admin dashboard endpoint
    Then the response status should be 200

  Scenario: System health metrics are available
    When I call the system health metrics endpoint
    Then the response status should be 200

  Scenario: Invalid endpoint returns 404
    When I call a non-existent endpoint
    Then the response status should be 404

  Scenario: CORS is enabled for Vercel frontend
    Given the request origin is "https://edumind-ai-two.vercel.app"
    When I call the health endpoint
    Then the response status should be 200