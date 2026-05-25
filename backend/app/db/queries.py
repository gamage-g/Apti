"""
Reusable SQL fragments shared across routers.
Centralised here so prerequisite/locking logic is only written once.
"""

# True when ANY prerequisite for this skill (or its subject) is unmet.
# Uses alias "s" for the skills table — callers must alias accordingly.
# Alias the expression as "locked" in SELECT lists:
#   f"SELECT ..., {LOCKED_EXPR} AS locked FROM skills s ..."
LOCKED_EXPR = """
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
