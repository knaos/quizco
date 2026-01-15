# Active Context: Quizco

## Current Work Focus

The project has been initialized with a monorepo structure. Core components for both host and player views are present in `apps/client`, and the server logic is being established in `apps/server`.

## Recent Changes

- Initialized Memory Bank with `projectbrief.md`, `productContext.md`, `systemPatterns.md`, and `techContext.md`.
- Scaffolding for `apps/client` (React, Tailwind, i18n, Socket.io) is in place.
- Scaffolding for `apps/server` (Express, Socket.io, Postgres setup) is in place.
- Basic game logic (`GameManager.ts`) and database schema/seed scripts are created.
- Shared types are defined in `packages/shared`.

## Current Status

We are in the early stages of implementation, focusing on establishing the real-time game loop and ensuring synchronization between the host dashboard and player views.

## Next Steps

1. Verify the current implementation of `GameManager` and its integration with Socket.io.
2. Refine the Host Dashboard to allow starting competitions and rounds.
3. Ensure the Player View correctly handles all question types (MCQ, Open, Crossword).
4. Implement and test manual grading workflow.
5. Enhance UI/UX for children based on established design principles.

## Active Decisions

- **State Management:** Using React Context + `useReducer` for global game state on the client.
- **Crossword Sync:** Throttling updates to every 5 seconds or 3 words to prevent network congestion.
- **Database:** Using JSONB for question content to maintain flexibility for different types.
