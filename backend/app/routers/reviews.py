"""
Review endpoints: fetch due cards, grade a card (SM-2), graduate a skill.
These are the most frequent operations — no LLM, pure DB + arithmetic.
"""

from datetime import date

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db.connection import get_pool
from app.apti import client as apti
from app.apti.schemas import CartographerResponse
from app.scheduler.sm2 import CardState, next_interval

router = APIRouter(prefix="/api", tags=["reviews"])


# ─── GET /api/reviews/due ─────────────────────────────────────────────────────

@router.get("/reviews/due")
async def get_due_cards():
    pool = get_pool()
    rows = await pool.fetch(
        """
        SELECT id, skill_id, front, back, interval_days, ease_factor, due_date
        FROM cards
        WHERE due_date <= CURRENT_DATE
        ORDER BY due_date ASC
        """
    )
    return {
        "cards": [
            {
                "id": r["id"],
                "skill_id": r["skill_id"],
                "front": r["front"],
                "back": r["back"],
                "interval_days": r["interval_days"],
                "due_date": r["due_date"].isoformat(),
            }
            for r in rows
        ]
    }


# ─── POST /api/reviews/grade ──────────────────────────────────────────────────

class GradeRequest(BaseModel):
    card_id: str
    grade: int  # 0 = forgot, 1 = partial, 2 = mastered


@router.post("/reviews/grade")
async def grade_card(body: GradeRequest):
    if body.grade not in (0, 1, 2):
        raise HTTPException(400, "grade must be 0, 1, or 2")

    pool = get_pool()
    row = await pool.fetchrow(
        "SELECT interval_days, ease_factor, due_date FROM cards WHERE id = $1",
        body.card_id,
    )
    if not row:
        raise HTTPException(404, f"Card '{body.card_id}' not found")

    state = CardState(
        interval=row["interval_days"],
        ease=float(row["ease_factor"]),
        due_date=row["due_date"],
    )
    new_state = next_interval(state, body.grade)

    # Update card SM-2 state
    await pool.execute(
        """
        UPDATE cards
        SET interval_days = $1, ease_factor = $2, due_date = $3
        WHERE id = $4
        """,
        new_state.interval, round(new_state.ease, 2), new_state.due_date, body.card_id,
    )

    # Log the review
    await pool.execute(
        """
        INSERT INTO card_reviews (card_id, grade, interval_days, new_due_date)
        VALUES ($1, $2, $3, $4)
        """,
        body.card_id, body.grade, new_state.interval, new_state.due_date,
    )

    return {
        "next_due_date": new_state.due_date.isoformat(),
        "interval_days": new_state.interval,
    }


# ─── POST /api/skill/graduate ─────────────────────────────────────────────────

class GraduateRequest(BaseModel):
    skill_id: str


@router.post("/skill/graduate")
async def graduate_skill(body: GraduateRequest):
    import traceback
    pool = get_pool()

    try:
        skill = await pool.fetchrow(
            "SELECT id, label, subject_id FROM skills WHERE id = $1", body.skill_id
        )
        if not skill:
            raise HTTPException(404, f"Skill '{body.skill_id}' not found")

        # Generate flashcards via Cartographer
        result = await apti.generate_flashcards(
            skill_id=body.skill_id,
            skill_label=skill["label"],
            subject_id=skill["subject_id"] or "mathematics",
        )
        try:
            CartographerResponse.model_validate(result)
        except Exception as e:
            raise HTTPException(502, f"Cartographer schema mismatch: {e}")
        cards = result.get("cards", [])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"graduate_skill error: {traceback.format_exc()}")

    # Persist cards.
    # DELETE all existing cards for this skill first so regeneration always
    # replaces stale content (broken LaTeX, missing delimiters, etc.).
    await pool.execute("DELETE FROM cards WHERE skill_id = $1", body.skill_id)
    for card in cards:
        await pool.execute(
            """
            INSERT INTO cards (id, skill_id, front, back, interval_days, due_date)
            VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
            """,
            card["id"], body.skill_id, card["front"], card["back"],
            card.get("initial_interval_days", 1),
        )

    return {"cards": cards}
