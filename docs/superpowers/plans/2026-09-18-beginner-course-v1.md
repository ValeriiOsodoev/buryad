# Buryad Beginner Course V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a structured 12-module beginner course with 200+ everyday Buryat phrases, multiple retrieval modes, progressive hints and module progress while preserving existing tools and deployment.

**Architecture:** Keep FastAPI/PostgreSQL and the existing static ES-module frontend. Add a data-only course file and a pure `course.js` engine that turns phrases into tasks; wire a new course view into the current app and reuse existing progress, answer normalization and spaced review infrastructure.

**Tech Stack:** FastAPI, SQLAlchemy, PostgreSQL, vanilla ES modules, CSS, Node tests, Playwright, Docker, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-18-beginner-course-v1-design.md`

## Global Constraints
- At least 12 modules and 200 unique course phrase ids.
- No module contains more than 25 phrases.
- Course content stays data-only in `web/data/course.json`.
- New vocabulary is shown before recall use within its module.
- Existing orthographic tolerance in `normalizeBuryat` remains active.
- No hard module locks; recommended progression only.
- Existing Words, Verbs, Listen, auth and server progress must continue to work.
- Mobile must remain overflow-free at 320px and 390px.

---

### Task 1: Course content schema and validation

**Files:**
- Create: `web/data/course.json`
- Modify: `tests/test_content.py`

**Interfaces:**
- Produces a list of modules `{id,title,description,phrases}`.
- Each phrase produces `{id,ru,bxr,alternatives,new,hint,skeleton,note?,dialogue?}`.

- [ ] Add failing content tests asserting `>=12` modules, `>=200` phrases, unique ids, max 25 phrases/module and required fields.
- [ ] Run `pytest tests/test_content.py -q` and confirm failure because `course.json` does not exist.
- [ ] Add 12 modules and 200+ curated everyday phrases.
- [ ] Run content tests and JSON validation.

### Task 2: Pure course task engine

**Files:**
- Create: `web/js/course.js`
- Modify: `tests/frontend.mjs`

**Interfaces:**
- `flattenCourse(course)` -> phrases with `moduleId` and `moduleTitle`.
- `taskId(phraseId, mode)` -> `course:<phraseId>:<mode>`.
- `makeTask(phrase, mode)` -> task object compatible with the trainer.
- `nextHint(task, level)` -> `{level,text,revealed}`.
- `buildCourseSession(course, progress, nowMs, limit, moduleId?)` -> prioritized task array.

- [ ] Add failing Node assertions for stable ids, three hint levels and weak/due/new ordering.
- [ ] Run `node tests/frontend.mjs` and confirm module-not-found failure.
- [ ] Implement course helpers without DOM dependencies.
- [ ] Run Node tests and confirm pass.

### Task 3: Course view structure

**Files:**
- Modify: `web/index.html`
- Modify: `web/css/styles.css`
- Modify: `tests/test_content.py`

**Interfaces:**
- Add `#course` primary section, `#courseModuleList`, `#courseModuleSelect`, `#coursePrompt`, `#courseAnswer`, `#courseHint`, `#courseCheck`, `#courseContinue`, `#courseFeedback`, `#courseProgressBar`.

- [ ] Add structural assertions for course controls and accessible labels.
- [ ] Run targeted content tests and confirm failure.
- [ ] Add desktop module rail and mobile selector markup.
- [ ] Add responsive styles, focus states and compact mobile controls.
- [ ] Run content tests.

### Task 4: Wire course learning flow

**Files:**
- Modify: `web/js/app.js`

**Interfaces:**
- Load `/assets/data/course.json` with existing content.
- Build recommended session through `buildCourseSession`.
- Course task recording reuses existing `record()` with course task ids.

- [ ] Load course data and render module completion.
- [ ] Implement recall, meaning and dialogue prompts using the same exercise shell semantics.
- [ ] Implement progressive hint button: keyword -> skeleton -> reveal+incorrect.
- [ ] Keep explicit Continue; never auto-advance.
- [ ] Rebuild recommended session after completion and point to earliest unfinished module.
- [ ] Run Node tests.

### Task 5: Phrase-level progress and module summaries

**Files:**
- Modify: `web/js/course.js`
- Modify: `web/js/app.js`
- Modify: `tests/frontend.mjs`

**Interfaces:**
- `phraseProgress(phrase, progress)` -> `{attempted,mastered,contextAttempted}`.
- `moduleProgress(module, progress)` -> `{learned,total,percent}`.

- [ ] Add failing unit tests for phrase and module completion calculations.
- [ ] Implement pure progress helpers.
- [ ] Render percent/completion in desktop rail and mobile selector subtitle.
- [ ] Add “continue recommended module” behavior.
- [ ] Run Node tests.

### Task 6: Dialogue completion experience

**Files:**
- Modify: `web/data/course.json`
- Modify: `web/js/course.js`
- Modify: `web/js/app.js`

**Interfaces:**
- Dialogue-capable phrases expose `dialogue.promptRu`, optional `dialogue.promptBxr`, and use phrase `bxr` as response.

- [ ] Ensure every module has at least 4 dialogue-capable phrases via content test.
- [ ] Generate contextual dialogue tasks only after at least one recall attempt for the phrase.
- [ ] Show cue speaker and learner response role visually.
- [ ] Record dialogue task under separate progress id.
- [ ] Run content and Node tests.

### Task 7: Responsive E2E coverage

**Files:**
- Modify: `tests/e2e.spec.mjs`

**Interfaces:**
- Existing Playwright suite continues using `E2E_BASE_URL`.

- [ ] Add desktop test for visible module rail and course task flow.
- [ ] Add 390px test for mobile module selector, hint ladder and Continue button.
- [ ] Add 320px overflow assertion with course section visible.
- [ ] Keep existing words/verbs/listen checks.

### Task 8: CI, review and production deployment

**Files:** none unless CI reveals a real issue.

- [ ] Open PR from `beginner-course-v1` to `main`.
- [ ] Require green ruff, pytest, Node tests, Docker build and Playwright responsive suite.
- [ ] Review PR patch for accidental regressions or duplicated content.
- [ ] Merge only after green checks.
- [ ] Verify production workflow and `https://buryad.buuzoed.dev/healthz` plus homepage response.
