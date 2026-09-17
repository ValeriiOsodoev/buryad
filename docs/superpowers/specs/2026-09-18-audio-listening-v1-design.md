# Buryad Audio & Listening V1 Design

## Goal
Add an honest audio-learning layer to the beginner course without synthesizing Buryat through unsupported Russian/Kazakh voices.

## Principles
- Never fake Buryat pronunciation with an unsupported TTS language.
- A phrase is auto-playable only when a verified audio asset exists or the browser explicitly exposes a `bxr` voice.
- Listening tasks are generated only from verified audio.
- Learners can record their own pronunciation for any phrase and replay it locally.
- Phrase audio and course content stay loosely coupled through stable phrase ids.

## Audio manifest
Create `web/data/audio.json` containing entries keyed by phrase id. Each entry has `src`, `speaker`, `source`, `verified`, and optional `license`/`note`. Missing phrase ids simply have no reference audio yet.

## Course audio UX
The course card gains:
- `Listen` button when verified audio or a real `bxr` browser voice is available;
- `Record myself` / `Stop` / `Replay my recording` controls;
- recording status text;
- no disabled fake playback button when no reference exists.

Reference audio can be replayed at normal and 0.8x speed. Audio playback never auto-advances the course.

## Pronunciation recording
Use `MediaRecorder` and IndexedDB. Recordings are local to the browser, keyed by phrase id, never uploaded automatically. A learner can overwrite/delete their own take. Unsupported browsers show a clear message instead of failing silently.

## Listening task modes
Extend course task generation with optional audio modes only for phrases with verified reference audio:
- `dictation`: listen, type the Buryat phrase;
- `audio-response`: hear a dialogue cue and type the learner response.

Until phrase-level reference audio exists, current YouTube listening remains available and the course does not pretend those modes are active.

## Buryat TTS discovery
At runtime inspect `speechSynthesis.getVoices()` and accept only a voice whose language code starts with `bxr`. Do not fall back to `ru`, `kk`, `mn`, or any other language.

## Native-speaker import workflow
Add `scripts/build_audio_manifest.py` for a future recording pack. The script scans a folder of files named `<phrase-id>.mp3|wav|ogg`, verifies ids against `course.json`, and writes a manifest. CI validates that every manifest id exists in the course and every referenced local asset path is safe.

## Data/storage
- Reference files: `/assets/audio/phrases/<phrase-id>.<ext>`.
- Reference metadata: `web/data/audio.json`.
- Learner recordings: IndexedDB database `buryad-audio`, store `recordings`, key `phraseId`.
- No microphone audio is sent to the server in V1.

## UI and mobile
Controls must remain usable at 320px width. Recording controls wrap instead of overflowing. Native browser audio elements are avoided in favor of compact controls to keep the learning card stable.

## Testing
- Content tests validate manifest schema/id integrity.
- Node tests validate audio task eligibility and strict Buryat voice selection.
- Playwright checks recording controls render, unsupported/no-reference state is honest, course remains overflow-free at 320/390px, and no non-Buryat speech synthesis fallback is offered.

## Deployment
Use the existing tested Docker artifact -> SSH -> nginx workflow. No new secrets are required for V1.
