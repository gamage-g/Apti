"""
Migration 001 — multi-subject curriculum.

Creates: subjects, prerequisites tables.
Alters:  skills (adds subject_id).
Seeds:   Mathematics / EE / Programming subjects, EE + Programming skills,
         and the full prerequisite graph.

Run once:  python -m migrations.001_subjects
"""

import asyncio, os, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import asyncpg
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

SQL = """
-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subjects (
    id               TEXT    PRIMARY KEY,
    name             TEXT    NOT NULL,
    description      TEXT    NOT NULL DEFAULT '',
    display_order    INTEGER NOT NULL DEFAULT 0,
    unlock_requirement TEXT  REFERENCES subjects(id)
);

ALTER TABLE skills ADD COLUMN IF NOT EXISTS subject_id TEXT REFERENCES subjects(id);

CREATE TABLE IF NOT EXISTS prerequisites (
    id                 SERIAL  PRIMARY KEY,
    gated_skill_id     TEXT    REFERENCES skills(id),
    gated_subject_id   TEXT    REFERENCES subjects(id),
    required_skill_id  TEXT    NOT NULL REFERENCES skills(id),
    mastery_threshold  INTEGER NOT NULL DEFAULT 70,
    CONSTRAINT exactly_one_gated CHECK (
        (gated_skill_id IS NOT NULL)::int +
        (gated_subject_id IS NOT NULL)::int = 1
    )
);

-- ── Subjects ──────────────────────────────────────────────────────────────────

INSERT INTO subjects (id, name, description, display_order) VALUES
    ('mathematics',            'Mathematics',
     'Foundational mathematics for engineering', 1),
    ('electrical_engineering', 'Electrical Engineering',
     'Circuit theory, electromagnetism, and signals', 2),
    ('programming',            'Programming',
     'Python programming and computer science fundamentals', 3)
ON CONFLICT (id) DO NOTHING;

-- ── Assign existing maths skills to Mathematics ───────────────────────────────

UPDATE skills SET subject_id = 'mathematics' WHERE subject_id IS NULL;

-- ── EE skills (shallow skeleton — no lesson content yet) ──────────────────────

INSERT INTO skills (id, num, label, accent_key, sort_order, subject_id) VALUES
    ('ee-dc-circuits',     '01', 'DC Circuits',      'blue', 101, 'electrical_engineering'),
    ('ee-ac-circuits',     '02', 'AC Circuits',      'blue', 102, 'electrical_engineering'),
    ('ee-circuit-analysis','03', 'Circuit Analysis', 'blue', 103, 'electrical_engineering'),
    ('ee-electromagnetism','04', 'Electromagnetism', 'blue', 104, 'electrical_engineering'),
    ('ee-signals',         '05', 'Signals',          'blue', 105, 'electrical_engineering')
ON CONFLICT (id) DO NOTHING;

-- ── Programming skills ────────────────────────────────────────────────────────

INSERT INTO skills (id, num, label, accent_key, sort_order, subject_id) VALUES
    ('prog-python-basics',   'Py.I',   'Python Basics',   'green', 201, 'programming'),
    ('prog-data-structures', 'Py.II',  'Data Structures', 'green', 202, 'programming'),
    ('prog-algorithms',      'Py.III', 'Algorithms',      'green', 203, 'programming'),
    ('prog-projects',        'Py.IV',  'Projects',        'green', 204, 'programming')
ON CONFLICT (id) DO NOTHING;

-- ── Prerequisite graph ────────────────────────────────────────────────────────

-- Mathematics chain — matches schema.sql prerequisite seed exactly
INSERT INTO prerequisites (gated_skill_id, gated_subject_id, required_skill_id, mastery_threshold) VALUES
    -- Calculus: requires Algebra ≥ 70
    ('calculus',  NULL, 'algebra',  70),
    -- Linear Algebra: requires Calculus ≥ 70 AND Vectors ≥ 70
    ('linalg',    NULL, 'calculus', 70),
    ('linalg',    NULL, 'vectors',  70),
    -- Differential Equations: requires Calculus ≥ 70
    ('diffeq',    NULL, 'calculus', 70),
    -- Probability & Statistics: requires Algebra ≥ 70
    ('prob',      NULL, 'algebra',  70)
ON CONFLICT DO NOTHING;

-- Electrical Engineering — gated behind relevant maths
INSERT INTO prerequisites (gated_skill_id, gated_subject_id, required_skill_id, mastery_threshold) VALUES
    ('ee-dc-circuits',      NULL, 'algebra',           50),
    ('ee-ac-circuits',      NULL, 'trig',              60),
    ('ee-ac-circuits',      NULL, 'ee-dc-circuits',    60),
    ('ee-circuit-analysis', NULL, 'algebra',           70),
    ('ee-circuit-analysis', NULL, 'calculus',          70),
    ('ee-electromagnetism', NULL, 'calculus',          70),
    ('ee-electromagnetism', NULL, 'vectors',           70),
    ('ee-signals',          NULL, 'trig',              70),
    ('ee-signals',          NULL, 'calculus',          70)
ON CONFLICT DO NOTHING;

-- Programming: within-track dependencies
INSERT INTO prerequisites (gated_skill_id, gated_subject_id, required_skill_id, mastery_threshold) VALUES
    ('prog-data-structures', NULL, 'prog-python-basics',   70),
    ('prog-algorithms',      NULL, 'prog-data-structures', 70),
    ('prog-projects',        NULL, 'prog-algorithms',      70)
ON CONFLICT DO NOTHING;
"""


async def run():
    url = os.environ["DATABASE_URL"]
    conn = await asyncpg.connect(url)
    try:
        await conn.execute(SQL)
        print("Migration 001 applied successfully.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run())
