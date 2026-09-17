# Buryad UX/Mobile V2 Design

## Goal
Turn the current long-form landing/trainer into a mobile-first learning app while preserving the editorial visual identity.

## Product principles
- One obvious next action: continue learning.
- Mobile navigation is always available via a fixed bottom bar.
- Desktop keeps sticky top navigation.
- Training never advances automatically; feedback is user-controlled.
- Guest progress is merged into the authenticated account on first login/registration.
- Study sessions mix new items, weak items and due reviews.
- Vocabulary/verbs/video are progressive-disclosure tools, not giant walls of cards.
- Every interactive control has visible focus, 44px mobile target size, labels and useful loading/error/success states.

## Information architecture
Primary destinations: Learn, Words, Verbs, Listen, Progress/Profile. Hero becomes compact and actionable. On mobile the bottom navigation replaces hidden desktop nav.

## Learn
Dashboard shows a daily session card, progress summary and current topic. Exercise flow: prompt -> answer -> Check -> feedback -> explicit Continue. Enter mirrors the primary action. Review scheduling uses steps 10 minutes, 1 day, 3 days, 7 days, 21 days, then 45 days; incorrect answers reset to 10 minutes.

## Words
Three tabs: everyday top, ready-made phrases, raw corpus. Search remains. Cards are compact and readable on one column mobile / responsive desktop.

## Verbs
Compact searchable list. Each verb expands on demand. One expanded verb renders all persons for the chosen tense and polarity. Avoid rendering 50 full conjugation tables at once.

## Listen
Show one listening exercise at a time. YouTube iframe is created only for active exercise. User writes transcription, saves it, then moves next/previous. If no verified transcript exists, state clearly that it is self-review rather than fake scoring.

## Account and progress
Auth dialog uses real labels, autocomplete, show-password control, loading state and human-readable errors. Guest local progress is merged into server state rather than replaced. Progress view emphasizes due reviews, mastered count, accuracy and weak items.

## Accessibility and responsive behavior
- `:focus-visible` on all interactive elements.
- 44px mobile touch targets.
- `aria-live` feedback.
- `prefers-reduced-motion` support.
- sticky bottom nav respects `env(safe-area-inset-bottom)`.
- no horizontal overflow at 320px width.
- forms have labels, autocomplete and accessible names.

## Testing
Keep Python/content/unit tests. Add JS tests for session scheduling and progress merge helpers. Add Playwright smoke tests for desktop and mobile widths: navigation visible, no horizontal overflow, auth dialog labels, exercise explicit-next flow, verbs progressive disclosure, listening single-card behavior.