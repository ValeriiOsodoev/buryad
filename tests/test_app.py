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


def test_feedback_page_is_public():
    with TestClient(app) as client:
        response = client.get("/feedback")
        assert response.status_code == 200
        assert "Предложения и Issues" in response.text


def test_feedback_submission_requires_authentication():
    with TestClient(app, base_url="https://testserver") as client:
        response = client.post(
            "/api/feedback",
            json={"kind":"idea","title":"Новая идея","description":"Подробное описание идеи"},
        )
        assert response.status_code == 401


def test_authenticated_feedback_creates_public_issue_without_email(monkeypatch):
    captured = {}

    def fake_create_issue(title: str, body: str):
        captured["title"] = title
        captured["body"] = body
        return {
            "number": 123,
            "url": "https://github.com/ValeriiOsodoev/buryad/issues/123",
            "title": title,
        }

    monkeypatch.setattr("app.main.create_github_issue", fake_create_issue)

    with TestClient(app, base_url="https://testserver") as client:
        payload = auth_payload("feedback", "Learner")
        email = payload["email"]
        assert client.post("/api/auth/register", json=payload).status_code == 200
        response = client.post(
            "/api/feedback",
            json={
                "kind": "language",
                "title": "Исправить форму үрэмнай",
                "description": "Предлагаю уточнить объяснение притяжательной формы.",
                "page_url": "/grammar/possessive",
                "current_text": "үрэмнэй",
                "proposed_text": "үрэмнай",
                "source": "Учебная грамматика",
            },
        )
        assert response.status_code == 200
        assert response.json()["issue"]["number"] == 123
        assert "[Исправление языка]" in captured["title"]
        assert "үрэмнай" in captured["body"]
        assert email not in captured["body"]


def test_feedback_status_reports_issue_bridge_state(monkeypatch):
    monkeypatch.delenv("GITHUB_ISSUES_TOKEN", raising=False)
    with TestClient(app) as client:
        response = client.get("/api/feedback/status")
        assert response.status_code == 200
        assert response.json() == {"enabled": False}


def test_support_page_is_public():
    with TestClient(app) as client:
        response = client.get("/support")
        assert response.status_code == 200
        assert "Поддержать проект" in response.text
