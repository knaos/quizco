# E2E Agentic Debug Backlog

## Goal
Create high-signal, deterministic end-to-end checks that help coding agents localize failures quickly.

## Prioritization

### P0 (implemented)
- Timeout transition:
  One of two teams submits and the question still ends via timer into `GRADING`.
- Reconnect time sync:
  Reconnecting player in `QUESTION_ACTIVE` receives reduced remaining time, not a reset timer.
- Manual grading authority:
  Host grading decisions directly determine leaderboard ordering.

### P1 (next)
- Late submission rejection:
  Submissions after phase switch from `QUESTION_ACTIVE` must not mutate score/state.
- Explicit disconnect/reconnect presence:
  Team connection indicator toggles correctly and recovers.
- Round boundary integrity:
  End-of-round transitions to `ROUND_END`, then to next round, and only final round reaches `LEADERBOARD`.

### P2 (advanced)
- Joker enforcement in crossword:
  Cost deduction, single-use guard, and insufficient-points error path.
- Backup/resume resilience:
  Restart server mid-session and verify recovery from backup state.
- Chronology scoring invariants:
  Partial score and perfect-match bonus consistency across grading/reveal.

## Agentic Debugging Conventions
- Each test should assert:
  phase invariant, score invariant, and one domain-specific invariant.
- Keep fixtures minimal:
  one round and one question unless the scenario explicitly targets inter-round transitions.
- Prefer `data-testid` selectors for all control surfaces used by tests.
- On failure, include enough assertions to identify whether issue is in:
  UI dispatch, socket flow, server phase machine, or grading persistence.
