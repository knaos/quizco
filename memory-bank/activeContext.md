# Active Context

## Current Work Focus

We are evolving the Quizco prototype into a fully compliant "First National Children's Bible Competition" system. The focus is on implementing the specific game logic for all 4 rounds, including specialized question types, complex scoring (chronology bonuses, streaks), and the team-based structure.

## Recent Changes

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

1. **Iteration 2:** Implement "Chronology" (Round 2).
   - Drag-and-drop UI for players.
   - Complex scoring: +1 per correct index, +3 for perfect match.
2. **Iteration 3:** Implement "True/False" & Streak Logic (Round 3).
   - Consecutive correct answer tracking.
   - Bonus points (+1 for 5-6, +2 for 7-9, +3 for 10).
3. **Iteration 4:** Implement Crossword Joker (Round 4).

## Active Decisions

- **Fill in the Blanks UI:** Chose `<select>` dropdowns over free-text input to match competition requirements for provided options.
- **Round 1 Strategy:** Using `section` field to indicate turns (e.g., "Player 1"). UI displays "Turn: [Section Name]" during preview and active phases.
- **Data Model:** Answers for `FILL_IN_THE_BLANKS` are `string[]`, for `MATCHING` they are `Record<string, string>`.

## Learnings

- Complex nested JSON structures in `QuestionContent` require careful handling in both `GradingService` and frontend "Reveal Answer" logic to avoid `[object Object]` display issues.
- Fisher-Yates shuffle is the preferred way to shuffle items in `useEffect` to satisfy React's purity requirements and avoid infinite re-renders.
