"""
Subject endpoints: list subjects and per-subject skill lists.
Locked state is computed dynamically from the prerequisites table + learner mastery.
"""

from fastapi import APIRouter, HTTPException
from app.db.connection import get_pool

router = APIRouter(prefix="/api/subjects", tags=["subjects"])

# Reusable SQL fragment: true if every prerequisite for a skill is unmet.
_LOCKED_EXPR = """
    (
        EXISTS (
            SELECT 1 FROM prerequisites p
            LEFT JOIN mastery m
                   ON m.skill_id = p.required_skill_id AND m.sub_skill_id IS NULL
            WHERE p.gated_skill_id = s.id
              AND COALESCE(m.score, 0) < p.mastery_threshold
        )
        OR EXISTS (
            SELECT 1 FROM prerequisites p
            LEFT JOIN mastery m
                   ON m.skill_id = p.required_skill_id AND m.sub_skill_id IS NULL
            WHERE p.gated_subject_id = s.subject_id
              AND COALESCE(m.score, 0) < p.mastery_threshold
        )
    )
"""


@router.get("")
async def list_subjects():
    pool = get_pool()

    subject_rows = await pool.fetch(
        "SELECT id, name, description, display_order FROM subjects ORDER BY display_order"
    )

    skill_rows = await pool.fetch(f"""
        SELECT
            s.id, s.num, s.label, s.accent_key, s.subject_id, s.sort_order,
            COALESCE(MAX(m.score), 0)                                       AS mastery,
            COUNT(DISTINCT c.id) FILTER (WHERE c.due_date <= CURRENT_DATE)  AS due,
            {_LOCKED_EXPR}                                                  AS locked
        FROM skills s
        LEFT JOIN mastery m ON m.skill_id = s.id AND m.sub_skill_id IS NULL
        LEFT JOIN cards   c ON c.skill_id = s.id
        GROUP BY s.id, s.num, s.label, s.accent_key, s.subject_id, s.sort_order
        ORDER BY s.sort_order
    """)

    skills_by_subject: dict = {}
    for row in skill_rows:
        skills_by_subject.setdefault(row["subject_id"], []).append({
            "id":       row["id"],
            "num":      row["num"],
            "label":    row["label"],
            "accentKey": row["accent_key"],
            "locked":   row["locked"],
            "mastery":  row["mastery"],
            "due":      row["due"],
        })

    subjects = []
    for s in subject_rows:
        skills = skills_by_subject.get(s["id"], [])
        mastery = round(sum(sk["mastery"] for sk in skills) / len(skills)) if skills else 0
        subjects.append({
            "id":           s["id"],
            "name":         s["name"],
            "description":  s["description"],
            "displayOrder": s["display_order"],
            "mastery":      mastery,
            "skills":       skills,
        })

    return {"subjects": subjects}


@router.get("/{subject_id}/skills")
async def subject_skills(subject_id: str):
    pool = get_pool()

    subj = await pool.fetchrow("SELECT id FROM subjects WHERE id = $1", subject_id)
    if not subj:
        raise HTTPException(404, f"Subject '{subject_id}' not found")

    skill_rows = await pool.fetch(f"""
        SELECT
            s.id, s.num, s.label, s.accent_key, s.sort_order,
            COALESCE(MAX(m.score), 0)                                       AS mastery,
            COUNT(DISTINCT c.id) FILTER (WHERE c.due_date <= CURRENT_DATE)  AS due,
            {_LOCKED_EXPR}                                                  AS locked
        FROM skills s
        LEFT JOIN mastery m ON m.skill_id = s.id AND m.sub_skill_id IS NULL
        LEFT JOIN cards   c ON c.skill_id = s.id
        WHERE s.subject_id = $1
        GROUP BY s.id, s.num, s.label, s.accent_key, s.sort_order
        ORDER BY s.sort_order
    """, subject_id)

    sub_rows = await pool.fetch("""
        SELECT ss.id, ss.skill_id, ss.label, COALESCE(m.score, 0) AS mastery
        FROM sub_skills ss
        LEFT JOIN mastery m ON m.sub_skill_id = ss.id
        WHERE ss.skill_id = ANY($1::text[])
        ORDER BY ss.skill_id, ss.sort_order
    """, [r["id"] for r in skill_rows])

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
            "locked":     row["locked"],
            "mastery":    row["mastery"],
            "due":        row["due"],
            "subs":       [s["label"]   for s in skill_subs],
            "subMastery": [s["mastery"] for s in skill_subs],
            "subIds":     [s["id"]      for s in skill_subs],
        })

    return {"skills": skills}
