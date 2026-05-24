"""
Pydantic schemas for Apti AI responses.
Used to validate the structured JSON returned by the Lecturer and other roles.
"""

from pydantic import BaseModel


class BuildStep(BaseModel):
    step: str
    why: str


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
