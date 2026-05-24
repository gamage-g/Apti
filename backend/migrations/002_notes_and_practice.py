"""
Migration 002 — study notes and practice outcome tracking.

Creates: skill_notes table.
Alters:  sessions (adds practice_outcome column).

Run once:  python -m migrations.002_notes_and_practice
"""

import asyncio, os, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import asyncpg
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

SQL = """
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS practice_outcome TEXT DEFAULT 'unaided';

CREATE TABLE IF NOT EXISTS skill_notes (
    skill_id   TEXT PRIMARY KEY REFERENCES skills(id),
    content    TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
"""

async def main():
    url = os.environ["DATABASE_URL"]
    conn = await asyncpg.connect(url)
    try:
        await conn.execute(SQL)
        print("Migration 002 applied.")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
