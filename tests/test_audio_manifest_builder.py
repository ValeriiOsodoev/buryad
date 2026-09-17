import json
from pathlib import Path

import pytest

from scripts.build_audio_manifest import build_manifest


def write_course(path: Path) -> None:
    path.write_text(
        json.dumps(
            [
                {
                    "id": "intro",
                    "title": "Intro",
                    "description": "",
                    "phrases": [
                        {"id": "intro-01"},
                        {"id": "intro-02"},
                    ],
                }
            ]
        ),
        encoding="utf-8",
    )


def test_build_manifest_is_deterministic_and_uses_safe_asset_paths(tmp_path: Path):
    course = tmp_path / "course.json"
    recordings = tmp_path / "recordings"
    recordings.mkdir()
    write_course(course)
    (recordings / "intro-02.wav").write_bytes(b"wav")
    (recordings / "intro-01.mp3").write_bytes(b"mp3")
    (recordings / "notes.txt").write_text("ignore", encoding="utf-8")

    manifest = build_manifest(
        recordings,
        course,
        speaker="Speaker A",
        source="Native speaker recording",
        license_name="CC-BY-4.0",
    )

    assert list(manifest) == ["intro-01", "intro-02"]
    assert manifest["intro-01"] == {
        "src": "/assets/audio/phrases/intro-01.mp3",
        "speaker": "Speaker A",
        "source": "Native speaker recording",
        "verified": True,
        "license": "CC-BY-4.0",
    }


def test_build_manifest_rejects_unknown_phrase_ids(tmp_path: Path):
    course = tmp_path / "course.json"
    recordings = tmp_path / "recordings"
    recordings.mkdir()
    write_course(course)
    (recordings / "unknown-99.ogg").write_bytes(b"ogg")

    with pytest.raises(ValueError, match="unknown-99.ogg"):
        build_manifest(recordings, course, "Speaker A", "Studio")
