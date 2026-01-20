# Technical Specifications

## Data Structures

### Question Content Schemas

#### 1. Fill in the Blanks (Round 1)

Used for questions where players must select the correct word to complete a sentence.

```typescript
interface FillInTheBlanksContent {
  template: string; // e.g. "Jesus was born in [1] in the city of [2]."
  blanks: {
    id: number;
    options: string[]; // 4 options per blank
    correctAnswer: string;
  }[];
}
```

#### 2. Matching (Round 1)

Used for "Match Heroes to Stories".

```typescript
interface MatchingContent {
  leftItems: { id: string; text: string }[];
  rightItems: { id: string; text: string }[];
  pairs: { leftId: string; rightId: string }[]; // Correct connections
}
```

#### 3. Chronology (Round 2)

Used for ordering events.

```typescript
interface ChronologyContent {
  events: {
    id: string;
    text: string;
    correctIndex: number; // 0-based index
  }[];
}
```

#### 4. Correct the Error (Round 3)

Used for identifying and fixing a mistake in a text.

```typescript
interface CorrectTheErrorContent {
  text: string; // Full text with error
  errorStartIndex: number; // Character index where error starts
  errorEndIndex: number; // Character index where error ends
  correctionOptions: string[]; // List of possible corrections
  correctCorrection: string; // The right answer
}
```

#### 5. Crossword (Round 4)

Existing structure, enhanced with Joker support in GameState.

```typescript
interface CrosswordContent {
  grid: string[][];
  clues: {
    across: CrosswordClue[];
    down: CrosswordClue[];
  };
}
```

## Game State Enhancements

### Round 1: Individual Turns

The `Question` model now includes a `section` field.
The Frontend must filter questions or display a "Not your turn" overlay based on the current question's section.

### Round 3: Streak Tracking

`GameState` or `Team` object needs to track `consecutiveCorrectAnswers` in the current round.

```typescript
interface Team {
  // ... existing fields
  streak: number; // Current streak in Round 3
}
```

### Round 4: Joker Usage

Track usage of the single joker allowed per team.

```typescript
interface Team {
  // ... existing fields
  hasUsedJoker: boolean;
}
```
