# 🧠 EduMind AI — Project Context

> **⚠️ DO NOT EDIT MANUALLY** — This file is auto-updated by Claude at the end of every chat session.
> Upload this file at the start of every new chat to instantly resume work.

---

## 📅 Session Metadata

- **Last Updated:** 2026-05-02
- **Current Chat Session:** #1
- **Total Time Spent:** 0 hours
- **Active Skills:** `expert-dev-guide`, `edumind-context-continuity`

---

## 👤 Project Owner

- **Name:** Kedarnath
- **GitHub:** [kedarnath-dev-byte](https://github.com/kedarnath-dev-byte)
- **Goal:** Crack ₹2 Crore AI Engineer job
- **Domain:** Education (EdTech)
- **Timeline:** 6–8 weeks part-time

---

## 🎯 Project Mission

Build **EduMind AI** — a complete RAG + LangGraph + Fine-Tuning education platform that demonstrates:
- ✅ ALL 16 RAG types
- ✅ ALL 8 fine-tuning frameworks
- ✅ ALL 5 model serving engines
- ✅ ALL 7 LangGraph patterns
- ✅ Complete LangChain ecosystem
- ✅ Web + Android + iOS deployment
- ✅ ₹0 budget (all free tier)

---

## 🔒 LOCKED DECISIONS — DO NOT CHANGE OR RE-ASK

### Architecture
- **Pattern:** Modular Monolith (microservices-ready)
- **Backend:** Python 3.10+ with FastAPI
- **Frontend Web:** React + Vite + TailwindCSS
- **Mobile:** Flutter (single codebase → Android + iOS)
- **Desktop:** Electron (Windows .exe)
- **Database:** SQLite (dev) → PostgreSQL (prod)
- **Vector DB:** ChromaDB (free, local)
- **LLM Provider:** Groq API (Llama-3, free tier)
- **Embeddings:** HuggingFace sentence-transformers
- **Backend Deploy:** Render free tier
- **Frontend Deploy:** Vercel free tier
- **CI/CD:** GitHub Actions
- **Total Cost:** ₹0

### Coding Standards
- **Commits:** Conventional Commits (4–5 per feature)
- **File headers:** Mandatory docstring on every file
- **Pattern:** Repository → Service → Controller
- **Config:** All values in `.env` (no hardcoding)
- **Errors:** Try/catch on every async function
- **API:** Versioned `/api/v1/` from day one
- **Principles:** SOLID + DRY + Strategy Pattern

### Future Plugin Folders (Empty NOW, Built LATER)
| Folder | Purpose | When |
|---|---|---|
| `/plugins/memory_personalization/` | Per-doc memory by subject/age/capability | After job |
| `/plugins/curiosity_engine/` | Netflix-hook psychology | After job |
| `/plugins/interactive_branching/` | Bandersnatch-style learning | After job |
| `/plugins/void_video_engine/` | VOID physics video generation | After job |

---

## 📊 BUILD ROADMAP

| # | Feature | Status | Steps | Commits |
|---|---|---|---|---|
| 1 | Project Setup & Structure | 🔄 In Progress | 0 / 8 | 0 / 5 |
| 2 | Document Ingestion Engine | ⏳ Pending | 0 / 12 | 0 / 5 |
| 3 | All 16 RAG Pipelines | ⏳ Pending | 0 / 32 | 0 / 5 |
| 4 | LangGraph Multi-Agent (7 patterns) | ⏳ Pending | 0 / 14 | 0 / 5 |
| 5 | Fine-Tuning Pipeline (8 frameworks) | ⏳ Pending | 0 / 16 | 0 / 5 |
| 6 | Serving Engines (5 servers) | ⏳ Pending | 0 / 10 | 0 / 5 |
| 7 | React Frontend Dashboard | ⏳ Pending | 0 / 20 | 0 / 5 |
| 8 | Evaluation & Monitoring | ⏳ Pending | 0 / 8 | 0 / 5 |
| 9 | Deployment (Live URL) | ⏳ Pending | 0 / 10 | 0 / 5 |
| 10 | Flutter Mobile App | ⏳ Pending | 0 / 15 | 0 / 5 |
| 11 | Electron Desktop App | ⏳ Pending | 0 / 8 | 0 / 5 |
| 12 | README + Architecture Docs | ⏳ Pending | 0 / 5 | 0 / 3 |

**Overall Progress:** 0% Complete

---

## 🎯 CURRENT POSITION

### ✅ Last Completed Step
- **Feature:** None yet
- **Step:** Project planning complete
- **Description:** Architecture locked, all 16 RAG types confirmed, future plugins designed
- **Date:** 2026-05-02

### 🔄 Currently Working On
- **Feature:** 1 — Project Setup & Structure
- **Step:** 1 of 8 — Check Python Version
- **Description:** Verify Python 3.10+ is installed
- **Blocker:** None

### ⏭️ Next Step
- Run `python --version` in VS Code terminal
- Confirm version is 3.10+
- Proceed to Step 2 (create project folder)

---

## 📝 RECENT GIT COMMITS

```bash
# No commits yet — about to start Feature 1
```

---

## 🗂️ FILES CREATED SO FAR

```
None yet — project not started
```

---

## 💡 KEY DESIGN DECISIONS (For Interview)

### Q: Why Modular Monolith over Microservices?
**A:** Start simple, ship fast, but every module is structured to become its own microservice later. Zero rewrite needed when scaling.

### Q: Why Strategy Pattern for RAG types?
**A:** Adding a new RAG type = creating one new file inheriting `BaseRAG`. Zero changes to existing code. Open/Closed Principle in action.

### Q: Why Plugin Architecture for future features?
**A:** Memory, curiosity, branching, VOID engines can be added without touching core. They register themselves via `plugins_registry.py`.

### Q: Why ₹0 budget tools?
**A:** Demonstrates resource optimization (key skill). Groq free tier handles 14k req/day — more than enough for portfolio demo.

### Q: Why Flutter for mobile?
**A:** Single codebase compiles to Android + iOS. 50% time savings. Consistent UX across platforms.

---

## 🐛 KNOWN ISSUES / TODOS

- [ ] No issues yet — fresh start

---

## 🎤 INTERVIEW PREPARATION

### 30-Second Project Pitch
> "I built EduMind AI — a complete enterprise-grade AI learning platform that demonstrates 16 RAG types, 8 fine-tuning frameworks, 5 serving engines, and 7 LangGraph multi-agent patterns. It's deployed as web, Android, and iOS apps. The architecture uses modular monolith with plugin extensibility, so new features like personalized memory, curiosity engines, and physics-aware video generation slot in without rewrites. I'd love to walk you through a live demo."

### Skills Demonstrated
- **RAG Types (16):** Standard, Agentic, Graph, Modular, Memory-Augmented, Multi-Modal, Federated, Streaming, ODQA, Contextual, Knowledge-Enhanced, Domain-Specific, Hybrid, Self-RAG, HyDE, Recursive
- **Fine-Tuning (8):** HuggingFace PEFT, Unsloth, LLaMA Factory, Axolotl, DeepSpeed, Colossal-AI, QLoRA, RLHF/DPO
- **Serving (5):** vLLM, OpenLLM, FastChat, LightLLM, SkyPilot
- **LangGraph (7):** Stateful, Multi-Agent, Parallel, Human-in-Loop, Conditional, Cyclic, Self-Correction
- **LangChain:** Loaders, Splitters, Embeddings, Vector Stores, Retrievers, Memory, Prompts, Output Parsers, Tools, Chains
- **MLOps:** RAGAS evals, LangSmith monitoring, Docker, GitHub Actions CI/CD

---

## 🔮 FUTURE VISION (For "Where Do You See This Going?" Question)

### Future-1: Per-Document Memory Personalization
Each PDF gets its own memory profile — subject-wise, age-wise, capability-wise. Like a teacher who remembers HOW each student learns each subject differently.

### Future-2: Curiosity Engine (Netflix-Hook Psychology)
Apply the same dopamine mechanics that make people addicted to web series and TV serials. Cliffhangers at end of each lesson, plot twists in concepts, social discussion loops between students. The "village TV serial gathering" psychology applied to learning.

### Future-3: Bandersnatch-Style Branching
Choose-your-path concept videos. Student clicks "Apply Newton's 1st Law" vs "3rd Law" — story branches, teaches concept from different angles. Wrong choice = funny consequence = unforgettable learning.

### Future-4: VOID-Style Interactive Physics Videos
Student watches concept video → clicks "What if we remove gravity?" → video regenerates in real-time with physics-accurate result. Concepts become EXPERIENCED, not just read. Based on Genie 3 / VOID research from late 2025.

---

## 📞 CHAT SESSION HISTORY

### Session #1 — 2026-05-02 (Current)
- **Started:** Project ideation
- **Discussed:**
  - Salary research (₹40 LPA → ₹2 Cr roadmap)
  - 3 project options reviewed → Education domain selected
  - Architecture locked (modular monolith)
  - All 16 RAG types confirmed for present build
  - All 8 fine-tuning frameworks confirmed
  - Future plugins designed (memory, curiosity, branching, VOID)
  - UX prototype previewed
  - Context continuity skill created
- **Status:** Ready to start Feature 1, Step 1
- **Files created:** PROJECT_CONTEXT.md (this file)
- **Commits made:** 0

### Session #2 — [Pending]
- *Will be filled at end of next session*

---

## 🚀 HOW TO RESUME IN NEXT CHAT

When you open a new chat with Claude:

1. **Upload this file** (`PROJECT_CONTEXT.md`) at the start
2. **Type:** "Let's continue EduMind"
3. Claude will instantly:
   - Read this file
   - Restore all locked decisions
   - Show you exactly where you stopped
   - Give you the very next step

**No re-explanation. No re-questioning. Pure continuation.**

---

## 📋 END-OF-SESSION CHECKLIST

Before closing any chat, verify Claude has:

- [ ] Updated "Last Completed Step"
- [ ] Updated "Currently Working On"
- [ ] Updated "Next Step"
- [ ] Added new entry to Chat Session History
- [ ] Listed all files created this session
- [ ] Listed all commits made this session
- [ ] Updated roadmap progress percentages
- [ ] Generated this file via `create_file` tool
- [ ] Reminded you to commit it: `git add PROJECT_CONTEXT.md && git commit -m "docs(context): update for session [N]"`

---

> **🤖 This file is the brain of your project across all chat sessions.**
> **Treat it as the most important file in your repo.**
> **Always commit it after every chat.**
