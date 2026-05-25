"""
Skills endpoints: list all skills with live mastery + due counts,
and recent session history for the dashboard.
"""

from datetime import date, timedelta

from fastapi import APIRouter
from app.db.connection import get_pool
from app.db.queries import LOCKED_EXPR

router = APIRouter(prefix="/api", tags=["skills"])


@router.get("/skills")
async def list_skills():
    pool = get_pool()

    skill_rows = await pool.fetch(
        f"""
        SELECT
            s.id, s.num, s.label, s.accent_key, s.subject_id, s.sort_order,
            COALESCE(MAX(m.score), 0)                                      AS mastery,
            COUNT(DISTINCT c.id) FILTER (WHERE c.due_date <= CURRENT_DATE) AS due,
            {LOCKED_EXPR}                                                  AS locked
        FROM skills s
        LEFT JOIN mastery m ON m.skill_id = s.id AND m.sub_skill_id IS NULL
        LEFT JOIN cards   c ON c.skill_id = s.id
        GROUP BY s.id, s.num, s.label, s.accent_key, s.subject_id, s.sort_order
        ORDER BY s.sort_order
        """
    )

    sub_rows = await pool.fetch(
        """
        SELECT ss.id, ss.skill_id, ss.label, COALESCE(m.score, 0) AS mastery
        FROM sub_skills ss
        LEFT JOIN mastery m ON m.sub_skill_id = ss.id
        ORDER BY ss.skill_id, ss.sort_order
        """
    )

    subs_by_skill: dict = {}
    for row in sub_rows:
        subs_by_skill.setdefault(row["skill_id"], []).append(
            {"id": row["id"], "label": row["label"], "mastery": row["mastery"]}
        )

    skills = []
    for row in skill_rows:
        skill_subs = subs_by_skill.get(row["id"], [])
        skills.append({
            "id":         row["id"],
            "num":        row["num"],
            "label":      row["label"],
            "accentKey":  row["accent_key"],
            "subjectId":  row["subject_id"],
            "locked":     row["locked"],
            "mastery":    row["mastery"],
            "due":        row["due"],
            "subs":       [s["label"]   for s in skill_subs],
            "subMastery": [s["mastery"] for s in skill_subs],
            "subIds":     [s["id"]      for s in skill_subs],
        })

    return {"skills": skills}


@router.get("/sessions/recent")
async def recent_sessions():
    pool = get_pool()

    rows = await pool.fetch(
        """
        SELECT
            s.topic,
            s.started_at,
            s.completed_at,
            EXTRACT(EPOCH FROM (s.completed_at - s.started_at)) / 60   AS duration_min,
            COUNT(sa.id)                                                 AS total_q,
            COUNT(sa.id) FILTER (WHERE sa.is_correct = true)            AS correct_mcq,
            COUNT(sa.id) FILTER (WHERE sa.is_correct IS NOT NULL)       AS total_mcq,
            AVG(
                CASE WHEN sa.intuition IS NOT NULL
                THEN 0.5 * sa.intuition + 0.3 * sa.method_score + 0.2 * sa.accuracy
                END
            )                                                            AS avg_open
        FROM sessions s
        LEFT JOIN session_answers sa ON sa.session_id = s.id
        WHERE s.completed_at IS NOT NULL
        GROUP BY s.id, s.topic, s.started_at, s.completed_at
        ORDER BY s.started_at DESC
        LIMIT 5
        """
    )

    sessions = []
    for row in rows:
        total_mcq  = row["total_mcq"] or 0
        correct    = row["correct_mcq"] or 0
        avg_open   = float(row["avg_open"] or 0)
        duration   = int(row["duration_min"] or 0)

        if total_mcq > 0 and avg_open > 0:
            score = round((correct / total_mcq * 0.6 + avg_open * 0.4) * 100)
        elif total_mcq > 0:
            score = round(correct / total_mcq * 100)
        elif avg_open > 0:
            score = round(avg_open * 100)
        else:
            score = 0

        sessions.append({
            "topic":    row["topic"],
            "score":    score,
            "duration": f"{duration} min" if duration > 0 else "< 1 min",
            "date":     row["started_at"].strftime("%b %d"),
        })

    return {"sessions": sessions}


@router.get("/streak")
async def get_streak():
    pool = get_pool()
    # Fetch distinct study dates (most recent first) and count the unbroken
    # run of consecutive days ending today or yesterday.
    rows = await pool.fetch(
        """
        SELECT DISTINCT completed_at::date AS study_date
        FROM sessions
        WHERE completed_at IS NOT NULL
        ORDER BY study_date DESC
        """
    )
    if not rows:
        return {"streak": 0}

    today = date.today()
    streak = 0
    expected = today
    for row in rows:
        d = row["study_date"]
        if d == expected or (streak == 0 and d == today - timedelta(days=1)):
            # Allow streak to start from yesterday if nothing done today yet
            expected = d - timedelta(days=1)
            streak += 1
        elif streak == 0 and d < today - timedelta(days=1):
            break
        elif d < expected:
            break

    return {"streak": streak}
