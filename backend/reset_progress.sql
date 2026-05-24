-- Reset all learner progress to zero.
-- Keeps skills, sub_skills, subjects, prerequisites intact.
-- Run this when you want a completely fresh start.

TRUNCATE
    card_reviews,
    cards,
    session_answers,
    session_questions,
    sessions,
    mastery,
    skill_notes
RESTART IDENTITY CASCADE;

-- Re-seed mastery at 0 for every skill
INSERT INTO mastery (skill_id, sub_skill_id, score)
SELECT s.id, NULL, 0
FROM skills s;
