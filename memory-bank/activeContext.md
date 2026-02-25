# Active Context

## Current Work Focus

The Quizco project has evolved significantly from its initial prototype into a comprehensive Bible competition platform. The focus has shifted from implementing new question types to ensuring stability, testing, and polish.

When adding new question types:
- Ensure both admin editors and player views are implemented
- Update shared types, Prisma schema, and seeding data accordingly
- Write tests to validate the new functionality

## Completed Iterations

### Iteration 4: Crossword Joker (Round 4)
- **Joker Mechanic:** Players can request one letter reveal at -2 points cost
- **Full Completion Bonus:** +3 points for completing crossword without using jokers
- **Implementation:** `handleJokerReveal` in GameManager, JOKER_REVEAL socket event
- **UI:** CrosswordPlayer updated to support joker functionality

### Iteration 3: True/False & Streak Logic (Round 3)
- Implemented `TRUE_FALSE` question type and `STREAK` round type
- **Streak Logic:** GameManager.ts tracks consecutive correct answers per team
- **Bonus Points:** In STREAK rounds: 5-6 streak (+1), 7-9 streak (+2), 10+ streak (+3)
- **CorrectTheError:** Added new question type for finding and fixing errors
- **Grading:** Updated GradingService.ts to handle TRUE_FALSE and CORRECT_THE_ERROR
- **Admin UI:** TrueFalseEditor.tsx, CorrectTheErrorEditor.tsx
- **Player UI:** TrueFalsePlayer.tsx, CorrectTheErrorPlayer.tsx
- **Persistence:** Team streak persisted in database

### Iteration 2: Chronology (Round 2)
- Implemented `CHRONOLOGY` question type with server-side shuffling
- **Server-Side Shuffling:** GameManager shuffles items when question starts
- **Complex Scoring:** +1 per correct position, +3 for perfect match
- **Frontend:** Integrated @dnd-kit for drag-and-drop
- **Performance:** React.memo, useCallback, useMemo for smooth drag operations
- **Admin UI:** ChronologyEditor.tsx
- **Player UI:** ChronologyPlayer.tsx

### Iteration 1: Fill-in-the-blanks & Matching (Round 1)
- Implemented FILL_IN_THE_BLANKS with multiple options per blank
- Implemented MATCHING question type
- Added `section` field for Round 1 player turns

### Infrastructure Improvements
- **TimerService:** Extracted timer logic into dedicated service
- **Logger:** Centralized structured logging utility
- **StatePersistence:** Backup/restore game state for crash recovery
- **Dependency Injection:** GameManager accepts services as constructor dependencies

## Next Steps (Future Work)

1. **Polish & Testing:**
   - Complete end-to-end test coverage
   - UI/UX refinements for child accessibility
   - Performance optimization for large competitions

2. **Feature Enhancements:**
   - Sound effects for correct/incorrect answers
   - Animation polish for transitions
   - Leaderboard animations

## Active Decisions

- **Data Model:** Uses JSONB for polymorphic question content
- **Streak Persistence:** Team streaks saved to database after each answer
- **Server Authority:** All scoring happens server-side
- **Round Reset:** LEADERBOARD phase allows replay (resets scores/streaks, keeps teams)
- **Chronology Shuffling:** Done server-side to ensure fairness

## Learnings

- Complex nested JSON in QuestionContent requires careful handling in both grading and reveal logic
- Fisher-Yates shuffle preferred for React compatibility
- @dnd-kit requires memoization for smooth performance with complex lists
- Section field enables fair turn-taking in Round 1
- Joker system adds strategic depth to crossword round
