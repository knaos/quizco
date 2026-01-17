# Active Context: Quizco

## Current Work Focus

The project has been initialized with a monorepo structure. Core components for both host and player views are present in `apps/client`, and the server logic is being established in `apps/server`.

## Recent Changes

- **Implemented Scoring and Grading System:**
  - Added auto-grading logic to `GameManager.ts` for MCQ and Closed-ended questions.
  - Established manual grading workflow for open-ended questions.
  - Updated Host Dashboard with a real-time manual grading queue.
  - Added integration tests for auto-grading.
- **Implemented Multi-Competition Support:**
  - Refactored `GameManager` to support isolated game sessions.
  - Implemented competition and round navigation in the Host Dashboard.
- Added quiz selection step for players with persistence.
- Added URL-based routing for the active competition in the Host Dashboard.
- Fixed Host Dashboard synchronization by implementing `HOST_JOIN_ROOM` logic.
- Added auto-reconnection support for the Host Dashboard.
- Fixed timer-related test failures by awaiting `startTimer` in `GameManager.test.ts`.
- Fixed server crash (`TypeError`) by adding robust string conversion for `CLOSED` questions.
- Updated Player View to use text input for `CLOSED` questions.
- Updated socket logic to use room-based isolation.
- Initialized Memory Bank with core documentation files.
- Shared types are defined in `packages/shared`.
- **Documentation Audit & Update (Jan 2026):**
  - actual directory structure and component hierarchy.
  - Refined Prisma workflow and tech stack instructions.

## Current Status

The core game loop now includes answer validation and scoring. The system can handle both automatic and manual grading, and the host can adjudicate answers in real-time. Documentation is now fully synchronized with the codebase.

## Next Steps

1. Ensure the Player View correctly handles all question types (MCQ, Open, Crossword).
2. Implement interactive Crossword synchronization logic.
3. Enhance UI/UX for children (animations, larger font sizes, feedback).
4. Add more unit tests for manual grading and score calculation.

## Active Decisions

- **State Management:** Using React Context + `useReducer` for global game state on the client.
- **Async Game State Transitions:** Method calls in `GameManager` that trigger state persistence (like `startTimer`, `revealAnswer`, `setPhase`) are `async` and must be awaited to ensure the state is saved and timers are correctly initialized. This prevents race conditions and intermittent database deadlocks in tests.
- **Crossword Sync:** Throttling updates to every 5 seconds or 3 words to prevent network congestion.
- **Database:** Using JSONB for question content to maintain flexibility for different types.
