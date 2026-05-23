"""
Session endpoints: start lesson → generate quiz → submit answers.
"""

import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db.connection import get_pool
from app.apti import client as apti
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


# ─── POST /api/session/start ──────────────────────────────────────────────────

@router.post("/start")
async def start_session(body: StartRequest):
    pool = get_pool()

    # Verify skill exists and is unlocked
    skill = await pool.fetchrow(
        "SELECT id, label, locked FROM skills WHERE id = $1", body.skill_id
    )
    if not skill:
        raise HTTPException(404, f"Skill '{body.skill_id}' not found")
    if skill["locked"]:
        raise HTTPException(403, f"Skill '{body.skill_id}' is locked")

    # Gather context for the Lecturer
    unlocked = await pool.fetch("SELECT id FROM skills WHERE locked = false")
    unlocked_ids = [r["id"] for r in unlocked]
    recent_struggles = await _get_recent_struggles(pool, body.skill_id)

    # Call Apti Lecturer
    try:
        lesson = await apti.generate_lesson(
            topic=body.topic,
            skill=skill["label"],
            learner_level="foundational",
            unlocked_skills=unlocked_ids,
            recent_struggles=recent_struggles,
        )
    except Exception as e:
        raise HTTPException(502, f"AI service error: {e}")

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

@router.post("/quiz")
async def generate_quiz(body: dict):
    session_id: str = body.get("session_id", "")
    pool = get_pool()

    session = await pool.fetchrow(
        "SELECT skill_id, topic, lesson_json FROM sessions WHERE id = $1",
        session_id,
    )
    if not session:
        raise HTTPException(404, "Session not found")

    recent_prompts = await _get_recent_question_prompts(pool, session["skill_id"])

    try:
        quiz = await apti.generate_quiz(
            topic=session["topic"],
            lesson=session["lesson_json"],
            recent_question_prompts=recent_prompts,
        )
    except Exception as e:
        raise HTTPException(502, f"AI service error: {e}")

    # Prefix question IDs with session_id so they're globally unique across sessions.
    # DeepSeek reuses short IDs like "q1"–"q4"; without this, ON CONFLICT silently
    # drops inserts and submit finds no questions for the new session.
    questions_out = []
    for q in quiz.get("questions", []):
        stable_id = f"{session_id}:{q['id']}"
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
        "SELECT skill_id FROM sessions WHERE id = $1", body.session_id
    )
    if not session:
        raise HTTPException(404, "Session not found")

    skill_id = session["skill_id"]

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
        graded = await apti.grade_open_answers(open_pairs)
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
    delta = mastery_delta(open_results, mcq_results, response_times, baselines=[])
    new_mastery = await _update_mastery(pool, skill_id, delta)

    # Ask Gatekeeper if learner can progress
    unlock_decision = await apti.gate_progression(
        skill_id=skill_id,
        session_results={
            "open_results": open_results,
            "mcq_results": mcq_results,
            "mastery_after": new_mastery,
        },
    )

    # Unlock next skill and generate flashcards for completed skill
    if unlock_decision.get("unlock"):
        await pool.execute(
            """
            UPDATE skills SET locked = false
            WHERE sort_order = (
                SELECT MIN(sort_order) FROM skills
                WHERE locked = true
                  AND sort_order > (SELECT sort_order FROM skills WHERE id = $1)
            )
            """,
            skill_id,
        )
        skill_row = await pool.fetchrow("SELECT label FROM skills WHERE id = $1", skill_id)
        if skill_row:
            try:
                result = await apti.generate_flashcards(
                    skill_id=skill_id,
                    skill_label=skill_row["label"],
                )
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

    # Mark session complete
    await pool.execute(
        "UPDATE sessions SET completed_at = $1 WHERE id = $2",
        datetime.now(timezone.utc), body.session_id,
    )

    return {
        "open_results": open_results,
        "mcq_results": mcq_results,
        "mastery_delta": delta,
        "new_mastery": new_mastery,
        "unlock_decision": unlock_decision,
    }
