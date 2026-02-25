# System Patterns: Quizco

## Architecture Overview

Quizco follows a **Monorepo** strategy with Turborepo, maintaining clear separation between frontend, backend, and shared packages.

```
/
├── apps/
│   ├── client/         # React SPA (Vite)
│   └── server/         # Node.js Server (Express + Socket.io)
├── packages/
│   └── shared/         # Shared TypeScript interfaces
└── memory-bank/        # Documentation
```

## Technology Stack

### Frontend
- **Framework:** React 18 (Vite)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State Management:** React Context + useReducer
- **Communication:** Socket.io-client
- **Internationalization:** react-i18next (English, Bulgarian)
- **Drag & Drop:** @dnd-kit (for Chronology, Matching)

### Backend
- **Runtime:** Node.js
- **Framework:** Express
- **Language:** TypeScript
- **Real-Time:** Socket.io
- **Database:** PostgreSQL (Dockerized)
- **ORM:** Prisma
- **Testing:** Vitest

## Key Technical Decisions

### 1. Server Authority

The server is the single source of truth. Clients send "Intent" (e.g., `SUBMIT_ANSWER`), and the server validates it against the current game state before broadcasting the updated "State" (e.g., `SCORE_UPDATED`).

### 2. Hybrid Database Schema

PostgreSQL is used with JSONB to handle polymorphic question types without complex EAV patterns. Each question type has its own content structure stored as JSONB.

### 3. Real-Time State Machine

The game moves through 9 defined phases:

```typescript
type GamePhase =
  | "WAITING"      // Lobby open, teams joining
  | "WELCOME"      // Introduction screen
  | "ROUND_START"  // New round announcement
  | "QUESTION_PREVIEW"  // Question display with option reveal
  | "QUESTION_ACTIVE"   // Timer running, input allowed
  | "GRADING"      // Input locked, grading in progress
  | "REVEAL_ANSWER"     // Show correct answers
  | "ROUND_END"    // End of round summary
  | "LEADERBOARD"; // Scores displayed
```

### 4. Drift Prevention

Client clocks are not trusted. The server tracks official start time, and clients calculate remaining time based on server-provided deltas.

### 5. Decoupled Services

- **TimerService:** Dedicated service for managing game timers
- **GradingService:** Auto-grading logic for all question types
- **StatePersistenceService:** Backup/restore game state
- **Logger:** Unified structured logging

### 6. Dependency Injection

GameManager accepts services as constructor dependencies:
```typescript
constructor(
  private repository: IGameRepository,
  private timerService: TimerService,
  private logger: ILogger,
)
```

## Component Patterns (Frontend)

### Context API + useReducer
Primary state management for the Game State with centralized actions.

### Feature-Based Structure
Code organized by domain:
- `components/admin/editors/` - Question type editors
- `components/player/` - Question type players
- `contexts/` - Game and Auth contexts
- `locales/` - i18n translations

### Atomic UI Components
- Reusable buttons with 48px+ touch targets
- Large fonts (18px+)
- Clear visual feedback states

## Question Type Implementation Pattern

Each question type requires:
1. **Shared Type:** Add to `packages/shared/src/index.ts`
2. **Database:** Add enum to Prisma schema
3. **Grading:** Add case to `GradingService.ts`
4. **Admin Editor:** Create `*Editor.tsx`
5. **Player View:** Create `*Player.tsx`
6. **Integration:** Update `QuestionEditor.tsx` and `PlayerView.tsx`
7. **Seed Data:** Add sample questions to `seed.ts`
8. **Tests:** Add grading and UI tests

## Event Patterns (Socket.io)

### Client → Server
- `JOIN_ROOM` - Team joining
- `RECONNECT_TEAM` - Reconnection handling
- `SUBMIT_ANSWER` - Answer submission
- `CROSSWORD_PROGRESS` - Throttled grid updates
- `REQUEST_JOKER` - Joker feature

### Host → Server
- `HOST_START_QUESTION` - Push question
- `HOST_START_TIMER` - Begin countdown
- `HOST_REVEAL_ANSWER` - Show answers
- `HOST_NEXT` - Advance game
- `HOST_GRADE_DECISION` - Manual grading
- `HOST_PAUSE_TIMER` / `HOST_RESUME_TIMER`

### Server → Client
- `GAME_STATE_SYNC` - Full state dump
- `TIMER_SYNC` - Countdown updates
- `SCORE_UPDATE` - Score changes
- `JOKER_REVEAL` - Letter revealed

## Game Mechanics Patterns

### Streak System
- Tracks consecutive correct answers per team
- Persisted in database (Team.streak)
- Only applies in STREAK round type
- Bonus: 5-6 (+1), 7-9 (+2), 10+ (+3)

### Joker System
- One-time use per question
- Costs 2 points
- Random letter revealed from valid cells
- Full completion bonus: +3 if no jokers used

### Section-Based Turns (Round 1)
- Question has `section` field (e.g., "Player 1")
- UI displays "Turn: [Section]" during preview/active
- Enables fair turn-taking in single-device setup
