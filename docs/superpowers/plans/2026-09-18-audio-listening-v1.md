# Buryad Audio & Listening V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add verified phrase-audio support, optional audio learning modes, local pronunciation recording, strict `bxr` browser-TTS detection, and a native-speaker audio-pack import path without fabricating pronunciation.

**Architecture:** Keep the existing FastAPI/static ES-module architecture. Add a data-only audio manifest, a pure audio capability/task helper module, and a focused recorder module backed by IndexedDB. Course UI consumes those modules while existing YouTube listening remains unchanged.

**Tech Stack:** Vanilla ES modules, MediaRecorder, IndexedDB, Web Speech API capability detection, Python manifest builder, pytest, Node tests, Playwright, Docker, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-18-audio-listening-v1-design.md`

## Global Constraints
- Never fall back to Russian, Kazakh, Mongolian, or any non-`bxr` TTS voice.
- Listening tasks require verified reference audio.
- Learner microphone recordings stay local in the browser in V1.
- Existing course, auth, progress, words, verbs and YouTube listening must continue working.
- Mobile must remain overflow-free at 320px and 390px.
- No new production secret is required.

---

### Task 1: Audio manifest and integrity validation

**Files:**
- Create: `web/data/audio.json`
- Modify: `tests/test_content.py`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- `audio.json` maps phrase ids to `{src,speaker,source,verified,license?,note?}`.

- [ ] Add content tests asserting every manifest id exists in `course.json`, verified entries have `src`, and local paths begin with `/assets/audio/phrases/`.
- [ ] Add an empty initial manifest `{}` so the product is honest before native recordings exist.
- [ ] Validate `audio.json` in CI.

### Task 2: Pure audio capability helpers

**Files:**
- Create: `web/js/audio.js`
- Modify: `tests/frontend.mjs`

**Interfaces:**
- `selectBuryatVoice(voices)` -> voice or null, accepting only language codes beginning `bxr`.
- `hasVerifiedAudio(audioMap, phraseId)` -> boolean.
- `makeAudioTask(phrase, mode, audioEntry)` -> task or null.

- [ ] Add Node assertions rejecting `ru-RU`, `kk-KZ`, `mn-MN` and accepting `bxr`/`bxr-RU`.
- [ ] Add assertions that unverified/missing audio cannot produce dictation tasks.
- [ ] Implement helpers without DOM dependencies.

### Task 3: Local pronunciation recorder

**Files:**
- Create: `web/js/recorder.js`

**Interfaces:**
- `createRecorderStore()` exposes `isSupported`, `start(phraseId)`, `stop()`, `get(phraseId)`, `remove(phraseId)`.
- Recordings use IndexedDB database `buryad-audio`, store `recordings`, key `phraseId`.

- [ ] Implement MediaRecorder lifecycle with explicit unsupported-state handling.
- [ ] Store Blob plus mime type and timestamp locally after stop.
- [ ] Return object URLs only at UI boundary; revoke replaced URLs.

### Task 4: Course audio controls

**Files:**
- Modify: `web/js/course-ui.js`
- Modify: `web/js/app.js`
- Modify: `web/index.html`
- Modify: `web/css/styles.css`

**Interfaces:**
- Course controller receives `audioMap`.
- Reference playback uses file audio when verified; otherwise may use a selected real `bxr` SpeechSynthesis voice.
- Recording controls operate on the current phrase.

- [ ] Load `/assets/data/audio.json` in app bootstrap.
- [ ] Add compact reference controls: `Слушать`, `0.8×`, and honest “эталонной записи пока нет” state.
- [ ] Add `Записать себя`, `Стоп`, `Прослушать себя`, `Удалить` controls.
- [ ] Keep microphone permission request user-initiated only.
- [ ] Ensure playback/recording never auto-advance course state.

### Task 5: Optional audio task generation

**Files:**
- Modify: `web/js/course.js`
- Modify: `web/js/course-ui.js`
- Modify: `tests/frontend.mjs`

**Interfaces:**
- `buildCourseSession(..., audioMap?)` can include `dictation` and `audio-response` only for verified audio.
- Existing sessions remain unchanged when manifest is empty.

- [ ] Add tests proving empty manifest generates no audio tasks.
- [ ] Add tests proving verified audio enables dictation after recall has been attempted.
- [ ] Render dictation prompt without exposing Buryat text before answer.

### Task 6: Native-speaker audio pack importer

**Files:**
- Create: `scripts/build_audio_manifest.py`
- Create: `tests/test_audio_manifest_builder.py`

**Interfaces:**
- CLI: `python scripts/build_audio_manifest.py <recordings-dir> --course web/data/course.json --output web/data/audio.json --speaker "Name" --source "Native speaker recording"`.
- Accept extensions `.mp3`, `.wav`, `.ogg`, `.m4a`.

- [ ] Test rejection of unknown phrase ids.
- [ ] Test deterministic manifest generation for known ids.
- [ ] Copy files is not performed by script; it validates naming and generates `/assets/audio/phrases/<filename>` paths.

### Task 7: Responsive browser coverage

**Files:**
- Modify: `tests/e2e.spec.mjs`

**Interfaces:**
- Existing `E2E_BASE_URL` flow remains.

- [ ] At 390px verify honest no-reference state, recording button and no overflow.
- [ ] At 320px verify recording controls wrap with no horizontal overflow.
- [ ] On desktop verify no native audio reference control appears when manifest is empty, while recording remains available/unsupported honestly depending browser capability.

### Task 8: PR, CI and production deployment

**Files:** none unless verification reveals a real issue.

- [ ] Open PR from `audio-listening-v1` to `main`.
- [ ] Require green ruff, pytest, Node, JSON validation, Docker build and Playwright.
- [ ] Review diff for accidental fake-TTS fallback or microphone upload.
- [ ] Merge only after green PR checks.
- [ ] Verify `main` workflow and public `https://buryad.buuzoed.dev/healthz` plus homepage response.
