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

INSERT INTO skills (id, num, label, accent_key, locked, sort_order, subject_id) VALUES
    ('ee-dc-circuits',     '01', 'DC Circuits',      'blue', false, 101, 'electrical_engineering'),
    ('ee-ac-circuits',     '02', 'AC Circuits',      'blue', false, 102, 'electrical_engineering'),
    ('ee-circuit-analysis','03', 'Circuit Analysis', 'blue', false, 103, 'electrical_engineering'),
    ('ee-electromagnetism','04', 'Electromagnetism', 'blue', false, 104, 'electrical_engineering'),
    ('ee-signals',         '05', 'Signals',          'blue', false, 105, 'electrical_engineering')
ON CONFLICT (id) DO NOTHING;

-- ── Programming skills ────────────────────────────────────────────────────────

INSERT INTO skills (id, num, label, accent_key, locked, sort_order, subject_id) VALUES
    ('prog-python-basics',   '01', 'Python Basics',    'green', false, 201, 'programming'),
    ('prog-data-structures', '02', 'Data Structures',  'green', false, 202, 'programming'),
    ('prog-algorithms',      '03', 'Algorithms',       'green', false, 203, 'programming'),
    ('prog-projects',        '04', 'Projects',         'green', false, 204, 'programming')
ON CONFLICT (id) DO NOTHING;

-- ── Prerequisite graph ────────────────────────────────────────────────────────

-- Mathematics sequential chain
INSERT INTO prerequisites (gated_skill_id, required_skill_id, mastery_threshold) VALUES
    -- algebra unlocks after arithmetic
    ('algebra',            'arithmetic', 70),
    -- trig needs algebra
    ('trig',               'algebra',    70),
    -- vectors needs algebra
    ('vectors',            'algebra',    70),
    -- calculus needs trig (trig implies algebra)
    ('calculus',           'trig',       70),
    -- linalg needs calculus
    ('linalg',             'calculus',   70),
    ('linalg',             'vectors',    70),
    -- diffeq needs linalg (which implies calculus)
    ('diffeq',             'linalg',     70),
    -- prob needs algebra
    ('prob',               'algebra',    70)
ON CONFLICT DO NOTHING;

-- Electrical Engineering — gated behind relevant maths
INSERT INTO prerequisites (gated_skill_id, required_skill_id, mastery_threshold) VALUES
    -- DC Circuits: basic algebra
    ('ee-dc-circuits',      'algebra',   50),
    -- AC Circuits: trigonometry (phasors) + DC Circuits mastered
    ('ee-ac-circuits',      'trig',      60),
    ('ee-ac-circuits',      'ee-dc-circuits', 60),
    -- Circuit Analysis: algebra + calculus (Laplace, transients)
    ('ee-circuit-analysis', 'algebra',   70),
    ('ee-circuit-analysis', 'calculus',  70),
    -- Electromagnetism: calculus + vectors (field theory)
    ('ee-electromagnetism', 'calculus',  70),
    ('ee-electromagnetism', 'vectors',   70),
    -- Signals: trigonometry + calculus (Fourier)
    ('ee-signals',          'trig',      70),
    ('ee-signals',          'calculus',  70)
ON CONFLICT DO NOTHING;

-- Programming: within-track dependencies
INSERT INTO prerequisites (gated_skill_id, required_skill_id, mastery_threshold) VALUES
    ('prog-data-structures', 'prog-python-basics',   70),
    ('prog-algorithms',      'prog-data-structures', 70),
    ('prog-projects',        'prog-algorithms',      70)
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
