from __future__ import annotations

import os

import httpx

REPO = "ValeriiOsodoev/buryad"
API_URL = f"https://api.github.com/repos/{REPO}/issues"


class GitHubIssueError(RuntimeError):
    pass


def issue_bridge_enabled() -> bool:
    return bool(os.getenv("GITHUB_ISSUES_TOKEN", "").strip())


def create_github_issue(title: str, body: str) -> dict[str, object]:
    token = os.getenv("GITHUB_ISSUES_TOKEN", "").strip()
    if not token:
        raise GitHubIssueError("GitHub Issues token is not configured")

    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "buryad-feedback",
    }
    try:
        response = httpx.post(
            API_URL,
            headers=headers,
            json={"title": title, "body": body},
            timeout=10.0,
        )
    except httpx.HTTPError as exc:
        raise GitHubIssueError("GitHub request failed") from exc

    if response.status_code != 201:
        raise GitHubIssueError(f"GitHub returned {response.status_code}")

    data = response.json()
    return {
        "number": int(data["number"]),
        "url": str(data["html_url"]),
        "title": str(data["title"]),
    }
