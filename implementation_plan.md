# Implementation Plan

[Overview]
Implement the missing `CORRECT_THE_ERROR` question type for Round 3 and the "Joker" & "Full Completion Bonus" mechanics for Round 4.

The project is currently at ~75% completion. Iteration 3 (Round 3) is mostly complete but lacks the `CORRECT_THE_ERROR` question type. Iteration 4 (Round 4) needs the specialized crossword mechanics described in the regulations. This implementation will bring the system to full compliance with the "First National Children's Bible Competition" rules.

[Types]  
Update the shared type system to support the new question type and crossword events.

```typescript
// packages/shared/src/index.ts

// Add to QuestionType
export type QuestionType = ... | "CORRECT_THE_ERROR";

// New Content structure for Correct The Error
export interface CorrectTheErrorContent {
  text: string; // The full sentence
  phrases: string[]; // List of phrases the sentence is split into for selection
  errorPhraseIndex: number; // Which phrase contains the error
  correctReplacement: string; // What the error should be replaced with
}

// New Answer structure for Correct The Error
export interface CorrectTheErrorAnswer {
  selectedPhraseIndex: number;
  correction: string;
}

// Add to AnswerContent and QuestionContent unions
// ...

// Update SocketEvents for Joker
export interface SocketEvents {
  // ...
  JOKER_REVEAL: (payload: {
    competitionId: string;
    teamId: string;
    questionId: string;
    x: number;
    y: number;
  }) => void;
  // ...
}
```

[Files]
Create new UI components and modify core logic files.

Detailed breakdown:

- New files to be created:
  - `apps/client/src/components/admin/editors/CorrectTheErrorEditor.tsx`: Admin interface for creating error correction questions.
  - `apps/client/src/components/player/CorrectTheErrorPlayer.tsx`: Player interface for selecting a phrase and typing a correction.
- Existing files to be modified:
  - `packages/shared/src/index.ts`: Add `CORRECT_THE_ERROR` types and `JOKER_REVEAL` socket event.
  - `apps/server/prisma/schema.prisma`: Ensure `CORRECT_THE_ERROR` is in the `QuestionType` enum.
  - `apps/server/src/services/GradingService.ts`: Implement grading for `CORRECT_THE_ERROR` and bonus for full crossword.
  - `apps/server/src/GameManager.ts`: Implement `JOKER_REVEAL` logic (deduct 2 points, reveal letter) and crossword completion bonus.
  - `apps/client/src/components/admin/QuestionEditor.tsx`: Register the new editor.
  - `apps/client/src/components/player/PlayerView.tsx`: Register the new player component.
  - `apps/client/src/components/Crossword.tsx`: Add "Request Joker" button and handle `GRID_UPDATE` / letter reveal.
  - `apps/client/src/locales/en.json` & `apps/client/src/locales/bg.json`: Add translations for new UI elements.
  - `apps/server/src/db/seed.ts`: Add sample `CORRECT_THE_ERROR` questions.

[Functions]
Extend grading and game management functions.

Detailed breakdown:

- `GradingService.gradeCorrectTheError(content: CorrectTheErrorContent, answer: CorrectTheErrorAnswer, points: number)`: New function to calculate 1pt for index and 1pt for text correction.
- `GameManager.handleJokerReveal(...)`: New function to handle letter requests, check points, deduct 2, and broadcast updated state.
- `GradingService.gradeCrossword(...)`: Modify to include the +3 bonus for full completion without jokers.

[Classes]
No new classes are required; existing classes will be extended.

Detailed breakdown:

- `GradingService`: Add `gradeCorrectTheError`.
- `GameManager`: Add `handleJokerReveal` and update `submitAnswer` for crossword specific bonuses.

[Dependencies]
No new packages are required. Existing dependencies (React, Socket.io, Tailwind) are sufficient.

[Implementation Order]
Step-by-step execution to ensure stability.

1. Update shared types and Prisma schema.
2. Implement server-side grading logic for `CORRECT_THE_ERROR`.
3. Create Admin Editor for `CORRECT_THE_ERROR`.
4. Create Player View for `CORRECT_THE_ERROR`.
5. Implement Crossword Joker logic (Server).
6. Update Crossword UI with Joker support.
7. Implement Crossword completion bonus (+3 points).
8. Add translations and seed data.
9. Final verification and testing.
