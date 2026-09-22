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


def test_speaking_scenarios_reference_known_course_phrases():
    course = json.loads((ROOT / "web/data/course.json").read_text(encoding="utf-8"))
    speaking = json.loads((ROOT / "web/data/speaking.json").read_text(encoding="utf-8"))
    phrase_ids = {
        phrase["id"]
        for module in course
        for phrase in module["phrases"]
    }
    scenarios = speaking["scenarios"]
    assert len(scenarios) >= 7
    assert sum(len(item["steps"]) for item in scenarios) >= 28
    for scenario in scenarios:
        assert scenario["title"].strip()
        assert scenario["mood"].strip()
        assert len(scenario["steps"]) >= 4
        for step in scenario["steps"]:
            assert step["prompt"].strip()
            assert step["accept"]
            assert set(step["accept"]) <= phrase_ids


def test_speaking_mode_is_primary_and_loaded():
    html = (ROOT / "web/index.html").read_text(encoding="utf-8")
    for required_id in (
        "speaking",
        "speakingScenarioList",
        "speakingPrompt",
        "speakingAnswer",
        "speakingReveal",
        "speakingCheck",
        "speakingNext",
        "speakingFeedback",
    ):
        assert f'id="{required_id}"' in html
    assert 'href="#speaking"' in html
    assert '/assets/js/speaking.js' in html
    assert '/assets/css/speaking.css' in html


def test_automaticity_patterns_reference_known_course_phrases():
    course = json.loads((ROOT / "web/data/course.json").read_text(encoding="utf-8"))
    patterns = json.loads((ROOT / "web/data/patterns.json").read_text(encoding="utf-8"))
    phrase_ids = {
        phrase["id"]
        for module in course
        for phrase in module["phrases"]
    }
    assert len(patterns["sets"]) >= 6
    for pattern in patterns["sets"]:
        assert pattern["title"].strip()
        assert len(pattern["items"]) >= 2
        assert set(pattern["items"]) <= phrase_ids


def test_content_quality_policy_has_review_lifecycle():
    quality = json.loads((ROOT / "web/data/content-quality.json").read_text(encoding="utf-8"))
    assert quality["policy"]["statuses"] == ["draft", "sourced", "native-reviewed", "verified"]
    assert quality["course"]["verified_phrase_ids"] == []
    assert quality["audio"]["require_native_recording_for_verified"] is True


def test_daily_ritual_shell_and_script_are_present():
    html = (ROOT / "web/index.html").read_text(encoding="utf-8")
    for required_id in (
        "daily",
        "dailySummary",
        "dailyContext",
        "dailyProgressBar",
        "dailySteps",
        "dailyReset",
    ):
        assert f'id="{required_id}"' in html
    assert 'href="#daily"' in html
    assert '/assets/js/daily.js' in html


def test_speaking_scenarios_cover_all_core_everyday_domains():
    speaking = json.loads((ROOT / "web/data/speaking.json").read_text(encoding="utf-8"))
    ids = {scenario["id"] for scenario in speaking["scenarios"]}
    assert {
        "meet", "where", "home", "tea", "plans", "move",
        "shop", "work", "phone", "help", "state", "survival",
    } <= ids
    assert sum(len(item["steps"]) for item in speaking["scenarios"]) >= 50


def test_eight_week_progression_references_known_modules_and_scenarios():
    course = json.loads((ROOT / "web/data/course.json").read_text(encoding="utf-8"))
    speaking = json.loads((ROOT / "web/data/speaking.json").read_text(encoding="utf-8"))
    progression = json.loads((ROOT / "web/data/progression.json").read_text(encoding="utf-8"))
    module_ids = {module["id"] for module in course}
    scenario_ids = {scenario["id"] for scenario in speaking["scenarios"]}
    assert len(progression["weeks"]) == 8
    for week in progression["weeks"]:
        assert week["title"].strip()
        assert week["focus"].strip()
        assert set(week["modules"]) <= module_ids
        assert set(week["scenarios"]) <= scenario_ids
        assert len(week["checkpoint"]["prompts"]) >= 4


def test_index_has_no_literal_backslash_newline_artifacts():
    html = (ROOT / "web/index.html").read_text(encoding="utf-8")
    assert "\\n" not in html
    assert 'id="daily"' in html
    assert 'id="path"' in html
    assert '/assets/js/progression.js' in html


def test_late_weeks_reduce_russian_with_buryat_prompts():
    progression = json.loads((ROOT / "web/data/progression.json").read_text(encoding="utf-8"))
    weeks = {week["week"]: week for week in progression["weeks"]}
    assert weeks[1]["immersionLevel"] == 0
    assert weeks[5]["immersionLevel"] >= 1
    assert weeks[7]["immersionLevel"] >= 2
    assert weeks[8]["immersionLevel"] == 3
    for number in (5, 6, 7, 8):
        checkpoint = weeks[number]["checkpoint"]
        assert len(checkpoint["bxrPrompts"]) == len(checkpoint["prompts"])
        assert checkpoint["help"]["primary"].strip()
        assert checkpoint["help"]["secondary"].strip()


def test_weekly_checkpoint_has_immersion_help_ui():
    html = (ROOT / "web/index.html").read_text(encoding="utf-8")
    for required_id in ("checkpointImmersion", "checkpointHelp", "checkpointHelpBox"):
        assert f'id="{required_id}"' in html


def test_immersion_scenes_have_context_help_and_small_vocab_load():
    data = json.loads((ROOT / "web/data/immersion.json").read_text(encoding="utf-8"))
    assert len(data["scenes"]) >= 3
    for scene in data["scenes"]:
        assert 1 <= len(scene["newWords"]) <= 7
        assert len(scene["steps"]) >= 6
        for step in scene["steps"]:
            assert step["cue"].strip()
            assert isinstance(step.get("help", []), list)
            if step["type"] == "respond":
                assert step["answers"]


def test_immersion_is_primary_learning_surface():
    html = (ROOT / "web/index.html").read_text(encoding="utf-8")
    for required_id in (
        "immersion", "immersionScenes", "immersionTitle", "immersionCue",
        "immersionVisual", "immersionChoices", "immersionAnswer",
        "immersionHelp", "immersionNext", "immersionVocab",
    ):
        assert f'id="{required_id}"' in html
    assert 'href="#immersion"' in html
    assert '/assets/js/immersion.js' in html


def test_immersion_scenes_are_primary_and_context_first():
    html = (ROOT / "web/index.html").read_text(encoding="utf-8")
    immersion = json.loads((ROOT / "web/data/immersion.json").read_text(encoding="utf-8"))
    assert 'id="immersion"' in html
    assert 'href="#immersion"' in html
    assert '/assets/js/immersion.js' in html
    assert len(immersion["scenes"]) >= 3
    for scene in immersion["scenes"]:
        assert len(scene["newWords"]) <= 7
        assert len(scene["steps"]) >= 6
        assert any(step["type"] == "respond" for step in scene["steps"])
        for step in scene["steps"]:
            assert step["cue"].strip()
            assert len(step.get("help", [])) <= 2


def test_daily_ritual_starts_with_living_scene():
    js = (ROOT / "web/js/daily.js").read_text(encoding="utf-8")
    live = js.index("id:'live'")
    review = js.index("id:'review'")
    assert live != -1 and review != -1 and live < review


def test_master_apprentice_product_spec_and_vocabulary_dataset():
    spec = (ROOT / "docs/master-apprentice-product-spec.md").read_text(encoding="utf-8")
    vocabulary = json.loads((ROOT / "web/data/vocabulary.json").read_text(encoding="utf-8"))
    assert "unseen → seen → recognized → active → automatic" in spec
    assert vocabulary["states"] == ["unseen", "seen", "recognized", "active", "automatic"]
    assert len(vocabulary["items"]) >= 9
    for item in vocabulary["items"]:
        assert item["id"].strip()
        assert item["bxr"].strip()
        assert item["domain"].strip()
        assert item["quality"] in {"draft", "sourced", "native-reviewed", "verified"}


def test_primary_navigation_keeps_reference_material_secondary():
    html = (ROOT / "web/index.html").read_text(encoding="utf-8")
    assert '<details class="library-menu">' in html
    assert 'id="my-words"' in html
    assert '/assets/js/vocabulary.js' in html
