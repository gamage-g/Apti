-- Apti database schema — complete and up to date.
-- Run once against a fresh database:
--   psql $DATABASE_URL -f schema.sql
--
-- Safe to re-run: all objects use IF NOT EXISTS / ON CONFLICT DO NOTHING.

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid() on PG < 13


-- ─── Subjects ─────────────────────────────────────────────────────────────────
-- Top level of the curriculum hierarchy: Mathematics, Programming, EE, ...
-- Adding a new subject is a data change (rows here + skills below), not new code.

CREATE TABLE IF NOT EXISTS subjects (
    id              TEXT        PRIMARY KEY,   -- 'mathematics', 'programming', etc.
    name            TEXT        NOT NULL,
    description     TEXT        NOT NULL DEFAULT '',
    display_order   INTEGER     NOT NULL
);


-- ─── Skills ───────────────────────────────────────────────────────────────────
-- One skill = one chapter of study (e.g. "Algebra", "Python Basics").
-- `locked` is NOT a column — it is computed at query time from the
-- prerequisites table + mastery scores. See skills.py / sessions.py.

CREATE TABLE IF NOT EXISTS skills (
    id          TEXT        PRIMARY KEY,   -- 'algebra', 'prog-python-basics', etc.
    num         TEXT        NOT NULL,      -- display number: 'I', 'II', 'Py.1', ...
    label       TEXT        NOT NULL,
    accent_key  TEXT        NOT NULL,      -- matches a key in the frontend theme
    subject_id  TEXT        NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    sort_order  INTEGER     NOT NULL
);


-- ─── Sub-skills ───────────────────────────────────────────────────────────────
-- Sections within a chapter (e.g. "Fractions", "Ratios" inside Arithmetic).
-- Apti targets the lowest-mastery sub-skill when choosing a lesson topic.

CREATE TABLE IF NOT EXISTS sub_skills (
    id          SERIAL      PRIMARY KEY,
    skill_id    TEXT        NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    label       TEXT        NOT NULL,
    sort_order  INTEGER     NOT NULL,
    UNIQUE (skill_id, label)
);


-- ─── Prerequisites ────────────────────────────────────────────────────────────
-- Gates a skill or an entire subject behind mastery of a required skill.
-- A skill / subject is LOCKED while ANY of its prerequisite rows has
--   COALESCE(mastery.score, 0) < mastery_threshold.
--
-- gated_skill_id    — locks a single skill
-- gated_subject_id  — locks every skill inside that subject
-- Exactly one of the two must be non-null (enforced by CHECK below).

CREATE TABLE IF NOT EXISTS prerequisites (
    id                  SERIAL      PRIMARY KEY,
    gated_skill_id      TEXT        REFERENCES skills(id)   ON DELETE CASCADE,
    gated_subject_id    TEXT        REFERENCES subjects(id) ON DELETE CASCADE,
    required_skill_id   TEXT        NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    mastery_threshold   INTEGER     NOT NULL DEFAULT 70,
    CHECK (
        (gated_skill_id IS NOT NULL) != (gated_subject_id IS NOT NULL)
    )
);

-- Partial unique indexes so ON CONFLICT DO NOTHING works despite nullable gated columns.
CREATE UNIQUE INDEX IF NOT EXISTS prereq_skill_unique
    ON prerequisites (gated_skill_id, required_skill_id) WHERE gated_skill_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS prereq_subject_unique
    ON prerequisites (gated_subject_id, required_skill_id) WHERE gated_subject_id IS NOT NULL;


-- ─── Mastery scores ───────────────────────────────────────────────────────────
-- One row per (skill, sub_skill) pair.
-- sub_skill_id IS NULL  →  chapter-level score (the one the frontend shows).
-- sub_skill_id NOT NULL →  section-level score.
--
-- PostgreSQL UNIQUE treats NULL != NULL, so two rows with (skill_id, NULL)
-- would not conflict via the constraint alone.  The backend therefore uses
-- UPDATE-then-INSERT for chapter-level rows (see sessions.py _update_mastery).
-- The partial index below prevents accidental duplicate chapter rows.

CREATE TABLE IF NOT EXISTS mastery (
    id              SERIAL      PRIMARY KEY,
    skill_id        TEXT        NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    sub_skill_id    INTEGER     REFERENCES sub_skills(id) ON DELETE CASCADE,
    score           INTEGER     NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique chapter-level row per skill (sub_skill_id IS NULL case).
CREATE UNIQUE INDEX IF NOT EXISTS mastery_chapter_unique
    ON mastery (skill_id) WHERE sub_skill_id IS NULL;

-- Unique sub-skill row per (skill, sub_skill) pair.
CREATE UNIQUE INDEX IF NOT EXISTS mastery_subsection_unique
    ON mastery (skill_id, sub_skill_id) WHERE sub_skill_id IS NOT NULL;


-- ─── Study sessions ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sessions (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id         TEXT        NOT NULL REFERENCES skills(id),
    sub_skill_id     INTEGER     REFERENCES sub_skills(id),
    topic            TEXT        NOT NULL,
    lesson_json      JSONB,                 -- full Lecturer output, stored verbatim
    started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at     TIMESTAMPTZ,
    practice_outcome TEXT        CHECK (
                         practice_outcome IN ('unaided', 'hint_used', 'solution_revealed')
                     )
);


-- ─── Questions generated by the Examiner ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS session_questions (
    id              TEXT        PRIMARY KEY,   -- prefixed as "<session_id>:<q_id>"
    session_id      UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    layer           TEXT        NOT NULL CHECK (layer IN ('recognise', 'apply', 'reason')),
    type            TEXT        NOT NULL CHECK (type IN ('mcq', 'open')),
    prompt          TEXT        NOT NULL,
    options         JSONB,                     -- string array; null for open questions
    correct_index   INTEGER,                   -- null for open questions
    model_answer    TEXT,                      -- null for MCQ
    explanation     TEXT        NOT NULL
);


-- ─── Submitted answers ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS session_answers (
    id              SERIAL      PRIMARY KEY,
    session_id      UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    question_id     TEXT        NOT NULL REFERENCES session_questions(id),
    value           TEXT        NOT NULL,      -- index string (MCQ) or free text (open)
    response_time_ms INTEGER,
    -- MCQ fields (code-graded)
    is_correct      BOOLEAN,
    -- Open answer fields (LLM-graded)
    intuition       NUMERIC(4,3),              -- 0.000 – 1.000
    method_score    NUMERIC(4,3),
    accuracy        NUMERIC(4,3),
    verdict         TEXT        CHECK (verdict IN ('mastered', 'fragile', 'misunderstood')),
    feedback        TEXT
);


-- ─── Flashcards ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cards (
    id              TEXT        PRIMARY KEY,   -- from Cartographer JSON
    skill_id        TEXT        NOT NULL REFERENCES skills(id),
    front           TEXT        NOT NULL,
    back            TEXT        NOT NULL,
    interval_days   INTEGER     NOT NULL DEFAULT 1,
    ease_factor     NUMERIC(4,2) NOT NULL DEFAULT 2.50,
    due_date        DATE        NOT NULL DEFAULT CURRENT_DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─── Flashcard review log ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS card_reviews (
    id              SERIAL      PRIMARY KEY,
    card_id         TEXT        NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    grade           INTEGER     NOT NULL CHECK (grade IN (0, 1, 2)),
    reviewed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    interval_days   INTEGER     NOT NULL,
    new_due_date    DATE        NOT NULL
);


-- ─── Learner study notes ──────────────────────────────────────────────────────
-- One free-text document per skill. Apti reads these when generating lessons.

CREATE TABLE IF NOT EXISTS skill_notes (
    skill_id    TEXT        PRIMARY KEY REFERENCES skills(id) ON DELETE CASCADE,
    content     TEXT        NOT NULL DEFAULT '',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─── Web Push subscriptions ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS push_subscriptions (
    endpoint    TEXT        PRIMARY KEY,
    p256dh      TEXT        NOT NULL,
    auth        TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ═══════════════════════════════════════════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Subjects ─────────────────────────────────────────────────────────────────

INSERT INTO subjects (id, name, description, display_order) VALUES
    ('mathematics',
     'Mathematics',
     'Foundational engineering mathematics — arithmetic through differential equations.',
     1),
    ('programming',
     'Programming',
     'Python for engineers — computation, data, and automation.',
     2),
    ('electrical_engineering',
     'Electrical Engineering',
     'Circuit analysis, signals, and electromagnetism. Unlocks after core mathematics.',
     3)
ON CONFLICT (id) DO NOTHING;


-- ─── Skills: Mathematics ──────────────────────────────────────────────────────
-- The first four have no prerequisites and are immediately accessible.
-- The last four are gated by prerequisites (seeded below).

INSERT INTO skills (id, num, label, accent_key, subject_id, sort_order) VALUES
    ('arithmetic', 'I',    'Arithmetic & Number Sense', 'green',  'mathematics', 1),
    ('algebra',    'II',   'Algebra',                   'accent', 'mathematics', 2),
    ('trig',       'III',  'Trigonometry',              'gold',   'mathematics', 3),
    ('vectors',    'IV',   'Vectors & Geometry',        'blue',   'mathematics', 4),
    ('calculus',   'V',    'Calculus',                  'accent', 'mathematics', 5),
    ('linalg',     'VI',   'Linear Algebra',            'blue',   'mathematics', 6),
    ('diffeq',     'VII',  'Differential Equations',    'gold',   'mathematics', 7),
    ('prob',       'VIII', 'Probability & Statistics',  'green',  'mathematics', 8)
ON CONFLICT (id) DO NOTHING;


-- ─── Skills: Programming ──────────────────────────────────────────────────────
-- No prerequisites — runs in parallel with Mathematics from day one.
-- IDs match the aptiSkillId mappings in python-lab-data.js.

INSERT INTO skills (id, num, label, accent_key, subject_id, sort_order) VALUES
    ('prog-python-basics',    'Py.I',   'Python Basics',    'green', 'programming', 10),
    ('prog-data-structures',  'Py.II',  'Data Structures',  'green', 'programming', 11),
    ('prog-algorithms',       'Py.III', 'Algorithms',       'green', 'programming', 12),
    ('prog-projects',         'Py.IV',  'Projects',         'green', 'programming', 13)
ON CONFLICT (id) DO NOTHING;


-- ─── Skills: Electrical Engineering ──────────────────────────────────────────
-- Gated behind Calculus ≥ 70 (see prerequisites below).

INSERT INTO skills (id, num, label, accent_key, subject_id, sort_order) VALUES
    ('ee-dc-circuits',      '01', 'DC Circuits',      'blue', 'electrical_engineering', 101),
    ('ee-ac-circuits',      '02', 'AC Circuits',      'blue', 'electrical_engineering', 102),
    ('ee-circuit-analysis', '03', 'Circuit Analysis', 'blue', 'electrical_engineering', 103),
    ('ee-electromagnetism', '04', 'Electromagnetism', 'blue', 'electrical_engineering', 104),
    ('ee-signals',          '05', 'Signals',          'blue', 'electrical_engineering', 105)
ON CONFLICT (id) DO NOTHING;


-- ─── Sub-skills: Mathematics ──────────────────────────────────────────────────

INSERT INTO sub_skills (skill_id, label, sort_order) VALUES
    ('arithmetic', 'Fractions',      1),
    ('arithmetic', 'Ratios',         2),
    ('arithmetic', 'Percentages',    3),
    ('arithmetic', 'Number Systems', 4),
    ('algebra',    'Variables',      1),
    ('algebra',    'Equations',      2),
    ('algebra',    'Functions',      3),
    ('algebra',    'Logarithms',     4),
    ('trig',       'Unit Circle',    1),
    ('trig',       'Trig Functions', 2),
    ('trig',       'Identities',     3),
    ('trig',       'Waves',          4),
    ('vectors',    '2D/3D Space',    1),
    ('vectors',    'Dot Product',    2),
    ('vectors',    'Cross Product',  3),
    ('vectors',    'Transforms',     4),
    ('calculus',   'Limits',         1),
    ('calculus',   'Derivatives',    2),
    ('calculus',   'Integrals',      3),
    ('calculus',   'Applications',   4),
    ('linalg',     'Matrices',       1),
    ('linalg',     'Eigenvalues',    2),
    ('linalg',     'Systems',        3),
    ('linalg',     'Transforms',     4),
    ('diffeq',     'ODEs',           1),
    ('diffeq',     'PDEs',           2),
    ('diffeq',     'Modelling',      3),
    ('diffeq',     'Laplace',        4),
    ('prob',       'Distributions',  1),
    ('prob',       'Inference',      2),
    ('prob',       'Bayes',          3),
    ('prob',       'Data',           4)
ON CONFLICT DO NOTHING;


-- ─── Sub-skills: Programming ──────────────────────────────────────────────────

INSERT INTO sub_skills (skill_id, label, sort_order) VALUES
    ('prog-python-basics',   'Variables & Types',   1),
    ('prog-python-basics',   'Control Flow',        2),
    ('prog-python-basics',   'Functions',           3),
    ('prog-python-basics',   'Modules',             4),
    ('prog-data-structures', 'Lists & Tuples',      1),
    ('prog-data-structures', 'Dicts & Sets',        2),
    ('prog-data-structures', 'File I/O',            3),
    ('prog-data-structures', 'Error Handling',      4),
    ('prog-algorithms',      'Searching',           1),
    ('prog-algorithms',      'Sorting',             2),
    ('prog-algorithms',      'Recursion',           3),
    ('prog-algorithms',      'Complexity',          4),
    ('prog-projects',        'Data Analysis',       1),
    ('prog-projects',        'Visualisation',       2),
    ('prog-projects',        'Automation',          3)
ON CONFLICT DO NOTHING;


-- ─── Sub-skills: Electrical Engineering ──────────────────────────────────────

INSERT INTO sub_skills (skill_id, label, sort_order) VALUES
    ('ee-dc-circuits',      'Voltage & Current',    1),
    ('ee-dc-circuits',      'Resistance',           2),
    ('ee-dc-circuits',      'Ohm''s Law',           3),
    ('ee-dc-circuits',      'Kirchhoff''s Laws',    4),
    ('ee-ac-circuits',      'Sinusoids & Phasors',  1),
    ('ee-ac-circuits',      'Impedance',            2),
    ('ee-ac-circuits',      'AC Power',             3),
    ('ee-ac-circuits',      'Resonance',            4),
    ('ee-circuit-analysis', 'Node Voltage',         1),
    ('ee-circuit-analysis', 'Mesh Current',         2),
    ('ee-circuit-analysis', 'Thevenin''s Theorem',  3),
    ('ee-circuit-analysis', 'Superposition',        4),
    ('ee-electromagnetism', 'Electric Fields',      1),
    ('ee-electromagnetism', 'Magnetic Fields',      2),
    ('ee-electromagnetism', 'Faraday''s Law',       3),
    ('ee-electromagnetism', 'Maxwell''s Equations', 4),
    ('ee-signals',          'Fourier Analysis',     1),
    ('ee-signals',          'Sampling',             2),
    ('ee-signals',          'Filters',              3),
    ('ee-signals',          'Frequency Domain',     4)
ON CONFLICT DO NOTHING;


-- ─── Prerequisites ────────────────────────────────────────────────────────────
-- Each row is one required condition. Multiple rows for the same gated target
-- are AND-ed: ALL must be satisfied for the skill to unlock.

INSERT INTO prerequisites (gated_skill_id, gated_subject_id, required_skill_id, mastery_threshold) VALUES
    -- Calculus: requires Algebra ≥ 70
    ('calculus',  NULL, 'algebra',   70),

    -- Linear Algebra: requires Calculus ≥ 70 AND Vectors ≥ 70
    ('linalg',    NULL, 'calculus',  70),
    ('linalg',    NULL, 'vectors',   70),

    -- Differential Equations: requires Calculus ≥ 70
    ('diffeq',    NULL, 'calculus',  70),

    -- Probability & Statistics: requires Algebra ≥ 70
    ('prob',      NULL, 'algebra',   70),

    -- Electrical Engineering (all skills): requires Calculus ≥ 70
    (NULL, 'electrical_engineering', 'calculus', 70)

ON CONFLICT DO NOTHING;


-- ─── Mastery: seed chapter-level rows at 0 ────────────────────────────────────
-- One row per skill with sub_skill_id = NULL.
-- Uses WHERE NOT EXISTS because the NULL partial index cannot be targeted
-- by ON CONFLICT syntax in all PostgreSQL versions.

INSERT INTO mastery (skill_id, sub_skill_id, score)
SELECT s.id, NULL, 0
FROM skills s
WHERE NOT EXISTS (
    SELECT 1 FROM mastery m
    WHERE m.skill_id = s.id AND m.sub_skill_id IS NULL
);
