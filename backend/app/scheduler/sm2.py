"""
SM-2 spaced repetition scheduler and mastery delta calculator.
All pure functions — no I/O, no database, fully unit-testable.
"""

from dataclasses import dataclass
from datetime import date, timedelta
from typing import TypedDict


# ─── Types ────────────────────────────────────────────────────────────────────

@dataclass
class CardState:
    interval: int    # days until next review
    ease: float      # ease factor, floor 1.3
    due_date: date


class GradedOpen(TypedDict):
    question_id: str
    intuition: float   # 0.0–1.0
    method: float      # 0.0–1.0
    accuracy: float    # 0.0–1.0
    verdict: str       # 'mastered' | 'fragile' | 'misunderstood'
    feedback: str


class GradedMCQ(TypedDict):
    question_id: str
    correct: bool


# ─── SM-2 core ────────────────────────────────────────────────────────────────

EASE_FLOOR = 1.3

def next_interval(state: CardState, grade: int) -> CardState:
    """
    Compute next review schedule after a grade.
    grade: 0 = forgot, 1 = partial recall, 2 = mastered
    Returns a new CardState (original is not mutated).
    """
    if grade == 0:
        new_interval = 1
        new_ease = max(EASE_FLOOR, state.ease - 0.2)
    elif grade == 1:
        new_interval = max(2, round(state.interval * 1.2))  # floor 2: partial ≠ forgot
        new_ease = max(EASE_FLOOR, state.ease - 0.05)
    else:  # grade == 2
        new_interval = round(state.interval * state.ease)
        new_ease = state.ease + 0.1

    new_due = date.today() + timedelta(days=new_interval)
    return CardState(interval=new_interval, ease=new_ease, due_date=new_due)


# ─── Mastery delta ────────────────────────────────────────────────────────────

_BASELINE_SLOW_MULTIPLIER = 2.0  # response is "slow" if > 2× the per-question median

def _is_slow_relative_to_baseline(
    response_times: list[int],
    baselines: list[int],
) -> bool:
    """
    Returns True if the learner was consistently slow across questions.
    Slow = more than 2× the established median for that question.
    Requires at least one matched pair to make a judgment.
    """
    if not response_times or not baselines:
        return False

    pairs = list(zip(response_times, baselines))
    slow_count = sum(1 for t, b in pairs if b > 0 and t > b * _BASELINE_SLOW_MULTIPLIER)
    return slow_count > len(pairs) / 2


_PRACTICE_MULTIPLIER = {
    "unaided":           1.0,   # solved without help — full credit
    "hint_used":         0.9,   # needed a nudge — slight dampening
    "solution_revealed": 0.7,   # saw the answer — meaningful dampening
}


def mastery_delta(
    graded_results: list[GradedOpen],
    mcq_results: list[GradedMCQ],
    response_times: list[int],
    baselines: list[int],
    practice_outcome: str = "unaided",
) -> int:
    """
    Compute integer mastery point change after a session.
    Range: -10 to +15.

    graded_results:   LLM-scored open answers
    mcq_results:      code-scored MCQ answers
    response_times:   ms per question, in submission order
    baselines:        median ms from prior sessions (same length as response_times)
    practice_outcome: how the learner handled the practice problem
    """
    score = 0.0
    n = 0

    for r in graded_results:
        # Weight understanding over raw accuracy — spine of the whole system
        q = 0.5 * r["intuition"] + 0.3 * r["method"] + 0.2 * r["accuracy"]
        score += q
        n += 1

    for m in mcq_results:
        score += 1.0 if m["correct"] else 0.0
        n += 1

    if n == 0:
        return 0

    avg = score / n  # 0.0–1.0

    # Slow-but-correct signals fragile knowledge; dampen the gain
    fragile = _is_slow_relative_to_baseline(response_times, baselines)

    # Linear map: 0.0 → -15 (clamped to -10), 0.5 → 0, 1.0 → +15
    raw = (avg - 0.5) * 30
    if fragile and raw > 0:
        raw *= 0.6

    # Apply practice outcome multiplier — only dampens gains, never losses
    multiplier = _PRACTICE_MULTIPLIER.get(practice_outcome, 1.0)
    if raw > 0:
        raw *= multiplier

    return round(max(-10, min(15, raw)))
