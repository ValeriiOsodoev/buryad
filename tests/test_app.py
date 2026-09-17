import os

os.environ["DATABASE_URL"] = "sqlite:////tmp/test-buryad.db"

from fastapi.testclient import TestClient

from app.main import app


def test_healthz():
    with TestClient(app) as client:
        response = client.get("/healthz")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


def test_registration_rejects_short_password():
    with TestClient(app) as client:
        response = client.post(
            "/api/auth/register",
            json={"email": "a@example.com", "password": "short", "display_name": "A"},
        )
        assert response.status_code == 422
