# Active Context

## Current Work Focus

We are evolving the Quizco prototype into a fully compliant "First National Children's Bible Competition" system. The focus is on implementing the specific game logic for all 4 rounds, including specialized question types, complex scoring (chronology bonuses, streaks), and the team-based structure.

## Recent Changes

- Analyzed `REQUIREMENTS.md` and created a comprehensive development plan.
- Identified missing question types: `FILL_IN_THE_BLANKS`, `MATCHING`, `CHRONOLOGY`, `CORRECT_THE_ERROR`.
- Identified missing logic: Section-based turns (Round 1), Streak bonuses (Round 3), Joker mechanic (Round 4).

## Next Steps

1. **Iteration 1:** Implement "Fill in the Blanks" & "Matching" (Round 1).
   - Update `packages/shared/src/index.ts` and `apps/server/prisma/schema.prisma`.
   - Implement backend grading logic for new types.
   - Create frontend components and editors.
2. **Iteration 2:** Implement "Chronology" (Round 2).
3. **Iteration 3:** Implement "True/False" & Streak Logic (Round 3).
4. **Iteration 4:** Implement Crossword Joker (Round 4).

## Active Decisions

- **Round 1 Strategy:** We will assume 1 device per team but use strict UI indicators ("Turn: Player 1 (Section Name)") to enforce individual play.
- **Data Model:** Extending `QuestionType` and adding `section` field to Questions.
- **Scoring:** `GradingService` will be expanded to handle complex scoring rules (partial credit, bonuses).

## Learnings

- The initial prototype was too generic. The specific requirements for this competition require highly specialized question logic rather than generic "Open" or "Closed" types.
