import os
from uuid import uuid4

os.environ["DATABASE_URL"] = "sqlite:////tmp/test-buryad.db"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


def new_email(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex}@example.com"


def test_healthz():
    with TestClient(app) as client:
        response = client.get("/healthz")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


def test_registration_rejects_short_password():
    with TestClient(app) as client:
        response = client.post(
            "/api/auth/register",
            json={"email": new_email("short"), "password": "short", "display_name": "A"},
        )
        assert response.status_code == 422


def test_registered_user_can_persist_progress():
    with TestClient(app, base_url="https://testserver") as client:
        email = new_email("progress")
        response = client.post(
            "/api/auth/register",
            json={"email": email, "password": "correct-horse", "display_name": "Learner"},
        )
        assert response.status_code == 200
        assert client.get("/api/me").json()["user"]["email"] == email

        saved = client.post(
            "/api/progress",
            json={"exercise_id": "core-1", "correct": True, "answer": "Тиимэ, һайн"},
        )
        assert saved.status_code == 200

        progress = client.get("/api/progress")
        assert progress.status_code == 200
        assert progress.json()["items"][0]["exercise_id"] == "core-1"
        assert progress.json()["items"][0]["correct"] == 1


def test_progress_is_isolated_between_users():
    with TestClient(app, base_url="https://testserver") as first:
        first.post(
            "/api/auth/register",
            json={"email": new_email("first"), "password": "correct-horse", "display_name": "A"},
        )
        first.post(
            "/api/progress",
            json={"exercise_id": "private-progress", "correct": True, "answer": "Һайн"},
        )
        assert any(
            item["exercise_id"] == "private-progress"
            for item in first.get("/api/progress").json()["items"]
        )

    with TestClient(app, base_url="https://testserver") as second:
        second.post(
            "/api/auth/register",
            json={"email": new_email("second"), "password": "correct-horse", "display_name": "B"},
        )
        assert all(
            item["exercise_id"] != "private-progress"
            for item in second.get("/api/progress").json()["items"]
        )


def test_logout_invalidates_session():
    with TestClient(app, base_url="https://testserver") as client:
        client.post(
            "/api/auth/register",
            json={"email": new_email("logout"), "password": "correct-horse", "display_name": "A"},
        )
        assert client.get("/api/me").status_code == 200
        assert client.post("/api/auth/logout").status_code == 200
        assert client.get("/api/me").status_code == 401
