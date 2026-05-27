"""
Apti client — one async function per role.
Each call: build prompt → call DeepSeek → validate schema → retry once on failure.
"""

import json
import re
import httpx
from typing import Any

from app.db.connection import get_settings
from app.apti.prompts import (
    CONSTITUTION,
    LECTURER, EXAMINER, GRADER, CARTOGRAPHER, SCHEDULER_ADVISOR, GATEKEEPER,
)

# JSON escape sequences that overlap with LaTeX commands:
#   \f (form-feed)  → \frac, \forall, …
#   \b (backspace)  → \begin, \beta, \bar, …
#   \n (newline)    → \nabla, \neq, …
#   \r (CR)         → \rho, \right, \rightarrow, …
#   \t (tab)        → \theta, \text, \times, …
# When the model writes \frac in a JSON string, json.loads converts \f to
# the form-feed char (U+000C).  Fix: double the backslash before parsing.
_LATEX_ESCAPE_RE = re.compile(r'(?<!\\)\\([bfnrt])(?=[a-z])')


def _fix_latex_escapes(raw: str) -> str:
    return _LATEX_ESCAPE_RE.sub(r'\\\\\1', raw)


DEEPSEEK_BASE = "https://api.deepseek.com/v1"

# Model is read from settings (DEEPSEEK_MODEL in .env) so updates are one-line.
# Verify current model IDs and pricing: https://api-docs.deepseek.com/quick_start/pricing
def _model() -> str:
    return get_settings().deepseek_model


# Per-role settings from the design doc.
# Grader/Gatekeeper/Scheduler at 0.0 (deterministic); Examiner 0.4; Lecturer/Cartographer 0.5.
_ROLE_SETTINGS = {
    "lecturer":          {"temperature": 0.5, "max_tokens": 2200},
    "examiner":          {"temperature": 0.4, "max_tokens": 2000},
    "grader":            {"temperature": 0.0, "max_tokens": 1000},
    "cartographer":      {"temperature": 0.5, "max_tokens": 1000},
    "scheduler_advisor": {"temperature": 0.0, "max_tokens": 400},
    "gatekeeper":        {"temperature": 0.0, "max_tokens": 500},
}


async def _call_deepseek(role_prompt: str, user_content: str, role: str) -> dict[str, Any]:
    """
    One DeepSeek API call.

    Message layout for prompt caching:
      system = CONSTITUTION      (stable across every call → cached)
      user   = role_prompt + subject context + variable data
                (role_prompt is stable per role; subject context per (role, subject))
    """
    cfg = _ROLE_SETTINGS[role]
    payload = {
        "model": _model(),
        "response_format": {"type": "json_object"},
        "temperature": cfg["temperature"],
        "max_tokens": cfg["max_tokens"],
        "messages": [
            {"role": "system", "content": CONSTITUTION},
            {"role": "user",   "content": role_prompt + "\n\n" + user_content},
        ],
    }
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{DEEPSEEK_BASE}/chat/completions",
            headers={"Authorization": f"Bearer {get_settings().deepseek_api_key}"},
            json=payload,
        )
        resp.raise_for_status()
    raw = resp.json()["choices"][0]["message"]["content"]
    if not raw or not raw.strip():
        raise json.JSONDecodeError("Empty response from model", "", 0)
    return json.loads(_fix_latex_escapes(raw))


async def _call_with_retry(role_prompt: str, user_content: str, role: str) -> dict[str, Any]:
    try:
        return await _call_deepseek(role_prompt, user_content, role)
    except (ValueError, KeyError, json.JSONDecodeError):
        stricter = user_content + "\n\nIMPORTANT: Return ONLY the JSON object. No text before or after."
        return await _call_deepseek(role_prompt, stricter, role)


# ─── Public role functions ────────────────────────────────────────────────────

async def generate_lesson(
    topic: str,
    skill: str,
    learner_level: str,
    unlocked_skills: list[str],
    recent_struggles: list[str],
    recent_lesson_topics: list[str] | None = None,
    subject_id: str = "mathematics",
    learner_notes: str = "",
) -> dict[str, Any]:
    user = json.dumps({
        "subject": subject_id,
        "topic": topic,
        "skill": skill,
        "learner_level": learner_level,
        "unlocked_skills": unlocked_skills,
        "recent_struggles": recent_struggles,
        "recent_lesson_topics": recent_lesson_topics or [],
        "learner_notes": learner_notes,
    })
    return await _call_with_retry(LECTURER, user, "lecturer")


def _trim_lesson_for_examiner(lesson: Any) -> dict[str, Any]:
    """Strip verbose fields before sending the lesson to the Examiner.
    The full lesson JSON (all reasoning chains, hint lists, etc.) can push
    the combined input past 4000 tokens, leaving no room for the quiz output.
    Also handles the case where asyncpg returns JSONB as a JSON string."""
    if isinstance(lesson, str):
        try:
            lesson = json.loads(lesson)
        except (json.JSONDecodeError, ValueError):
            return {"raw_lesson": lesson[:1500]}
    if not isinstance(lesson, dict):
        return {}

    stages = lesson.get("stages") or {}
    if not isinstance(stages, dict):
        stages = {}

    build = stages.get("build") or []
    key_steps = []
    for s in build:
        if isinstance(s, dict):
            key_steps.append({"step": s.get("step", ""), "why": s.get("why", "")})
        elif isinstance(s, str):
            key_steps.append({"step": s, "why": ""})

    worked = stages.get("worked") or {}
    worked_problem = worked.get("problem", "") if isinstance(worked, dict) else ""

    return {
        "topic":          lesson.get("topic", ""),
        "intuition":      stages.get("intuition", ""),
        "analogy":        stages.get("analogy", ""),
        "key_steps":      key_steps,
        "worked_problem": worked_problem,
        "recall":         stages.get("recall") or [],
        "key_terms":      lesson.get("key_terms") or [],
        "watch_out":      lesson.get("watch_out", ""),
    }


async def generate_quiz(
    topic: str,
    lesson: dict[str, Any],
    recent_question_prompts: list[str],
    subject_id: str = "mathematics",
    learner_notes: str = "",
) -> dict[str, Any]:
    user = json.dumps({
        "subject": subject_id,
        "topic": topic,
        "lesson": _trim_lesson_for_examiner(lesson),
        "recent_question_prompts": recent_question_prompts,
        "learner_notes": learner_notes,
    })
    return await _call_with_retry(EXAMINER, user, "examiner")


async def grade_open_answers(
    question_answer_pairs: list[dict[str, str]],
    subject_id: str = "mathematics",
) -> dict[str, Any]:
    """MCQ answers must NOT be sent here — grade those in code."""
    user = json.dumps({"subject": subject_id, "answers": question_answer_pairs})
    return await _call_with_retry(GRADER, user, "grader")


async def generate_flashcards(
    skill_id: str,
    skill_label: str,
    subject_id: str = "mathematics",
) -> dict[str, Any]:
    user = json.dumps({"subject": subject_id, "skill_id": skill_id, "skill_label": skill_label})
    return await _call_with_retry(CARTOGRAPHER, user, "cartographer")


async def advise_schedule(
    skill_graph: list[dict[str, Any]],
    recent_performance: list[dict[str, Any]],
    subject_id: str = "mathematics",
) -> dict[str, Any]:
    user = json.dumps({
        "subject": subject_id,
        "skill_graph": skill_graph,
        "recent_performance": recent_performance,
    })
    return await _call_with_retry(SCHEDULER_ADVISOR, user, "scheduler_advisor")


async def gate_progression(
    skill_id: str,
    session_results: dict[str, Any],
    subject_id: str = "mathematics",
) -> dict[str, Any]:
    user = json.dumps({"subject": subject_id, "skill_id": skill_id, "session_results": session_results})
    return await _call_with_retry(GATEKEEPER, user, "gatekeeper")
