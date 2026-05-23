"""
Apti client — one async function per role.
Each call: build prompt → call DeepSeek → validate schema → retry once on failure.
"""

import json
import httpx
from typing import Any

from app.db.connection import get_settings
from app.apti.prompts import (
    CONSTITUTION,
    LECTURER, EXAMINER, GRADER, CARTOGRAPHER, SCHEDULER_ADVISOR, GATEKEEPER,
)


DEEPSEEK_BASE = "https://api.deepseek.com/v1"

# Model is read from settings (DEEPSEEK_MODEL in .env) so updates are one-line.
# Verify current model IDs and pricing: https://api-docs.deepseek.com/quick_start/pricing
def _model() -> str:
    return get_settings().deepseek_model


# Per-role settings from the design doc.
# Grader/Gatekeeper/Scheduler at 0.0 (deterministic); Examiner 0.4; Lecturer/Cartographer 0.5.
_ROLE_SETTINGS = {
    "lecturer":          {"temperature": 0.5, "max_tokens": 1000},
    "examiner":          {"temperature": 0.4, "max_tokens": 1500},
    "grader":            {"temperature": 0.0, "max_tokens": 1000},
    "cartographer":      {"temperature": 0.5, "max_tokens": 1000},
    "scheduler_advisor": {"temperature": 0.0, "max_tokens": 400},
    "gatekeeper":        {"temperature": 0.0, "max_tokens": 500},
}


async def _call_deepseek(
    role_prompt: str,
    user_message: str,
    role: str,
) -> dict[str, Any]:
    """
    Make one API call to DeepSeek. Returns parsed JSON dict.

    Message structure for prompt caching:
      system  = CONSTITUTION  (identical on every call → cached across all roles)
      user    = role_prompt + variable content  (role part is stable per role)

    DeepSeek caches the longest matching prefix automatically; keeping CONSTITUTION
    as the sole system message maximises the shared prefix across all six roles.
    """
    cfg = _ROLE_SETTINGS[role]
    payload = {
        "model": _model(),
        "response_format": {"type": "json_object"},
        "temperature": cfg["temperature"],
        "max_tokens": cfg["max_tokens"],
        "messages": [
            {"role": "system", "content": CONSTITUTION},
            {"role": "user",   "content": role_prompt + "\n\n" + user_message},
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
    return json.loads(raw)


async def _call_with_retry(role_prompt: str, user_message: str, role: str) -> dict[str, Any]:
    try:
        return await _call_deepseek(role_prompt, user_message, role)
    except (ValueError, KeyError, json.JSONDecodeError):
        stricter = user_message + "\n\nIMPORTANT: Return ONLY the JSON object. No text before or after."
        return await _call_deepseek(role_prompt, stricter, role)


# ─── Public role functions ────────────────────────────────────────────────────

async def generate_lesson(
    topic: str,
    skill: str,
    learner_level: str,
    unlocked_skills: list[str],
    recent_struggles: list[str],
) -> dict[str, Any]:
    user = json.dumps({
        "topic": topic,
        "skill": skill,
        "learner_level": learner_level,
        "unlocked_skills": unlocked_skills,
        "recent_struggles": recent_struggles,
    })
    return await _call_with_retry(LECTURER, user, "lecturer")


async def generate_quiz(
    topic: str,
    lesson: dict[str, Any],
    recent_question_prompts: list[str],
) -> dict[str, Any]:
    user = json.dumps({
        "topic": topic,
        "lesson": lesson,
        "recent_question_prompts": recent_question_prompts,
    })
    return await _call_with_retry(EXAMINER, user, "examiner")


async def grade_open_answers(
    question_answer_pairs: list[dict[str, str]],
) -> dict[str, Any]:
    """MCQ answers must NOT be sent here — grade those in code."""
    user = json.dumps({"answers": question_answer_pairs})
    return await _call_with_retry(GRADER, user, "grader")


async def generate_flashcards(skill_id: str, skill_label: str) -> dict[str, Any]:
    user = json.dumps({"skill_id": skill_id, "skill_label": skill_label})
    return await _call_with_retry(CARTOGRAPHER, user, "cartographer")


async def advise_schedule(
    skill_graph: list[dict[str, Any]],
    recent_performance: list[dict[str, Any]],
) -> dict[str, Any]:
    user = json.dumps({
        "skill_graph": skill_graph,
        "recent_performance": recent_performance,
    })
    return await _call_with_retry(SCHEDULER_ADVISOR, user, "scheduler_advisor")


async def gate_progression(
    skill_id: str,
    session_results: dict[str, Any],
) -> dict[str, Any]:
    user = json.dumps({"skill_id": skill_id, "session_results": session_results})
    return await _call_with_retry(GATEKEEPER, user, "gatekeeper")
