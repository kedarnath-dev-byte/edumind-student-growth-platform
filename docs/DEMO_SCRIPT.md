# EduMind Student Growth Platform Demo Script

This script is for demoing the EduMind Student Growth Platform MVP foundation to
a school principal, teacher, parent, mentor, investor, or recruiter.

EduMind is still an MVP foundation. The goal of the demo is to show the learning
loop clearly, not to claim the full product is finished.

## 1. One-Line Pitch

EduMind helps students build successful learning habits by connecting daily
learning, spaced revision, honest reflection, and peer support.

## 2. Problem Statement

Students often forget what they learn after class or after exams. They may also
hesitate to say what they did not understand, because confusion can feel unsafe
or embarrassing.

Parents and teachers usually see marks, attendance, or homework, but they do not
always see the daily learning process: what was taught, what the student
understood, what still needs support, and whether revision happened at the right
time.

Revision is often left to memory, pressure, or last-minute exam preparation.
Many apps also create competition, but students need mutual support too. EduMind
is built around the idea that there are no permanently successful people. There
are only successful habits.

## 3. EduMind Solution

The current MVP foundation shows how EduMind can build successful habits through:

- Daily Learning Log
- 24H, 7D, 1M, 3M, and 6M revision schedule
- Today's Revision Mission
- Memory Rescue for missed revisions
- Revision proof text
- Successful Habits dashboard
- Peer Learning Circle
- Teacher Dashboard
- Parent Dashboard
- Demo seed data endpoint for local demos

The app avoids labels like weak, failure, topper, or ranker. It focuses on
learning behavior: reflection, revision, honesty, explanation, and helping.

## 4. Demo Preparation

Start the backend with the project virtual environment Python 3.11.

Backend CMD:

```cmd
cd C:\Users\mkeda\edumind-ai-\backend
C:\Users\mkeda\edumind-ai-\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Open Swagger:

```text
http://127.0.0.1:8000/docs
```

Run:

```text
POST /api/v1/dev/seed-demo-data
```

Start the frontend.

Frontend CMD:

```cmd
cd C:\Users\mkeda\edumind-ai-\frontend
set VITE_API_BASE_URL=http://127.0.0.1:8000
npm run dev
```

Open:

```text
/student-dashboard
```

## 5. Demo Flow

### A. Open Student Dashboard

Show the central dashboard first.

Point out:

- The four action cards
- Habit snapshot
- Revision snapshot
- Peer learning snapshot

Say:

"This is the student's home. It answers: what should I do today, do I need to
revise, how are my habits growing, and can I ask or help someone?"

### B. Daily Learning Log

Open Daily Learning Log.

Show that the student can write:

- What the teacher taught
- What they understood
- What they need support with

Say:

"This builds self-awareness and honesty. The student is not punished for saying
I need support. That answer helps the system and teacher understand where help
is needed."

### C. Today's Revision

Open Today's Revision.

Show:

- Memory Rescue
- Today's Revision Mission
- Future Locked Revisions
- Revision proof text

Say:

"Revision is scheduled after 24H, 7D, 1M, 3M, and 6M. Future revisions are locked
to protect spaced repetition. Students complete revision with text proof, so
revision becomes visible learning evidence."

### D. Successful Habits

Open Successful Habits.

Show:

- Daily Learning Habit
- Honest Reflection Habit
- Revision Completion Habit
- Memory Rescue Habit

Say:

"The app does not label students as weak or topper. It shows successful habits.
The focus is honesty, consistency, revision, and improvement."

### E. Peer Learning Circle

Open Peer Learning Circle.

Show:

- Ask for Support
- Offer Help
- Topic Support Circle
- Accept help
- Complete help session

Say:

"If one student understands, they can help another student. Helping strengthens
the helper's own learning too. There is no public ranking or competition here."

### F. Teacher Dashboard

Open Teacher Dashboard.

Show:

- Topics needing support
- Students to support
- Revision health
- Peer learning activity
- Suggested teacher actions

Say:

"This gives the teacher class-level support signals. It does not rank students.
It shows where support, review, Memory Rescue, or peer explanation may help."

### G. Parent Dashboard

Open Parent Dashboard.

Show:

- Latest learning logs
- Revision summary
- Successful habits
- Topics to support
- Parent support suggestions

Say:

"This helps parents see the learning process without marks pressure. The parent
can ask better questions and support revision without scolding."

## 6. What To Say To Principal

"Sir/Madam, this is not just an LMS. LMS stores content. EduMind tracks whether
the student understood, what they did not understand, whether they revised at the
right time, and whether students help each other learn.

This is an MVP foundation, but it already shows the core habit loop: daily
reflection, spaced revision, memory rescue, revision proof, and peer support."

## 7. What To Say To Teacher

"For teachers, EduMind now has a frontend MVP dashboard showing topics needing
support, students to support, revision health, peer learning activity, and
suggested teacher actions. The aim is not to increase teacher workload, but to
make hidden learning problems visible earlier."

## 8. What To Say To Parent

"For parents, EduMind now has a frontend MVP dashboard showing what the child
learned, what the child understood, what still needs support, revision
discipline, successful habits, and support suggestions. Instead of only seeing
marks, parents can see the learning process."

## 9. What To Say To Investor Or Mentor

"The MVP proves four important loops:

- Learning reflection loop
- Revision scheduling loop
- Habit measurement loop
- Peer help loop
- Teacher support visibility loop
- Parent learning visibility loop

Future monetization can come from school SaaS, coaching centers, tuition
centers, parent progress reports, and teacher support analytics. The early wedge
is daily student learning visibility plus revision discipline."

## 10. What Is Already Built

- Student Dashboard default entry
- Daily Learning Log frontend and backend
- School, classroom, subject, and topic setup APIs
- Revision task generation
- Revision dashboard
- Revision proof text
- RevisionAttempt history
- Future revision backend lock
- Demo seed data endpoint
- Successful Habits backend and frontend
- Peer Learning Circle backend and frontend
- Teacher Dashboard backend and frontend
- Parent Dashboard backend and frontend
- Local development docs

The Student, Teacher, and Parent visible triangle is now complete for MVP demo:
students record and revise learning, teachers see support signals, and parents
see growth signals without marks pressure.

## 11. What Is Not Built Yet

- Auth/login
- Real student profiles
- Video upload
- Notifications
- Production deployment
- Advanced analytics
- Mobile app

## 12. Roadmap

Phase 1: Stabilize MVP and demo.

Phase 2: Improve teacher dashboard with filters, names, and classroom workflows.

Phase 3: Improve parent dashboard with real parent-child mapping.

Phase 4: Video proof upload.

Phase 5: Notifications and reminders.

Phase 6: School pilot.

## 13. Demo Closing Line

EduMind is designed to move students from marks pressure to successful habits:
learn honestly, revise scientifically, explain clearly, and help each other
grow.
