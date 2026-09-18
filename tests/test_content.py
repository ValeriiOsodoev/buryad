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


def test_corpus_leading_verbs_match_ud_order():
    verbs = json.loads((ROOT / "web/data/verbs.json").read_text(encoding="utf-8"))
    assert [verb["infinitive"] for verb in verbs[:10]] == [
        "гэхэ", "байха", "болохо", "ерэхэ", "ябаха",
        "хэхэ", "гараха", "ошохо", "хүдэлхэ", "абаха",
    ]


def test_exercises_have_unique_ids_and_answers():
    lessons = json.loads((ROOT / "web/data/lessons.json").read_text(encoding="utf-8"))
    ids = []
    for lesson in lessons:
        for exercise in lesson["exercises"]:
            ids.append(exercise["id"])
            assert exercise["answers"]
    assert len(ids) == len(set(ids))
    assert len(ids) >= 30


def test_beginner_course_has_required_size_and_schema():
    course = json.loads((ROOT / "web/data/course.json").read_text(encoding="utf-8"))
    assert len(course) >= 12
    ids: list[str] = []
    pairs: set[tuple[str, str]] = set()
    total = 0
    for module in course:
        phrases = module["phrases"]
        assert module["id"]
        assert module["title"]
        assert module["description"]
        assert 4 <= len(phrases) <= 25
        dialogue_count = 0
        for phrase in phrases:
            total += 1
            ids.append(phrase["id"])
            assert phrase["ru"].strip()
            assert phrase["bxr"].strip()
            assert isinstance(phrase["alternatives"], list)
            assert isinstance(phrase["new"], list)
            assert phrase["hint"].strip()
            assert phrase["skeleton"].strip()
            pair = (phrase["ru"].strip().lower(), phrase["bxr"].strip().lower())
            assert pair not in pairs
            pairs.add(pair)
            if phrase.get("dialogue"):
                dialogue_count += 1
                assert phrase["dialogue"]["promptRu"].strip()
        assert dialogue_count >= 4
    assert total >= 200
    assert len(ids) == len(set(ids))


def test_phrase_audio_manifest_only_references_known_course_phrases():
    course = json.loads((ROOT / "web/data/course.json").read_text(encoding="utf-8"))
    audio = json.loads((ROOT / "web/data/audio.json").read_text(encoding="utf-8"))
    phrase_ids = {
        phrase["id"]
        for module in course
        for phrase in module["phrases"]
    }
    assert isinstance(audio, dict)
    for phrase_id, entry in audio.items():
        assert phrase_id in phrase_ids
        assert isinstance(entry, dict)
        assert isinstance(entry.get("verified"), bool)
        assert entry.get("speaker", "").strip()
        assert entry.get("source", "").strip()
        if entry["verified"]:
            assert entry.get("src", "").startswith("/assets/audio/phrases/")
            if entry.get("cueSrc"):
                assert entry["cueSrc"].startswith("/assets/audio/phrases/")


def test_video_seeds_are_youtube_ids():
    videos = json.loads((ROOT / "web/data/videos.json").read_text(encoding="utf-8"))
    assert len(videos) >= 3
    assert all(len(video["youtubeId"]) == 11 for video in videos)


def test_frequency_core_has_practical_corpus_and_phrase_layers():
    core = json.loads((ROOT / "web/data/core.json").read_text(encoding="utf-8"))
    assert len(core["everyday"]) == 50
    assert len(core["corpus"]) >= 15
    assert len(core["phrases"]) >= 30
    assert core["corpus"][0]["word"] == "гэжэ"
    phrase_words = {item["word"] for item in core["phrases"]}
    assert "Би ойлгоногүйб." in phrase_words
    assert "Буряадаар хэлэ." in phrase_words


def test_learning_shell_has_mobile_nav_labels_and_explicit_continue():
    html = (ROOT / "web/index.html").read_text(encoding="utf-8")
    assert 'class="mobile-nav"' in html
    assert 'id="continueExercise"' in html
    assert 'aria-live="polite"' in html
    assert '<label for="email">Email</label>' in html
    assert '<label for="password">Пароль</label>' in html
    assert 'id="passwordToggle"' in html
    assert 'viewport-fit=cover' in html
    assert 'href="/grammar"' in html


def test_beginner_course_shell_has_modules_hints_audio_and_explicit_continue():
    html = (ROOT / "web/index.html").read_text(encoding="utf-8")
    for required_id in (
        "course",
        "courseModuleList",
        "courseModuleSelect",
        "coursePrompt",
        "courseAnswer",
        "courseHint",
        "courseHelp",
        "courseCheck",
        "courseContinue",
        "courseFeedback",
        "courseProgressBar",
        "courseOverall",
        "courseAudioStatus",
        "courseListen",
        "courseListenSlow",
        "courseRecord",
        "courseStopRecord",
        "courseReplayOwn",
        "courseDeleteOwn",
        "courseRecordStatus",
    ):
        assert f'id="{required_id}"' in html
    assert '<label class="field-label" id="courseAnswerLabel" for="courseAnswer">' in html
    assert 'href="#course"' in html
    assert '/assets/css/course.css' in html


def test_grammar_reference_has_separate_quick_topics():
    grammar = json.loads((ROOT / "web/data/grammar.json").read_text(encoding="utf-8"))
    topics = grammar["topics"]
    assert len(topics) >= 8
    slugs = [topic["slug"] for topic in topics]
    assert len(slugs) == len(set(slugs))
    required = {"vowels", "pronouns", "possessive", "cases", "verbs", "questions", "word-order"}
    assert required <= set(slugs)
    for topic in topics:
        assert topic["title"].strip()
        assert topic["summary"].strip()
        assert len(topic["sections"]) >= 2
        assert topic["sources"]
        for section in topic["sections"]:
            assert section["title"].strip()
            assert section["body"].strip()


def test_grammar_shell_has_navigation_search_and_home_link():
    html = (ROOT / "web/grammar.html").read_text(encoding="utf-8")
    assert 'id="grammarNav"' in html
    assert 'id="grammarSearch"' in html
    assert 'id="grammarContent"' in html
    assert 'href="/"' in html
    assert '/assets/css/grammar.css' in html
    assert '/assets/js/grammar.js' in html


def test_feedback_shell_explains_public_issues_and_requires_auth():
    html = (ROOT / "web/feedback.html").read_text(encoding="utf-8")
    assert "Предложения и Issues" in html
    assert 'id="issuesList"' in html
    assert 'id="feedbackForm"' in html
    assert 'id="feedbackAuthGate"' in html
    assert "GitHub" in html
    assert "публич" in html.lower()
    assert "/assets/js/feedback.js" in html


def test_support_page_explains_noncommercial_status_and_donation_methods():
    html = (ROOT / "web/support.html").read_text(encoding="utf-8")
    assert "полностью некоммерческий" in html.lower()
    assert "Boosty" in html
    assert "крипт" in html.lower()
    assert 'id="supportMethods"' in html
    assert '/assets/js/support.js' in html
    assert '/assets/css/support.css' in html
