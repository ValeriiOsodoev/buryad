import os
from uuid import uuid4

os.environ["DATABASE_URL"] = "sqlite:////tmp/test-buryad.db"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


def new_email(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex}@example.com"


def auth_payload(prefix: str, display_name: str) -> dict[str, str]:
    return {
        "email": new_email(prefix),
        "password": "correct-horse",
        "display_name": display_name,
    }


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
        first.post("/api/auth/register", json=auth_payload("first", "A"))
        first.post(
            "/api/progress",
            json={"exercise_id": "private-progress", "correct": True, "answer": "Һайн"},
        )
        assert any(
            item["exercise_id"] == "private-progress"
            for item in first.get("/api/progress").json()["items"]
        )
    with TestClient(app, base_url="https://testserver") as second:
        second.post("/api/auth/register", json=auth_payload("second", "B"))
        assert all(
            item["exercise_id"] != "private-progress"
            for item in second.get("/api/progress").json()["items"]
        )


def test_guest_progress_merge_is_scoped_and_idempotent():
    payload = {
        "items": [
            {
                "exercise_id": "guest-1",
                "attempts": 3,
                "correct": 2,
                "streak": 2,
                "last_answer": "Һайн",
            }
        ]
    }
    with TestClient(app, base_url="https://testserver") as first:
        first.post("/api/auth/register", json=auth_payload("merge", "A"))
        assert first.post("/api/progress/merge", json=payload).status_code == 200
        assert first.post("/api/progress/merge", json=payload).status_code == 200
        item = next(
            item
            for item in first.get("/api/progress").json()["items"]
            if item["exercise_id"] == "guest-1"
        )
        assert item["attempts"] == 3
        assert item["correct"] == 2
        assert item["last_answer"] == "Һайн"

    with TestClient(app, base_url="https://testserver") as second:
        second.post("/api/auth/register", json=auth_payload("merge-other", "B"))
        assert all(
            item["exercise_id"] != "guest-1"
            for item in second.get("/api/progress").json()["items"]
        )


def test_logout_invalidates_session():
    with TestClient(app, base_url="https://testserver") as client:
        client.post("/api/auth/register", json=auth_payload("logout", "A"))
        assert client.get("/api/me").status_code == 200
        assert client.post("/api/auth/logout").status_code == 200
        assert client.get("/api/me").status_code == 401


def test_grammar_routes_serve_reference_shell():
    with TestClient(app) as client:
        for path in ("/grammar", "/grammar/", "/grammar/vowels", "/grammar/possessive"):
            response = client.get(path)
            assert response.status_code == 200
            assert "Грамматика бурятского" in response.text
