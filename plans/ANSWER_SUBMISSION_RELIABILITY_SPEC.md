# Answer Submission Reliability Spec

## Goal
Prevent a player's final answer from being lost when the browser briefly loses network connectivity during live play.

## Scope
- Reconnect players automatically when the Socket.IO transport reconnects.
- Persist the latest final answer locally before emitting it.
- Retry the persisted final answer after reconnect while the same question is still active.
- Clear the pending submission once the server-authoritative state shows the answer was recorded, or once the question is no longer recoverable.

## Non-Goals
- Guaranteed delivery after the question has already closed.
- Persisting every partial draft update across browser restarts.

## Design
- Store one pending final submission in `localStorage`, keyed to competition, team, question, and answer payload.
- On socket reconnect, re-run `RECONNECT_TEAM` so the player rejoins the competition room and receives `GAME_STATE_SYNC`.
- After reconnect, replay the pending final submission only when:
  - the same competition/team is active,
  - the same question is still active,
  - the authoritative team state does not already show an explicit submission.
- If the authoritative state already contains the same final answer, remove the pending entry instead of replaying it.

## Verification
- Hook/unit test proving a pending final answer is retried after reconnect.
- Playwright coverage proving a player can submit while offline, reconnect, and still get the answer recorded before grading.
