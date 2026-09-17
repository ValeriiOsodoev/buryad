import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_has_50_verbs():
    verbs = json.loads((ROOT / "web/data/verbs.json").read_text(encoding="utf-8"))
    assert len(verbs) == 50
    assert [v["rank"] for v in verbs] == list(range(1, 51))
    for verb in verbs:
        assert all(
            verb[key]
            for key in ("infinitive", "ru", "present", "past", "future", "imperative")
        )


def test_exercises_have_unique_ids_and_answers():
    lessons = json.loads((ROOT / "web/data/lessons.json").read_text(encoding="utf-8"))
    ids = []
    for lesson in lessons:
        for exercise in lesson["exercises"]:
            ids.append(exercise["id"])
            assert exercise["answers"]
    assert len(ids) == len(set(ids))
    assert len(ids) >= 30


def test_video_seeds_are_youtube_ids():
    videos = json.loads((ROOT / "web/data/videos.json").read_text(encoding="utf-8"))
    assert len(videos) >= 3
    assert all(len(video["youtubeId"]) == 11 for video in videos)


def test_frequency_core_has_practical_and_corpus_layers():
    core = json.loads((ROOT / "web/data/core.json").read_text(encoding="utf-8"))
    assert len(core["everyday"]) == 50
    assert len(core["corpus"]) >= 15
    assert core["corpus"][0]["word"] == "гэжэ"
    assert core["corpus"][0]["rank"] == 1
