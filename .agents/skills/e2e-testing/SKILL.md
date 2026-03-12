---
name: e2e-testing
description: Plan, implement, and verify Playwright end-to-end coverage for Quizco changes. Use when implementing a new feature, refactoring existing code, or fixing a bug that can affect host/player flows, real-time state transitions, routing, or visible UI behavior.
---

# E2E Testing

## Overview
Apply this workflow to keep regressions out of production flows by pairing each behavioral change with deterministic Playwright coverage.

## Workflow
1. Classify change impact.
   - Map the change to affected user journeys (`/host`, `/play`, gameplay phases, grading, leaderboard, reconnects).
   - List the minimum critical paths that must be validated end-to-end.
2. Define test scope.
   - Prefer updating an existing spec in `apps/e2e/tests` when behavior extends an existing flow.
   - Add a new spec when behavior is isolated or complex enough to need focused ownership.
   - Use `data-testid` selectors only; do not rely on CSS selectors.
3. Implement or update tests.
   - Reuse helpers in `apps/e2e/tests/helpers` before creating new harness logic.
   - Keep tests deterministic: no arbitrary waits, no fragile timing assumptions.
   - Validate server-authoritative behavior through observable UI/state outcomes.
4. Execute verification.
   - Run targeted suite first:
     - `npm run test:e2e -w @quizco/e2e -- <spec-path>`
   - If targeted tests pass, run broader suite when change touches shared gameplay paths:
     - `npm run test:e2e -w @quizco/e2e`
5. Report outcomes.
   - Summarize which journeys were covered.
   - List exact specs run and pass/fail status.
   - If gaps remain, state explicit follow-up tests.

## Done Criteria
Consider the change done only when all conditions are true:
- Impacted journey(s) have Playwright coverage.
- New or updated tests pass locally.
- Existing relevant e2e suites still pass.
- Residual risk is documented when coverage is intentionally deferred.
