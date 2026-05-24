"""
Study notes endpoints.
One note document per skill — the learner's own running record of understanding.
Apti reads these notes when generating lessons and quizzes.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db.connection import get_pool

router = APIRouter(prefix="/api/notes", tags=["notes"])


class NotesBody(BaseModel):
    content: str


@router.get("/{skill_id}")
async def get_notes(skill_id: str):
    pool = get_pool()
    row = await pool.fetchrow(
        "SELECT content FROM skill_notes WHERE skill_id = $1", skill_id
    )
    return {"skill_id": skill_id, "content": row["content"] if row else ""}


@router.put("/{skill_id}")
async def save_notes(skill_id: str, body: NotesBody):
    pool = get_pool()
    skill = await pool.fetchrow("SELECT id FROM skills WHERE id = $1", skill_id)
    if not skill:
        raise HTTPException(404, f"Skill '{skill_id}' not found")
    await pool.execute(
        """
        INSERT INTO skill_notes (skill_id, content, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (skill_id) DO UPDATE
            SET content = $2, updated_at = NOW()
        """,
        skill_id, body.content,
    )
    return {"saved": True}
