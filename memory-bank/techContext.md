# Tech Context: Quizco

## Development Environment

- **Operating System:** Linux (Ubuntu/Debian)
- **Runtime:** Node.js 18+
- **Package Manager:** npm (using Yarn Workspaces/Turborepo)
- **Monorepo Tool:** Turborepo

## Core Technologies

### Frontend

| Technology | Purpose |
|------------|---------|
| React 18 | UI Framework |
| Vite | Build tool and dev server |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| Socket.io-client | Real-time communication |
| react-i18next | Internationalization |
| @dnd-kit | Drag and drop for Chronology/Matching |
| lucide-react | Icons |

### Backend

| Technology | Purpose |
|------------|---------|
| Node.js | Runtime |
| Express | HTTP server |
| Socket.io | Real-time communication |
| TypeScript | Type safety |
| Prisma | Database ORM |
| Vitest | Testing framework |

### Database

| Technology | Purpose |
|------------|---------|
| PostgreSQL | Primary database |
| Docker | Containerization |
| JSONB | Polymorphic question content |

## Project Structure

```
apps/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/           # Admin panel components
│   │   │   │   └── editors/    # Question type editors
│   │   │   ├── player/         # Player view components
│   │   │   └── *.tsx           # Main view components
│   │   ├── contexts/           # React contexts
│   │   ├── locales/            # i18n translations (en, bg)
│   │   ├── types/              # TypeScript declarations
│   │   ├── App.tsx             # Main app component
│   │   ├── i18n.ts             # i18n configuration
│   │   └── socket.ts           # Socket client setup
│   └── package.json
├── server/
│   ├── src/
│   │   ├── db/
│   │   │   ├── prisma.ts       # Prisma client
│   │   │   ├── seed.ts         # Database seeding
│   │   │   └── schema.sql      # SQL schema reference
│   │   ├── middleware/         # Express middleware
│   │   ├── repositories/        # Data access layer
│   │   ├── routes/             # REST endpoints
│   │   ├── services/           # Business logic
│   │   ├── test/               # E2E tests
│   │   ├── utils/              # Utilities
│   │   ├── createQuizServer.ts # Server setup
│   │   ├── GameManager.ts      # Core game logic
│   │   └── index.ts            # Entry point
│   ├── prisma/
│   │   └── schema.prisma       # Database schema
│   └── package.json
packages/
└── shared/
    └── src/
        └── index.ts             # Shared TypeScript types
```

## Technical Constraints

- **Offline First (LAN):** No external dependencies like Auth0, Firebase, or CDNs
- **Local IP Discovery:** Server provides local LAN IP for client connections
- **Server Authority:** All game logic and scoring happens server-side
- **Child-Centric Design:** UI requirements: 48px+ touch targets, 18px+ fonts

## Key Dependencies

### Production Dependencies

**Frontend (apps/client/package.json):**
- react, react-dom
- socket.io-client
- i18next, react-i18next
- @dnd-kit/core, @dnd-kit/sortable
- lucide-react
- tailwindcss

**Backend (apps/server/package.json):**
- express
- socket.io
- @prisma/client
- dotenv

### Development Dependencies

- typescript
- vitest
- prisma
- tailwindcss
- eslint

## Database Schema

### Key Models

```prisma
model Competition {
  id        String   @id @default(uuid())
  title     String
  host_pin  String
  status    CompetitionStatus
  rounds    Round[]
  teams     Team[]
}

model Round {
  id            String   @id @default(uuid())
  competitionId String
  orderIndex    Int
  type          RoundType  // STANDARD, CROSSWORD, SPEED_RUN, STREAK
  title         String?
  questions     Question[]
}

model Question {
  id               String       @id @default(uuid())
  roundId          String
  questionText     String
  type             QuestionType // 9 types supported
  points           Int
  timeLimitSeconds Int
  content          Json         // Type-specific content
  grading          GradingMode  // AUTO or MANUAL
  section          String?      // For Round 1 turns
}

model Team {
  id            String   @id @default(uuid())
  competitionId String
  name          String
  color         String?
  streak        Int      @default(0)  // Streak tracking
  answers       Answer[]
}

model Answer {
  id               String   @id @default(uuid())
  teamId           String
  questionId       String
  roundId          String
  submittedContent Json
  isCorrect        Boolean?
  scoreAwarded     Int
}
```

### Enums

```prisma
enum QuestionType {
  CLOSED
  MULTIPLE_CHOICE
  OPEN_WORD
  CROSSWORD
  FILL_IN_THE_BLANKS
  MATCHING
  CHRONOLOGY
  TRUE_FALSE
  CORRECT_THE_ERROR
}

enum RoundType {
  STANDARD
  CROSSWORD
  SPEED_RUN
  STREAK
}

enum GradingMode {
  AUTO
  MANUAL
}
```

## Socket Events

### Host Events
- `HOST_JOIN_ROOM` - Host joins competition
- `HOST_START_QUESTION` - Push question to players
- `HOST_START_TIMER` - Start countdown
- `HOST_NEXT` - Advance game state
- `HOST_GRADE_DECISION` - Manual grading decision
- `HOST_PAUSE_TIMER` / `HOST_RESUME_TIMER`

### Player Events
- `JOIN_ROOM` - Team joins competition
- `RECONNECT_TEAM` - Reconnect to existing session
- `SUBMIT_ANSWER` - Submit answer
- `CROSSWORD_PROGRESS` - Sync crossword progress
- `REQUEST_JOKER` - Request joker letter

### Server Events
- `GAME_STATE_SYNC` - Full state broadcast
- `TIMER_SYNC` - Timer updates
- `SCORE_UPDATE` - Score changes
- `JOKER_REVEAL` - Joker letter revealed
- `JOKER_ERROR` - Joker error (insufficient points)

## i18n Structure

Translations stored in `apps/client/src/locales/`:
- `en.json` - English translations
- `bg.json` - Bulgarian translations

Key translation namespaces:
- `common` - Shared UI elements
- `player` - Player view
- `host` - Host dashboard
- `admin` - Admin panel
- `game` - Game-specific terms
