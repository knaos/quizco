# Progress: Quizco

## What Works

- **Monorepo Structure:** turborepo setup with `apps/client`, `apps/server`, and `packages/shared`.
- **Frontend Scaffolding:** React, Vite, Tailwind, i18next, and Socket.io-client.
- **Backend Scaffolding:** Node.js, Express, Socket.io, and Postgres setup.
- **Database Schema:** Defined SQL schema with support for JSONB and UUIDs. Added `section` field for questions.
- **Core Game Logic:** `GameManager` with auto and manual grading.
- **Integration Testing:** Comprehensive test suite for `GameManager` covering timer logic and async state transitions.
- **Types:** Shared TypeScript interfaces for game state and socket events.
- **Components:** Basic implementations of `AdminPanel`, `HostDashboard`, `PlayerView`, and `Crossword`.
- **Manual Grading Workflow:** Host UI and server logic for adjudicating open-ended answers.
- **New Question Types:** `FILL_IN_THE_BLANKS` and `MATCHING` fully implemented and tested.
- **Advanced Blanks Logic:** Support for multiple options per blank with correct/distractor marking.

## What's Left to Build

### Iteration 2: Round 2 ("Biblical Chronology")

- [x] Support `CHRONOLOGY` question type with Drag-and-Drop.
- [x] Implement Chronology scoring (+1 per correct index, +3 for perfect match).

### Iteration 3: Round 3 ("True or False?")

- [x] Support `TRUE_FALSE` question type.
- [x] Implement "Streak Bonus" logic (5-6: +1, 7-9: +2, 10: +3).
- [ ] Support `CORRECT_THE_ERROR` question type.

### Iteration 4: Round 4 ("Final" - Crossword)

- [ ] Implement "Joker" mechanic (-2 points for revealed letter).
- [ ] Implement "Full Completion Bonus" (+3 points).

### General

- [ ] Timer Logic: Server-authoritative countdown with drift prevention.
- [ ] Leaderboard: Real-time score aggregation and display.
- [ ] Tests: Unit and integration tests for all new question types and scoring logic.

## Current Status

- **Overall Completion:** ~75%
- **Infrastructure:** [x] Done
- **Database:** [x] Updated for Round 3 requirements (Team Streaks).
- **Core State Machine:** [x] Done (Multi-session support added)
- **Scoring & Grading:** [x] Expanded for R2 (Chronology) and R3 (Streaks).
- **Admin UI:** [x] Updated with specialized editors for R1, R2, and R3.
- **Player UI:** [x] Updated with specialized components for R1, R2, and R3.
- **Real-Time Sync:** [x] Done (Multi-room isolation)
- **Host Control Flow:** [x] Done (Implemented "Next" button flow)

## Known Issues

- None yet identified.

## Project Evolution

- **2026-01-15:** Initial project setup and memory bank initialization.
- **2026-01-20:** Completed Iteration 1 (Round 1 specific logic). Added multi-option blanks and turn-based sections.
- **2026-01-20:** Completed Iteration 2 (Round 2 Chronology). Added drag-and-drop and complex scoring.
- **2026-01-20:** Completed Iteration 3 (Round 3 True/False & Streaks). Added streak persistence and bonus points.
