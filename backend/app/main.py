from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.connection import init_pool, close_pool, get_settings
from app.routers import sessions, reviews, skills, push, subjects, notes


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    yield
    await close_pool()


app = FastAPI(title="Apti API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in get_settings().cors_origin.split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(sessions.router)
app.include_router(reviews.router)
app.include_router(skills.router)
app.include_router(push.router)
app.include_router(subjects.router)
app.include_router(notes.router)


@app.get("/health")
@app.get("/api/health")
async def health():
    return {"status": "ok"}
