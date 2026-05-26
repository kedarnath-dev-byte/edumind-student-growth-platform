# EduMind AI / EduMind Student Growth Platform

## Product Mission

EduMind AI is a student daily learning, revision, memory, confidence, and parent-monitoring platform for schools and colleges.

Student benefit is the first priority. Engineering principles are second priority and must support student growth.

## Core Student Loop

1. Teacher teaches a topic.
2. Student writes what the teacher taught.
3. Student writes what they understood.
4. Student honestly writes what they did not understand.
5. Student uploads a short explanation video.
6. App creates revision tasks after 24H, 7D, 1M, 3M, and 6M.
7. Student completes revisions.
8. Teacher sees support-needed topics.
9. Parent sees real progress.

## Product Philosophy

Do not create shame, fear, or unhealthy comparison.

Reward honesty, consistency, revision, improvement, and communication. Treat "I don't know yet" as courage, not failure.

Stakeholder wins:

- Student wins through awareness, memory, confidence, revision, and communication.
- Teacher wins through support-needed-topic visibility.
- Parent wins through real learning progress visibility.
- School wins through measurable student growth and parent trust.
- Society wins through self-aware, confident, honest learners.

## Technical Direction

Existing RAG, ingestion, health, and evaluation modules must be preserved.

New features should use:

- FastAPI backend
- Modular services
- SQLAlchemy
- Pydantic
- React/Vite/Tailwind frontend
- `/api/v1` prefix for new APIs

Use OOP, SOLID, and design patterns only where useful. Do not over-engineer. Simplicity is more important than academic pattern usage.

## Engineering Principles

Use OOP, SOLID, and design patterns only when they help student-benefit features stay maintainable and extensible.

### Single Responsibility Principle

- Routes handle HTTP only.
- Services handle business logic.
- Models represent data.
- Schemas validate request/response.

### Open/Closed Principle

Revision rules, reward rules, and report formats should be easy to extend without rewriting core code.

### Dependency Inversion

Business services should not depend directly on local/S3 storage details where avoidable.

## Useful Patterns

- Service Layer Pattern
- Repository Pattern only where useful
- Strategy Pattern for revision/reward rules
- Factory Pattern for creating revision schedules and reward events
- Adapter Pattern for local vs S3 video storage
- Simple event/observer-style service calls after learning log creation

## Psychological Design

The app must not create fear, shame, or fake understanding.

Reward:

- Daily learning log submission
- Honest "I don't know yet"
- Video explanation
- Revision completion
- Improvement from Hard to Medium or Medium to Easy
- Consistency streaks

Use supportive language:

- "Needs support" instead of "weak"
- "Improvement area" instead of "failure"
- "Revision pending" instead of "lazy"
- "Honest confusion" instead of "poor understanding"

## MVP Strict Boundary

Do not add these in MVP:

1. Full AI video analysis
2. Heavy gamification
3. Public shame-based leaderboard
4. Too many roles beyond STUDENT, TEACHER, PARENT, ADMIN
5. Native Android/iOS apps immediately
6. Complex payment system
7. Full LMS replacement

MVP should focus on:

1. Auth with roles
2. School/class/subject/topic setup
3. Student daily learning log
4. Local video upload with future S3-ready structure
5. Automatic revision schedule generation
6. Simple healthy reward points/badges
7. Student dashboard
8. Teacher dashboard
9. Parent/admin progress dashboard
10. AWS deployment readiness later

## Global Inspiration

Use global education ideas only as inspiration, not blind copying.

Combine:

- Finland-style emotional safety and practical skills
- Singapore-style structured improvement
- Estonia-style digital education
- Japan-style consistency and responsibility
- Indian reality of exam pressure, parent spending, tuition culture, and forgetting after exams

## Repository Safety Notes

This repository was copied from the old deployed EduMind repo. Do not touch `old-origin` or the old deployed repository.

For future work, preserve the existing backend RAG, ingestion, health, and evaluation modules unless a task explicitly asks to change them.
