# Buryad Beginner Course V1 Design

## Goal
Turn the existing Buryad trainer into a structured beginner course for everyday spoken Buryat, while keeping the current reference tools (frequency core, 50 verbs, listening, progress and accounts).

## Learning model
The course is communication-first, not grammar-first. A learner should repeatedly use the same high-value phrase in different contexts before the course introduces rarer vocabulary.

Each phrase moves through a small retrieval ladder:
1. **Meet** — see the Buryat phrase, Russian meaning and only the genuinely new words.
2. **Understand** — read Buryat and identify/produce the Russian meaning.
3. **Recall** — see Russian and type Buryat from memory.
4. **Hinted recall** — on difficulty, reveal a keyword, then a phrase skeleton, then the full answer.
5. **Dialogue** — answer a realistic preceding line using the phrase in context.
6. **Review** — the existing spaced schedule brings weak/due phrases back later.

The course never treats spelling-only differences as equivalent to communication-breaking errors; the existing Buryat answer normalizer remains in use.

## Scope
V1 contains 12 modules with approximately 18 phrases each (roughly 216 core phrases):
1. First contact — greetings, yes/no, names, basic politeness.
2. Where are you? — location, here/there/home, where/where to.
3. At home — sit, give, take, wait, look, open/close, sleep/wake.
4. Food and drink — eaten/not yet, want, give water/tea, simple availability.
5. Friends and plans — free/busy, today/tomorrow, meeting, coming, waiting.
6. Movement and transport — go/come/arrive/leave, now/later, home/city/store.
7. Shop and money — what/how much, give/show, expensive/cheap, pay/buy.
8. Work and study — working/resting, reading/writing/learning, finished/not finished.
9. Phone and messages — call, write, send, answer, later, cannot hear/understand.
10. Requests and help — please-like request patterns, help, repeat, slower, show me.
11. Feelings and everyday state — good/bad, tired, hungry, cold/hot, like/don't like.
12. Language survival — speak Buryat, what does it mean, how is it called, I understand a little.

Grammar notes are short and contextual. They explain only patterns needed for the current phrases (person endings, negation, present/future/resultative past, question particles, imperative/request forms, common cases).

## Content architecture
Create `web/data/course.json` with modules containing phrases. Each phrase has:
- `id`: stable globally unique id.
- `ru`: Russian meaning/prompt.
- `bxr`: preferred spoken Buryat answer.
- `alternatives`: accepted natural variants.
- `new`: pairs `[buryat, russian]`, only vocabulary not assumed introduced earlier in that module.
- `hint`: one short keyword/pattern hint.
- `skeleton`: partially hidden Buryat phrase for the second hint level.
- `note`: optional compact usage note.
- `dialogue`: optional object with `promptRu`, `promptBxr` and `response` metadata.

Course content remains data-only. Exercise generation lives in `web/js/course.js`, so new modules can be added without changing the UI.

## Exercise generation
`course.js` exposes pure helpers:
- `flattenCourse(course)` -> flat phrase list with module metadata.
- `buildCourseSession(course, progress, nowMs, limit)` -> prioritized phrase-mode tasks.
- `makeTask(phrase, mode)` -> normalized task object.
- `nextHint(task, level)` -> keyword, skeleton, then answer.

Modes used in V1:
- `recall`: Russian -> Buryat.
- `meaning`: Buryat -> Russian self-check / short typed meaning.
- `dialogue`: contextual Russian/Buryat cue -> Buryat response.

The daily session mixes modes rather than showing all stages of one phrase back-to-back. Weak and due items keep priority over new material.

## Progress model
Progress keys become phrase-mode ids such as `course:intro-01:recall`. Existing legacy progress remains untouched and readable. Course overview computes completion at phrase level: a phrase is considered learned when its recall task reaches the mastered spaced-review state and at least one contextual task has been attempted.

Authenticated progress remains server-backed. Guest progress stays local and uses the existing idempotent merge path when the user signs in.

## UI
Add a clear **Course** view as the primary learning destination.

Desktop:
- left module rail with progress percentage and lock/completion state;
- center exercise card;
- compact session progress header;
- optional grammar/usage note below feedback.

Mobile:
- current module shown as a compact selector instead of a long rail;
- one task per screen;
- large primary action at the bottom of the exercise card;
- hints open progressively without shifting to a separate page.

The existing Words, Verbs and Listen destinations stay available as reference/practice tools.

## Hint UX
Replace the binary “Не помню” behavior for course tasks with progressive help:
1. first tap: show one keyword/pattern;
2. second tap: show the skeleton;
3. third tap: reveal the answer and record the task as incorrect.

This protects retrieval practice while still letting a beginner continue.

## Module progression
Modules are ordered but not hard-blocked. A learner may open any module, while the primary “continue” action points to the earliest module with unfinished core recall tasks. This avoids frustrating hard locks while preserving a recommended path.

## Quality constraints
- At least 200 unique phrase ids.
- At least 12 modules.
- No module contains more than 25 phrases.
- Every phrase has Russian and Buryat text and at least one accepted answer.
- New vocabulary is shown before it can appear in a recall task within a module.
- Avoid fabricated precision: forms not confidently supported by existing course knowledge/corpus evidence should not be introduced merely to reach a phrase count.
- Existing `normalizeBuryat` acceptance remains active for orthographic tolerance.

## Testing
Content tests validate counts, ids, required fields, module limits and no accidental duplicate Russian/Buryat pairs.

Node tests validate task generation, hint levels, prioritization and stable progress ids.

Playwright extends the existing responsive tests to cover:
- selecting a course module;
- first/second/third hint levels;
- explicit Continue flow;
- no horizontal overflow at 320/390 px;
- desktop module rail and mobile compact selector;
- course completion/progress text renders without runtime errors.

Production deployment remains the current tested-artifact Docker -> SSH -> nginx workflow.