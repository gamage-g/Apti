"""
Pydantic schemas for Apti AI responses.
Used to validate the structured JSON returned by the Lecturer and other roles.
"""

from pydantic import BaseModel


class BuildStep(BaseModel):
    step: str
    why: str
    generate_prompt: str | None = None
    generate_answer: str | None = None


class WorkedExample(BaseModel):
    problem: str
    reasoning: list[str]
    answer: str


class Practice(BaseModel):
    problem: str
    hints: list[str]
    solution: str


class RecallItem(BaseModel):
    q: str
    a: str


class KeyTerm(BaseModel):
    term: str
    meaning: str


class LessonStages(BaseModel):
    hook: str
    intuition: str
    analogy: str
    build: list[BuildStep]
    worked: WorkedExample
    practice: Practice
    recall: list[RecallItem]


class StagedLesson(BaseModel):
    topic: str
    stages: LessonStages
    key_terms: list[KeyTerm]
    watch_out: str
    connections: str


# ─── Examiner schemas ─────────────────────────────────────────────────────────

class QuizQuestion(BaseModel):
    id: str
    layer: str
    type: str
    prompt: str
    options: list[str] | None = None
    correct_index: int | None = None
    model_answer: str | None = None
    explanation: str


class Quiz(BaseModel):
    questions: list[QuizQuestion]


# ─── Grader schemas ───────────────────────────────────────────────────────────

class GradeResult(BaseModel):
    question_id: str
    intuition: float
    method: float
    accuracy: float
    verdict: str
    feedback: str


class GradeResponse(BaseModel):
    results: list[GradeResult]


# ─── Cartographer schemas ─────────────────────────────────────────────────────

class CartographerCard(BaseModel):
    id: str
    skill: str
    front: str
    back: str
    initial_interval_days: int = 1


class CartographerResponse(BaseModel):
    cards: list[CartographerCard]


# ─── Gatekeeper schemas ───────────────────────────────────────────────────────

class GatekeeperResponse(BaseModel):
    unlock: bool
    confidence: float
    message: str
    focus_if_held: list[str] = []
