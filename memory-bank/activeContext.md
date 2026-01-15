# Active Context: Quizco

## Current Work Focus

The project has been initialized with a monorepo structure. Core components for both host and player views are present in `apps/client`, and the server logic is being established in `apps/server`.

## Recent Changes

- **Implemented Scoring and Grading System:**
  - Added auto-grading logic to `GameManager.ts` for MCQ and Closed-ended questions.
  - Established manual grading workflow for open-ended questions.
  - Updated Host Dashboard with a real-time manual grading queue.
  - Added integration tests for auto-grading.
- Initialized Memory Bank with core documentation files.
- Shared types are defined in `packages/shared`.

## Current Status

The core game loop now includes answer validation and scoring. The system can handle both automatic and manual grading, and the host can adjudicate answers in real-time.

## Next Steps

1. Refine the Host Dashboard to support Competitions and Rounds (currently lists all questions).
2. Ensure the Player View correctly handles all question types (MCQ, Open, Crossword).
3. Implement interactive Crossword synchronization logic.
4. Enhance UI/UX for children (animations, larger font sizes, feedback).
5. Add more unit tests for manual grading and score calculation.

## Active Decisions

- **State Management:** Using React Context + `useReducer` for global game state on the client.
- **Crossword Sync:** Throttling updates to every 5 seconds or 3 words to prevent network congestion.
- **Database:** Using JSONB for question content to maintain flexibility for different types.
