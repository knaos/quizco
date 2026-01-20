# Progress: Quizco

## What Works

- **Monorepo Structure:** turborepo setup with `apps/client`, `apps/server`, and `packages/shared`.
- **Frontend Scaffolding:** React, Vite, Tailwind, i18next, and Socket.io-client.
- **Backend Scaffolding:** Node.js, Express, Socket.io, and Postgres setup.
- **Database Schema:** Defined SQL schema with support for JSONB and UUIDs.
- **Core Game Logic:** `GameManager` with auto and manual grading.
- **Integration Testing:** Comprehensive test suite for `GameManager` covering timer logic and async state transitions.
- **Types:** Shared TypeScript interfaces for game state and socket events.
- **Components:** Basic implementations of `AdminPanel`, `HostDashboard`, `PlayerView`, and `Crossword`.
- **Manual Grading Workflow:** Host UI and server logic for adjudicating open-ended answers.

## What's Left to Build

### Iteration 1: Round 1 ("Something for Everyone")

- [ ] Support `FILL_IN_THE_BLANKS` and `MATCHING` question types.
- [ ] Implement `section` based turns (Individual Play).
- [ ] Create specialized editors for Fill-in-Blanks and Matching.

### Iteration 2: Round 2 ("Biblical Chronology")

- [ ] Support `CHRONOLOGY` question type with Drag-and-Drop.
- [ ] Implement Chronology scoring (+1 per correct index, +3 for perfect match).

### Iteration 3: Round 3 ("True or False?")

- [ ] Support `CORRECT_THE_ERROR` question type.
- [ ] Implement "Streak Bonus" logic (5-6: +1, 7-9: +2, 10: +3).

### Iteration 4: Round 4 ("Final" - Crossword)

- [ ] Implement "Joker" mechanic (-2 points for revealed letter).
- [ ] Implement "Full Completion Bonus" (+3 points).

### General

- [ ] Timer Logic: Server-authoritative countdown with drift prevention.
- [ ] Leaderboard: Real-time score aggregation and display.
- [ ] Tests: Unit and integration tests for all new question types and scoring logic.

## Current Status

- **Overall Completion:** ~40% (Scope expanded based on requirements)
- **Infrastructure:** [x] Done
- **Database:** [/] Basic schema exists, updates needed for new types and sections.
- **Core State Machine:** [x] Done (Multi-session support added)
- **Scoring & Grading:** [/] Basic grading exists, needs expansion for new rounds.
- **Admin UI:** [x] Done (Competitions and Rounds management)
- **Player UI:** [/] In Progress (Quiz selection added)
- **Real-Time Sync:** [x] Done (Multi-room isolation)
- **Host Control Flow:** [x] Done (Implemented "Next" button flow)

## Known Issues

- None yet identified as we are still in early development.

## Project Evolution

- **2026-01-15:** Initial project setup and memory bank initialization.
