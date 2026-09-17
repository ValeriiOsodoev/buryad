from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import UTC, datetime
from pathlib import Path

from fastapi import Cookie, Depends, FastAPI, HTTPException, Response, status
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import (
    SESSION_COOKIE,
    clear_session_cookie,
    create_session,
    delete_session,
    get_current_user,
    hash_password,
    verify_password,
)
from .db import Base, engine, get_db
from .models import ExerciseProgress, User, VideoAttempt

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web"


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(engine)
    yield


app = FastAPI(title="Buryad", docs_url=None, redoc_url=None, lifespan=lifespan)
app.mount("/assets", StaticFiles(directory=WEB), name="assets")


class AuthPayload(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(default="", max_length=80)


class LoginPayload(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class ProgressPayload(BaseModel):
    exercise_id: str = Field(min_length=1, max_length=120)
    correct: bool
    answer: str = Field(default="", max_length=2000)


class ProgressMergeItem(BaseModel):
    exercise_id: str = Field(min_length=1, max_length=120)
    attempts: int = Field(default=0, ge=0, le=100000)
    correct: int = Field(default=0, ge=0, le=100000)
    streak: int = Field(default=0, ge=0, le=100000)
    last_answer: str = Field(default="", max_length=2000)


class ProgressMergePayload(BaseModel):
    items: list[ProgressMergeItem] = Field(default_factory=list, max_length=1000)


class VideoPayload(BaseModel):
    video_id: str = Field(min_length=1, max_length=80)
    answer: str = Field(min_length=1, max_length=5000)
    score: int = Field(ge=0, le=100)


def user_out(user: User) -> dict[str, object]:
    return {"id": user.id, "email": user.email, "display_name": user.display_name}


def progress_row_out(row: ExerciseProgress) -> dict[str, object]:
    return {
        "exercise_id": row.exercise_id,
        "status": row.status,
        "attempts": row.attempts,
        "correct": row.correct,
        "streak": row.streak,
        "last_answer": row.last_answer,
        "updated_at": row.updated_at.isoformat(),
    }


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/auth/register")
def register(payload: AuthPayload, response: Response, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        display_name=payload.display_name.strip(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    create_session(db, user, response)
    return {"user": user_out(user)}


@app.post("/api/auth/login")
def login(payload: LoginPayload, response: Response, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    user = db.scalar(select(User).where(User.email == email))
    if not user or not verify_password(user.password_hash, payload.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Wrong email or password",
        )
    create_session(db, user, response)
    return {"user": user_out(user)}


@app.post("/api/auth/logout")
def logout(
    response: Response,
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE),
    db: Session = Depends(get_db),
):
    delete_session(db, session_token)
    clear_session_cookie(response)
    return {"ok": True}


@app.get("/api/me")
def me(user: User = Depends(get_current_user)):
    return {"user": user_out(user)}


@app.get("/api/progress")
def progress(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(ExerciseProgress).where(ExerciseProgress.user_id == user.id)
    ).all()
    return {"items": [progress_row_out(row) for row in rows]}


@app.post("/api/progress")
def save_progress(
    payload: ProgressPayload,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.scalar(
        select(ExerciseProgress).where(
            ExerciseProgress.user_id == user.id,
            ExerciseProgress.exercise_id == payload.exercise_id,
        )
    )
    if not row:
        row = ExerciseProgress(
            user_id=user.id,
            exercise_id=payload.exercise_id,
            attempts=0,
            correct=0,
            streak=0,
            status="learning",
        )
        db.add(row)
    row.attempts += 1
    row.correct += int(payload.correct)
    row.streak = row.streak + 1 if payload.correct else 0
    row.status = "mastered" if row.streak >= 5 else "learning"
    row.last_answer = payload.answer
    row.updated_at = datetime.now(UTC)
    db.commit()
    return {"ok": True, "status": row.status, "streak": row.streak}


@app.post("/api/progress/merge")
def merge_progress(
    payload: ProgressMergePayload,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not payload.items:
        return {"ok": True, "merged": 0}
    existing = {
        row.exercise_id: row
        for row in db.scalars(
            select(ExerciseProgress).where(ExerciseProgress.user_id == user.id)
        ).all()
    }
    merged = 0
    for item in payload.items:
        if not item.attempts and not item.correct and not item.last_answer:
            continue
        row = existing.get(item.exercise_id)
        if not row:
            row = ExerciseProgress(
                user_id=user.id,
                exercise_id=item.exercise_id,
                attempts=0,
                correct=0,
                streak=0,
                status="learning",
            )
            db.add(row)
            existing[item.exercise_id] = row
        row.attempts += item.attempts
        row.correct += min(item.correct, item.attempts)
        row.streak = max(row.streak, item.streak)
        row.status = "mastered" if row.streak >= 5 else "learning"
        if item.last_answer:
            row.last_answer = item.last_answer
        row.updated_at = datetime.now(UTC)
        merged += 1
    db.commit()
    return {"ok": True, "merged": merged}


@app.post("/api/video-attempts")
def save_video_attempt(
    payload: VideoPayload,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.add(
        VideoAttempt(
            user_id=user.id,
            video_id=payload.video_id,
            answer=payload.answer,
            score=payload.score,
        )
    )
    db.commit()
    return {"ok": True}


@app.get("/")
def index() -> FileResponse:
    return FileResponse(WEB / "index.html")


@app.get("/{path:path}")
def spa_fallback(path: str) -> FileResponse:
    target = WEB / path
    if target.is_file():
        return FileResponse(target)
    return FileResponse(WEB / "index.html")
