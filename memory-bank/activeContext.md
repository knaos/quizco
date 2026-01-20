# Active Context

## Current Work Focus

We are evolving the Quizco prototype into a fully compliant "First National Children's Bible Competition" system. The focus is on implementing the specific game logic for all 4 rounds, including specialized question types, complex scoring (chronology bonuses, streaks), and the team-based structure.

When adding new question types:

- ensure both admin editors and player views are implemented.
- update shared types, Prisma schema, and seeding data accordingly.
- write tests to validate the new functionality.

## Recent Changes

- **Iteration 3 Complete: "True/False" & Streak Logic (Round 3):**
  - Implemented `TRUE_FALSE` question type and `STREAK` round type.
  - **Streak Logic:** `GameManager.ts` now tracks consecutive correct answers for each team. Streak is persisted in the database (`Team.streak`).
  - **Bonus Points:** In `STREAK` rounds, teams earn bonus points for correct answer streaks: 5-6 (+1), 7-9 (+2), 10+ (+3).
  - **Grading:** Updated `GradingService.ts` to handle `TRUE_FALSE` questions.
  - **Admin UI:** Created `TrueFalseEditor.tsx` for simple true/false toggle.
  - **Player UI:** Created `TrueFalsePlayer.tsx` with large touch-friendly buttons for rapid-fire answering.
  - **Resilience:** Updated `PostgresGameRepository` to save and restore team streaks.
  - Updated shared types, Prisma schema, test mocks, and `seed.ts`.

- **Iteration 2 Complete: "Chronology" (Round 2):**
  - Implemented `CHRONOLOGY` question type with server-side shuffling.
  - **Server-Side Shuffling:** `GameManager.ts` now deep-clones questions and shuffles items for `CHRONOLOGY` questions when they start, ensuring all players receive the same randomized order.
  - **Complex Scoring:** Implemented in `GradingService.ts` (+1 per correct position, +3 bonus for a perfect match).
  - **Frontend:** Integrated `@dnd-kit` for drag-and-drop support.
  - **Admin UI:** Created `ChronologyEditor.tsx` for managing ordered items.
  - **Player UI:** Created `ChronologyPlayer.tsx` for touch-friendly reordering.
  - **Performance Optimization:** Applied `React.memo`, `useCallback`, and `useMemo` to `ChronologyEditor` and `ChronologyPlayer` to fix stuttering during drag-and-drop operations. Switched to `CSS.Translate` for smoother transitions.
  - Updated shared types, Prisma schema (added `CHRONOLOGY` enum), and seed data.

- **Iteration 1 Complete (and Refined):**
  - Fixed build errors in `FillInTheBlanksEditor.tsx` related to unused imports.
  - Synchronized `apps/server/src/db/schema.sql` with `schema.prisma` to resolve test failures where the test database was missing new columns (e.g., `section`).
  - Implemented `FILL_IN_THE_BLANKS` and `MATCHING` question types.
  - **Data Structure Refinement:** `FILL_IN_THE_BLANKS` questions now support multiple options per blank, with one explicitly marked as correct.
  - Updated shared types in `packages/shared/src/index.ts`.
  - Updated Prisma schema in `apps/server/prisma/schema.prisma` (added `section` field and new `QuestionType` enums).
  - Implemented and tested auto-grading logic in `GradingService.ts` for these complex structures.
  - Created admin editors: `FillInTheBlanksEditor.tsx` (supports multiple options/distractors per placeholder) and `MatchingEditor.tsx`.
  - Created player components: `FillInTheBlanksPlayer.tsx` (using dropdowns for choices) and `MatchingPlayer.tsx`.
  - Updated `QuestionEditor.tsx` and `PlayerView.tsx` to integrate new types and handle correct answer formatting during reveal.
  - Updated `seed.ts` with demo questions for the new types.

## Next Steps

1. **Iteration 4:** Implement Crossword Joker (Round 4).
   - Allow players to request a letter.
   - Cost: 2 points.
   - Emit `GRID_UPDATE` to all teams.
   - Ensure goo d and usable UI is used for the whole crossword grid - both players and admin preparing the crossword.

## Active Decisions

- **Fill in the Blanks UI:** Chose `<select>` dropdowns over free-text input to match competition requirements for provided options.
- **Round 1 Strategy:** Using `section` field to indicate turns (e.g., "Player 1"). UI displays "Turn: [Section Name]" during preview and active phases.
- **Data Model:** Answers for `FILL_IN_THE_BLANKS` are `string[]`, for `MATCHING` they are `Record<string, string>`.

## Learnings

- Complex nested JSON structures in `QuestionContent` require careful handling in both `GradingService` and frontend "Reveal Answer" logic to avoid `[object Object]` display issues.
- Fisher-Yates shuffle is the preferred way to shuffle items in `useEffect` to satisfy React's purity requirements and avoid infinite re-renders.
