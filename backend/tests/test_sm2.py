"""
Unit tests for the SM-2 scheduler and mastery_delta.
No database, no network — runs instantly with: pytest
"""

from datetime import date, timedelta
import pytest

from app.scheduler.sm2 import CardState, next_interval, mastery_delta


# ─── Helpers ──────────────────────────────────────────────────────────────────

def fresh_card(interval=4, ease=2.5) -> CardState:
    return CardState(interval=interval, ease=ease, due_date=date.today())


# ─── next_interval: grade 0 (forgot) ──────────────────────────────────────────

def test_forgot_resets_interval_to_one():
    result = next_interval(fresh_card(interval=10), grade=0)
    assert result.interval == 1

def test_forgot_reduces_ease():
    result = next_interval(fresh_card(ease=2.5), grade=0)
    assert abs(result.ease - 2.3) < 1e-9

def test_forgot_ease_floors_at_1_3():
    result = next_interval(fresh_card(ease=1.3), grade=0)
    assert result.ease == 1.3

def test_forgot_due_is_tomorrow():
    result = next_interval(fresh_card(), grade=0)
    assert result.due_date == date.today() + timedelta(days=1)


# ─── next_interval: grade 1 (partial) ────────────────────────────────────────

def test_partial_grows_interval_by_1_2x():
    result = next_interval(fresh_card(interval=10), grade=1)
    assert result.interval == 12  # round(10 * 1.2)

def test_partial_interval_minimum_is_one():
    result = next_interval(fresh_card(interval=0), grade=1)
    assert result.interval >= 1

def test_partial_reduces_ease_slightly():
    result = next_interval(fresh_card(ease=2.5), grade=1)
    assert abs(result.ease - 2.45) < 1e-9

def test_partial_ease_floors_at_1_3():
    result = next_interval(fresh_card(ease=1.3), grade=1)
    assert result.ease == 1.3


# ─── next_interval: grade 2 (mastered) ───────────────────────────────────────

def test_mastered_multiplies_interval_by_ease():
    result = next_interval(fresh_card(interval=4, ease=2.5), grade=2)
    assert result.interval == 10  # round(4 * 2.5)

def test_mastered_increases_ease():
    result = next_interval(fresh_card(ease=2.5), grade=2)
    assert abs(result.ease - 2.6) < 1e-9

def test_mastered_due_is_interval_days_away():
    result = next_interval(fresh_card(interval=4, ease=2.5), grade=2)
    assert result.due_date == date.today() + timedelta(days=10)

def test_does_not_mutate_original():
    original = fresh_card(interval=4, ease=2.5)
    _ = next_interval(original, grade=2)
    assert original.interval == 4
    assert original.ease == 2.5


# ─── mastery_delta ────────────────────────────────────────────────────────────

def _open(intuition, method, accuracy):
    return {
        "question_id": "q1",
        "intuition": intuition,
        "method": method,
        "accuracy": accuracy,
        "verdict": "mastered",
        "feedback": "Good.",
    }

def _mcq(correct: bool):
    return {"question_id": "q2", "correct": correct}


def test_perfect_session_gives_positive_delta():
    opens = [_open(1.0, 1.0, 1.0)]
    mcqs  = [_mcq(True)]
    delta = mastery_delta(opens, mcqs, [], [])
    assert delta > 0

def test_zero_session_gives_negative_delta():
    opens = [_open(0.0, 0.0, 0.0)]
    mcqs  = [_mcq(False)]
    delta = mastery_delta(opens, mcqs, [], [])
    assert delta < 0

def test_mid_session_gives_zero_delta():
    # avg = 0.5 → raw = 0 → delta = 0
    opens = [_open(0.5, 0.5, 0.5)]
    mcqs  = [_mcq(True), _mcq(False)]
    delta = mastery_delta(opens, mcqs, [], [])
    assert delta == 0

def test_delta_capped_at_plus_15():
    opens = [_open(1.0, 1.0, 1.0)] * 10
    delta = mastery_delta(opens, [], [], [])
    assert delta <= 15

def test_delta_floored_at_minus_10():
    opens = [_open(0.0, 0.0, 0.0)] * 10
    delta = mastery_delta(opens, [], [], [])
    assert delta >= -10

def test_empty_session_returns_zero():
    assert mastery_delta([], [], [], []) == 0

def test_slow_responses_dampen_positive_delta():
    opens = [_open(1.0, 1.0, 1.0)]
    fast_times     = [1000]
    slow_times     = [10000]
    baselines      = [1000]
    fast_delta = mastery_delta(opens, [], fast_times, baselines)
    slow_delta = mastery_delta(opens, [], slow_times, baselines)
    assert slow_delta < fast_delta

def test_slow_responses_do_not_dampen_negative_delta():
    # Being slow on wrong answers shouldn't compound the penalty
    opens = [_open(0.0, 0.0, 0.0)]
    slow_times = [10000]
    baselines  = [1000]
    delta = mastery_delta(opens, [], slow_times, baselines)
    assert delta >= -10
