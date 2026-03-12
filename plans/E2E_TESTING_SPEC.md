# E2E Testing Spec

## Goal
Add a stable Playwright-based e2e workspace that validates critical entry flows and catches regressions early in the client experience.

## Scope (Phase 1)
- Verify `/host` renders host login controls.
- Verify `/play` competition selection and team join form flow.
- Use `data-testid` selectors for resilience.
- Verify one host and two players can complete a full competition lifecycle:
  WAITING -> WELCOME -> ROUND_START -> QUESTION_PREVIEW -> QUESTION_ACTIVE -> GRADING -> REVEAL_ANSWER -> ROUND_END -> LEADERBOARD.

## Out of Scope (Phase 1)
- Full host gameplay progression.
- Real database-driven scenarios.
- Multi-client synchronization checks.

## Test Strategy
- Run Playwright tests from `apps/e2e`.
- Start client app with a fixed local URL (`http://127.0.0.1:4173`).
- Mock `/api/competitions` in tests where deterministic data is required.

## Acceptance Criteria
- `npm run test:e2e` executes Playwright suite from monorepo root.
- At least one test covers `/host` login page controls.
- At least one test covers `/play` selection -> join form transition.
- At least one test covers host + two players through a complete competition flow ending in leaderboard.
- Question-type coverage includes dedicated two-question round flows for:
  `CLOSED`, `MULTIPLE_CHOICE`, `OPEN_WORD`, `CROSSWORD`, `FILL_IN_THE_BLANKS`, `MATCHING`, `CHRONOLOGY`, `TRUE_FALSE`, `CORRECT_THE_ERROR`.
- Each question type is split into its own Playwright spec file under `apps/e2e/tests/question-types/` and reuses shared harness helpers.
