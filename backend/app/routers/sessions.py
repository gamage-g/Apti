"""
Session endpoints: start lesson → generate quiz → submit answers.
"""

import json
import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ValidationError

from app.db.connection import get_pool
from app.apti import client as apti
from app.apti.schemas import StagedLesson, Quiz, GradeResponse, CartographerResponse, GatekeeperResponse
from app.scheduler.sm2 import mastery_delta, GradedOpen, GradedMCQ

router = APIRouter(prefix="/api/session", tags=["session"])


# ─── Pydantic schemas ─────────────────────────────────────────────────────────

class StartRequest(BaseModel):
    skill_id: str
    sub_skill_id: int | None = None
    topic: str

class AnswerSubmission(BaseModel):
    question_id: str
    value: str              # selected index as string (MCQ) or free text (open)
    response_time_ms: int | None = None

class SubmitRequest(BaseModel):
    session_id: str
    answers: list[AnswerSubmission]
    practice_outcome: Literal["unaided", "hint_used", "solution_revealed"] = "unaided"


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def _get_recent_struggles(pool, skill_id: str) -> list[str]:
    """Return sub-skill labels where mastery score is below 60."""
    rows = await pool.fetch(
        """
        SELECT ss.label FROM sub_skills ss
        JOIN mastery m ON m.sub_skill_id = ss.id
        WHERE ss.skill_id = $1 AND m.score < 60
        ORDER BY m.score ASC LIMIT 5
        """,
        skill_id,
    )
    return [r["label"] for r in rows]


async def _get_recent_question_prompts(pool, skill_id: str, limit: int = 20) -> list[str]:
    """Return recent question prompts to pass to the Examiner so it avoids repeats."""
    rows = await pool.fetch(
        """
        SELECT sq.prompt
        FROM session_questions sq
        JOIN sessions s ON s.id = sq.session_id
        WHERE s.skill_id = $1
        ORDER BY s.started_at DESC LIMIT $2
        """,
        skill_id, limit,
    )
    return [r["prompt"] for r in rows]


async def _get_mastery_score(pool, skill_id: str) -> int:
    row = await pool.fetchrow(
        "SELECT score FROM mastery WHERE skill_id = $1 AND sub_skill_id IS NULL",
        skill_id,
    )
    return row["score"] if row else 0


async def _update_mastery(pool, skill_id: str, delta: int) -> int:
    # PostgreSQL UNIQUE treats NULL != NULL, so ON CONFLICT doesn't fire for
    # sub_skill_id IS NULL rows.  Use UPDATE first; INSERT only as a fallback.
    row = await pool.fetchrow(
        """
        UPDATE mastery
           SET score      = GREATEST(0, LEAST(100, score + $1)),
               updated_at = NOW()
         WHERE skill_id = $2 AND sub_skill_id IS NULL
        RETURNING score
        """,
        delta, skill_id,
    )
    if row is None:
        row = await pool.fetchrow(
            """
            INSERT INTO mastery (skill_id, sub_skill_id, score)
            VALUES ($1, NULL, GREATEST(0, LEAST(100, $2)))
            RETURNING score
            """,
            skill_id, delta,
        )
    return row["score"]


def _learner_level(mastery: int) -> str:
    if mastery >= 70:
        return "advanced"
    if mastery >= 40:
        return "intermediate"
    return "foundational"


async def _get_response_time_baseline(pool, skill_id: str) -> int:
    """Median response time (ms) across all prior completed sessions for this skill."""
    rows = await pool.fetch(
        """
        SELECT sa.response_time_ms
        FROM session_answers sa
        JOIN sessions s ON s.id = sa.session_id
        WHERE s.skill_id = $1 AND sa.response_time_ms IS NOT NULL
          AND s.completed_at IS NOT NULL
        ORDER BY s.started_at DESC LIMIT 100
        """,
        skill_id,
    )
    times = sorted(r["response_time_ms"] for r in rows)
    if not times:
        return 0
    return times[len(times) // 2]


async def _get_completed_session_count(pool, skill_id: str) -> int:
    row = await pool.fetchrow(
        "SELECT COUNT(*) AS n FROM sessions WHERE skill_id = $1 AND completed_at IS NOT NULL",
        skill_id,
    )
    return int(row["n"]) if row else 0


async def _get_learner_notes(pool, skill_id: str) -> str:
    row = await pool.fetchrow(
        "SELECT content FROM skill_notes WHERE skill_id = $1", skill_id
    )
    return row["content"] if row else ""


# ─── POST /api/session/start ──────────────────────────────────────────────────

@router.post("/start")
async def start_session(body: StartRequest):
    pool = get_pool()

    # Verify skill exists and is unlocked (locked computed from prerequisites + mastery)
    skill = await pool.fetchrow("""
        SELECT s.id, s.label, s.subject_id,
        (
            EXISTS (
                SELECT 1 FROM prerequisites p
                LEFT JOIN mastery m ON m.skill_id = p.required_skill_id AND m.sub_skill_id IS NULL
                WHERE p.gated_skill_id = s.id AND COALESCE(m.score, 0) < p.mastery_threshold
            )
            OR EXISTS (
                SELECT 1 FROM prerequisites p
                LEFT JOIN mastery m ON m.skill_id = p.required_skill_id AND m.sub_skill_id IS NULL
                WHERE p.gated_subject_id = s.subject_id AND COALESCE(m.score, 0) < p.mastery_threshold
            )
        ) AS locked
        FROM skills s WHERE s.id = $1
    """, body.skill_id)
    if not skill:
        raise HTTPException(404, f"Skill '{body.skill_id}' not found")
    if skill["locked"]:
        raise HTTPException(403, f"Skill '{body.skill_id}' is locked")

    subject_id = skill["subject_id"] or "mathematics"

    # Gather context for the Lecturer
    unlocked = await pool.fetch("""
        SELECT s.id FROM skills s
        WHERE NOT (
            EXISTS (
                SELECT 1 FROM prerequisites p
                LEFT JOIN mastery m ON m.skill_id = p.required_skill_id AND m.sub_skill_id IS NULL
                WHERE p.gated_skill_id = s.id AND COALESCE(m.score, 0) < p.mastery_threshold
            )
            OR EXISTS (
                SELECT 1 FROM prerequisites p
                LEFT JOIN mastery m ON m.skill_id = p.required_skill_id AND m.sub_skill_id IS NULL
                WHERE p.gated_subject_id = s.subject_id AND COALESCE(m.score, 0) < p.mastery_threshold
            )
        )
    """)
    unlocked_ids = [r["id"] for r in unlocked]
    recent_struggles = await _get_recent_struggles(pool, body.skill_id)
    current_mastery  = await _get_mastery_score(pool, body.skill_id)
    learner_notes    = await _get_learner_notes(pool, body.skill_id)

    # Call Apti Lecturer
    try:
        lesson = await apti.generate_lesson(
            topic=body.topic,
            skill=skill["label"],
            learner_level=_learner_level(current_mastery),
            unlocked_skills=unlocked_ids,
            recent_struggles=recent_struggles,
            subject_id=subject_id,
            learner_notes=learner_notes,
        )
    except Exception as e:
        raise HTTPException(502, f"AI service error: {e}")

    # Validate against the staged lesson schema
    try:
        StagedLesson.model_validate(lesson)
    except ValidationError as e:
        raise HTTPException(502, f"Lesson schema mismatch: {e}")

    # Persist session
    session_id = str(uuid.uuid4())
    await pool.execute(
        """
        INSERT INTO sessions (id, skill_id, sub_skill_id, topic, lesson_json)
        VALUES ($1, $2, $3, $4, $5::jsonb)
        """,
        session_id, body.skill_id, body.sub_skill_id,
        body.topic, json.dumps(lesson),
    )

    return {"session_id": session_id, "lesson": lesson}


# ─── POST /api/session/quiz ───────────────────────────────────────────────────

class QuizRequest(BaseModel):
    session_id: str


@router.post("/quiz")
async def generate_quiz(body: QuizRequest):
    session_id: str = body.session_id
    pool = get_pool()

    session = await pool.fetchrow(
        "SELECT sess.skill_id, sess.topic, sess.lesson_json, sk.subject_id"
        " FROM sessions sess JOIN skills sk ON sk.id = sess.skill_id"
        " WHERE sess.id = $1",
        session_id,
    )
    if not session:
        raise HTTPException(404, "Session not found")

    recent_prompts = await _get_recent_question_prompts(pool, session["skill_id"])
    learner_notes  = await _get_learner_notes(pool, session["skill_id"])

    try:
        quiz = await apti.generate_quiz(
            topic=session["topic"],
            lesson=session["lesson_json"],
            recent_question_prompts=recent_prompts,
            subject_id=session["subject_id"] or "mathematics",
            learner_notes=learner_notes,
        )
    except Exception as e:
        raise HTTPException(502, f"AI service error: {e}")

    try:
        Quiz.model_validate(quiz)
    except ValidationError as e:
        raise HTTPException(502, f"Quiz schema mismatch: {e}")

    # Each quiz attempt gets its own 8-char UUID prefix so re-quizzing the same
    # session never collides with previously stored questions in session_questions.
    # DeepSeek reuses short IDs like "q1"–"q4" across calls; without a fresh
    # prefix, ON CONFLICT would silently keep old rows and the grader would use
    # stale correct_index / model_answer values.
    attempt_prefix = str(uuid.uuid4())[:8]
    questions_out = []
    for q in quiz.get("questions", []):
        stable_id = f"{session_id}:{attempt_prefix}:{q['id']}"
        await pool.execute(
            """
            INSERT INTO session_questions
              (id, session_id, layer, type, prompt, options, correct_index, model_answer, explanation)
            VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9)
            ON CONFLICT (id) DO NOTHING
            """,
            stable_id, session_id, q["layer"], q["type"],
            q["prompt"], json.dumps(q["options"]) if q.get("options") else None,
            q.get("correct_index"), q.get("model_answer"), q["explanation"],
        )
        questions_out.append({**q, "id": stable_id})

    return {"questions": questions_out}


# ─── POST /api/session/submit ─────────────────────────────────────────────────

@router.post("/submit")
async def submit_session(body: SubmitRequest):
    pool = get_pool()

    session = await pool.fetchrow(
        "SELECT sess.skill_id, sk.subject_id"
        " FROM sessions sess JOIN skills sk ON sk.id = sess.skill_id"
        " WHERE sess.id = $1",
        body.session_id,
    )
    if not session:
        raise HTTPException(404, "Session not found")

    skill_id   = session["skill_id"]
    subject_id = session["subject_id"] or "mathematics"

    # Load questions to know which are MCQ vs open
    q_rows = await pool.fetch(
        "SELECT id, type, correct_index, prompt, model_answer FROM session_questions WHERE session_id = $1",
        body.session_id,
    )
    questions = {r["id"]: dict(r) for r in q_rows}

    mcq_results: list[GradedMCQ] = []
    open_pairs = []
    response_times: list[int] = []

    for ans in body.answers:
        q = questions.get(ans.question_id)
        if not q:
            continue
        if ans.response_time_ms is not None:
            response_times.append(ans.response_time_ms)

        if q["type"] == "mcq":
            correct = str(q["correct_index"]) == ans.value
            mcq_results.append({"question_id": ans.question_id, "correct": correct})
            await pool.execute(
                """
                INSERT INTO session_answers (session_id, question_id, value, response_time_ms, is_correct)
                VALUES ($1,$2,$3,$4,$5)
                """,
                body.session_id, ans.question_id, ans.value, ans.response_time_ms, correct,
            )
        else:  # open
            open_pairs.append({
                "question_id": ans.question_id,
                "prompt": q["prompt"],
                "model_answer": q.get("model_answer", ""),
                "answer": ans.value,
            })

    # Grade open answers via LLM
    open_results: list[GradedOpen] = []
    if open_pairs:
        graded = await apti.grade_open_answers(open_pairs, subject_id=subject_id)
        try:
            GradeResponse.model_validate(graded)
        except ValidationError as e:
            raise HTTPException(502, f"Grade schema mismatch: {e}")
        open_results = graded.get("results", [])
        for r in open_results:
            await pool.execute(
                """
                INSERT INTO session_answers
                  (session_id, question_id, value, response_time_ms,
                   intuition, method_score, accuracy, verdict, feedback)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                """,
                body.session_id,
                r["question_id"],
                next((a.value for a in body.answers if a.question_id == r["question_id"]), ""),
                next((a.response_time_ms for a in body.answers if a.question_id == r["question_id"]), None),
                r["intuition"], r["method"], r["accuracy"], r["verdict"], r["feedback"],
            )

    # Compute mastery delta in code
    baseline_ms = await _get_response_time_baseline(pool, skill_id)
    baselines   = [baseline_ms] * len(response_times) if baseline_ms > 0 else []
    delta = mastery_delta(
        open_results, mcq_results, response_times, baselines,
        practice_outcome=body.practice_outcome,
    )
    new_mastery = await _update_mastery(pool, skill_id, delta)

    # Ask Gatekeeper if learner can progress.
    # Require at least 1 prior completed session (2 total) before unlocking —
    # one lucky session should not be enough.
    completed_before = await _get_completed_session_count(pool, skill_id)
    if completed_before >= 1:
        raw_gate = await apti.gate_progression(
            skill_id=skill_id,
            session_results={
                "open_results": open_results,
                "mcq_results": mcq_results,
                "mastery_after": new_mastery,
                "practice_outcome": body.practice_outcome,
            },
            subject_id=subject_id,
        )
        try:
            GatekeeperResponse.model_validate(raw_gate)
        except ValidationError as e:
            raise HTTPException(502, f"Gatekeeper schema mismatch: {e}")
        unlock_decision = raw_gate
    else:
        unlock_decision = {
            "unlock": False,
            "confidence": 0.0,
            "message": "Good start — one more session will unlock a progression decision.",
            "focus_if_held": [],
        }

    # Generate flashcards when Gatekeeper approves graduation.
    # Unlock state is now computed from mastery + prerequisites — no DB column to flip.
    if unlock_decision.get("unlock"):
        skill_row = await pool.fetchrow("SELECT label, subject_id FROM skills WHERE id = $1", skill_id)
        if skill_row:
            try:
                result = await apti.generate_flashcards(
                    skill_id=skill_id,
                    skill_label=skill_row["label"],
                    subject_id=skill_row["subject_id"] or subject_id,
                )
                CartographerResponse.model_validate(result)
                for card in result.get("cards", []):
                    await pool.execute(
                        """
                        INSERT INTO cards (id, skill_id, front, back, interval_days, due_date)
                        VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
                        ON CONFLICT (id) DO NOTHING
                        """,
                        card["id"], skill_id, card["front"], card["back"],
                        card.get("initial_interval_days", 1),
                    )
            except Exception:
                pass  # flashcard generation is non-critical; session result still returns

    # Mark session complete and record practice outcome
    await pool.execute(
        "UPDATE sessions SET completed_at = $1, practice_outcome = $2 WHERE id = $3",
        datetime.now(timezone.utc), body.practice_outcome, body.session_id,
    )

    return {
        "open_results": open_results,
        "mcq_results": mcq_results,
        "mastery_delta": delta,
        "new_mastery": new_mastery,
        "unlock_decision": unlock_decision,
    }
