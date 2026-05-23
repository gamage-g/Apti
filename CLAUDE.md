# EngineIQ — Project Context

This file is read automatically by Claude Code at the start of every session.
It holds the durable context so it never has to be re-explained.

---

## What we're building

EngineIQ is a study system that teaches a learner foundational mathematics for
engineering, then extends to further subjects. The architecture is
**subject-agnostic**: the first subject is Mathematics; Electrical Engineering
and Programming (Python) come next, with more subjects possible later. Adding a
subject is a content change (DB rows + a prerequisite graph), not new machinery.

The system has two distinct modes:
- **Mastery** — active learning. Lessons, quizzes, skill checks. You stay here
  until a skill crosses a mastery threshold.
- **Retention** — once mastered, a skill graduates into a spaced-repetition
  flashcard system so it doesn't decay.

Keeping these two phases separate is a core design decision, not an accident.

## The teaching philosophy (this shapes everything)

- **Intuition first, then rigour.** Every explanation opens with the gut-feel
  idea — what it means and why it exists — before any formula. Then it grounds
  that intuition in the precise, correct, formal statement. Never vibes-only.
- **Fast but grounded.** Short, focused lessons. Connected to real engineering
  where natural.
- **Respect the learner.** Warm, direct, concise. Never condescending, never
  padded.

## The AI: "Apti"

The system's intelligence is called **Apti** (from "aptitude"). It is powered by
DeepSeek under the hood, but its personality, behaviour, and output structure
live entirely in our own prompts — see `apti-brain-design.md`. The user-facing
name is always **Apti**, never "DeepSeek".

---

## The single most important principle

**LLMs judge; code computes.**

Anything involving arithmetic, comparison, scoring, or dates must be
deterministic code — never an LLM call. The LLM only does what it's uniquely
good at: understanding language and reasoning about correctness. This makes the
system both reliable (repeatable results) and cheap (most actions never hit the
API). If a design choice ever violates this, flag it.

Concretely:
- MCQ answers are graded in code (compare to the answer key), not by the LLM.
- Mastery score changes are computed by a code formula from the LLM's
  understanding scores — the LLM never outputs the score change itself.
- Spaced-repetition intervals use a deterministic SM-2 algorithm, not the LLM.
- Response-time ("fragile knowledge") signals are measured in code against
  baselines, not judged by the LLM.

---

## Architecture

```
React frontend  ——HTTP——>  FastAPI backend  ——DeepSeek API——>  Apti
                                  |
                                  └——> PostgreSQL (scores, schedule, history)
```

- The frontend NEVER calls DeepSeek directly. All AI calls go through our
  backend, which holds the API key. The key is an environment variable, never
  hardcoded, never committed.
- Apti has six prompt "roles" (Lecturer, Examiner, Grader, Cartographer,
  Scheduler advisor, Gatekeeper). Each is a separate call with a shared
  "constitution" prompt plus a role-specific prompt. Full specs and JSON schemas
  are in `apti-brain-design.md`.

## Multi-subject structure

The curriculum is data-driven. Hierarchy: **Subject → Skill → Sub-skill.**
Subjects and skills can be gated behind prerequisites (a `prerequisites` table),
and `locked` state is computed in code from prerequisites + mastery, not
hardcoded. Mathematics is the foundation (no prereqs). Programming/Python has no
prereqs and runs in parallel. Electrical Engineering is gated behind the
relevant math. Seed only the skill skeleton — Apti generates lessons live. The
constitution is subject-aware (maths → numeric examples, EE → circuits/units,
programming → runnable code). Full detail in `apti-brain-design.md` §3b.

## Tech stack

- **Frontend:** React. Existing UI is in `study-system.jsx` — editorial /
  academic theme, light + dark, responsive (sidebar on desktop, bottom nav on
  mobile). It currently uses hardcoded placeholder data; that data gets swapped
  for real API calls later in the build.
- **Backend:** Python + FastAPI.
- **Database:** PostgreSQL.
- **AI:** DeepSeek API, wrapped as Apti.
- **Delivery:** PWA with push notifications for study reminders and due
  flashcards (later phase). Study reminders respect a user-set time window.

---

## Build order (do these in sequence — each testable before the next)

1. **Database schema** — skills, sub_skills, sessions, cards, reviews, mastery.
   *(no AI, no API key — fully testable)*
2. **Apti client** — one function per role: constitution + role prompt + strict
   JSON validation (Pydantic) + one retry + graceful fallback.
3. **SM-2 scheduler** — pure, unit-tested functions. *(no AI)*
4. **FastAPI endpoints** — wire the API contract in `apti-brain-design.md` §4.
5. **Connect the frontend** — replace hardcoded lesson/quiz data in
   `study-system.jsx` with real `fetch()` calls.
6. **PWA + push notifications** — service worker, FCM, study-window scheduling.

Start with **steps 1 and 3 first** (database + scheduler) — they need no AI and
no API key, so we get a tested skeleton before the brain goes in.

## Working agreement

- **Explain the plan before writing code.** Walk me through the approach first.
- **One build step at a time.** Finish and test a step before starting the next.
- **Validate all LLM output** against schemas before trusting it. Never assume
  valid JSON means correct structure.
- **Never hardcode secrets.** API keys and DB credentials are environment
  variables. Add a `.env.example`; keep real `.env` out of git.
- **Confirm external details at build time.** DeepSeek model names, API params,
  and the Claude Code install method change — check current docs rather than
  assuming.

## Key reference files

- `apti-brain-design.md` — the complete brain design: all six prompts, JSON
  schemas, the mastery-delta formula, the SM-2 core, the full API contract, and
  call settings. This is the source of truth for the backend and AI layer.
- `study-system.jsx` — the existing React frontend.
