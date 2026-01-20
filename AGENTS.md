SYSTEM INSTRUCTION FOR AI AGENTS: This file represents the Immutable Source of Truth for this project. You must read and internalize these rules before generating code. Deviating from the architectural constraints defined here is forbidden.

1. Project Context & Vision
   Role: Senior Full-Stack Architect specializing in Real-Time Systems & EdTech. Objective: Build a local-network, real-time Bible competition platform for children. Environment: Localhost (No Cloud). The system runs on a Host machine; clients connect via local Wi-Fi.

Core Architecture Stack
Monorepo Strategy: Turborepo or Yarn Workspaces.
Detailed Stack can be found in the SPECS.md file.

Frontend: React 18+ (Vite), TypeScript, Tailwind CSS.

Backend: Node.js (Express), Socket.io, TypeScript.

Database: PostgreSQL (Dockerized). Crucial: Uses Hybrid Relational + JSONB approach.

Communication: Socket.io (Events), REST (Initial load only).

2. Directory Structure (Monorepo)
   You must enforce this separation of concerns:

Plaintext

/
├── apps/
│ ├── client/ # React App (Vite)
│ │ ├── src/components # UI Components & Admin Views
│ │ ├── src/contexts # Game & Auth Contexts
│ │ └── src/locales # i18n Translations (en, bg)
│ └── server/ # Node.js Express App
│ ├── src/routes # REST Endpoints (Admin)
│ ├── src/services # Game Logic & Grading
│ ├── src/repositories # DB Access Layer (Prisma)
│ └── src/db # Database Init & Seeding
├── packages/
│ └── shared/ # SHARED TYPESCRIPT INTERFACES (Crucial)
│ └── types.ts # Shared GameState, SocketEvents, and DB Models
├── docker-compose.yml # PostgreSQL setup
└── AGENTS.md # This file 3. Coding Standards (Strict Mode)
General Rules
Strict TypeScript: No any. Define interfaces in packages/shared first.

Functional Purity: Use pure functions where possible. Isolate side effects.

Comments: Do not describe what code does. Describe why complex logic exists (especially around Socket race conditions).

No Flaky Tests: If a test relies on a timer, mock the timer. Do not use setTimeout in tests.

Frontend Rules
State Management: Use Context API + useReducer for Game State.

Forbidden: Redux (unless complexity explodes).

Styling: Tailwind CSS utility classes.

Child-Centric UI:

Target Size: Minimum touch target 48x48px (Fitts's Law).

Typography: Sans-serif ('Inter', 'Comic Neue'). Minimum font size 18px.

Feedback: Instant visual feedback for every interaction (active states, submission success).

Backend Rules
Server Authority: The Server is the Single Source of Truth.

Clients never calculate points.

Clients send INTENT (e.g., SUBMIT_ANSWER).

Server validates and broadcasts STATE (e.g., SCORE_UPDATED).

Drift Prevention: Do not trust client clocks. Use Date.now() deltas on the server.

4. Database Schema (Hybrid JSONB)
   We utilize PostgreSQL with JSONB to handle polymorphic question types (Standard vs. Crossword) without EAV anti-patterns.

Prisma Workflow (Mandatory):

- All schema changes MUST be made in `apps/server/prisma/schema.prisma`.
- Use `npx prisma migrate dev` to apply changes and generate migrations.
- Use `npx prisma generate` to update the Prisma Client after schema changes.
- DO NOT use manual SQL setup scripts or raw DDL execution for schema management.
- Use `apps/server/src/db/seed.ts` for database seeding, triggered via `npx prisma db seed`.
- For testing, ensure `DATABASE_URL` is correctly set to the test database.

DDL Reference (Use this exact schema in schema.prisma):

SQL

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE question_type AS ENUM ('CLOSED', 'MULTIPLE_CHOICE', 'OPEN_WORD', 'CROSSWORD', 'FILL_IN_THE_BLANKS', 'MATCHING', 'CHRONOLOGY', 'CORRECT_THE_ERROR');
CREATE TYPE grading_mode AS ENUM ('AUTO', 'MANUAL');

CREATE TABLE questions (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
round_id UUID REFERENCES rounds(id) ON DELETE CASCADE,
question_text TEXT NOT NULL,
type question_type NOT NULL,
points INTEGER DEFAULT 10,
time_limit_seconds INTEGER DEFAULT 30,
content JSONB NOT NULL, -- Stores options, correct index, or full crossword grid
grading grading_mode DEFAULT 'AUTO',
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
section TEXT -- Added for Round 1 player assignment
);
CREATE INDEX idx_questions_content ON questions USING GIN (content); 5. Real-Time State Machine (Socket.io)
The application relies on a Server-Authoritative State Machine.

5.1 Game Loop Phases
WAITING: Lobby open, teams joining.

QUESTION_ACTIVE: Input allowed. Timer running.

GRADING: Input locked. Host/Auto grading in progress.

LEADERBOARD: Scores displayed.

5.2 Critical Event Flows
JOIN_ROOM: Handshake. Server immediately emits GAME_STATE_SYNC.

GAME_STATE_SYNC:

Trigger: On Join or Reconnect.

Payload: { currentPhase, currentQuestion, timeRemaining, scores }.

Logic: Calculate timeRemaining on server (Now - StartTime). Do not send a full 30s timer to a reconnecting client.

SUBMIT_ANSWER:

Validation: Server checks if (gameState.phase === 'QUESTION_ACTIVE').

Security: Reject answers submitted after the phase changes.

CROSSWORD_PROGRESS:

Throttling: Frontend must throttle this event (e.g., every 5 seconds or 3 words), NOT on every keystroke.

JOKER_REVEAL:

Trigger: Player requests a letter.
Validation: Check points >= cost, has not used joker yet.
Action: Deduct 2 points, reveal letter, emit GRID_UPDATE.

6. Development Workflow (Agentic Cycle)
   When asked to build a feature, follow this loop:

PLAN (Spec Mode): Create/Update a SPEC.md for the module. Define the interface and logic before writing code.

SCAFFOLD: Create necessary files and shared types.

EXECUTE: Implement logic. **MANDATORY: Write unit tests for all new logic and state transitions.**

VERIFY: Run and pass all tests. Generate a test (Playwright/Vitest) to prove the logic works (e.g., "Verify timer emits TIME_UP at exactly 0s"). Logic without accompanying tests is forbidden.

7. Forbidden Patterns (Do Not Use)
   No Internet Dependencies: Do not use Auth0, Firebase, or CDNs. This must run on an isolated LAN.

No var: Use const or let.

No Client-Side Authority: Never trust the client to tell you the score or if an answer is correct.

No Fragile Selectors: Use data-testid for testing, not CSS class names.

No Hardcoded Strings: Use translation keys (i18next) for all UI text.

8. Internationalization (i18n)
   Supported Languages: English (`en`), Bulgarian (`bg`).

Standard: Use `react-i18next` for frontend and consistent error codes for backend.

Translations: Always provide both `en` and `bg` translations in `apps/client/src/locales/` for any new UI element.

Usage: Use the `useTranslation` hook: `const { t } = useTranslation();`.

9. Specific Feature Implementation Guides
   Crosswords
   Use react-crossword (or similar).

Wrapper: Wrap the component to capture onCellChange. Update a local ref.

Sync: Use useEffect to emit CROSSWORD_PROGRESS periodically.

Submission: On completion, send the full grid state to the server. The server compares the JSON grid against the DB Master JSON (coordinate by coordinate).

Manual Grading
If question.grading === 'MANUAL', the system pauses after the timer.

Host UI receives MANUAL_GRADING_REQ.

Host accepts/rejects.

Server updates answers.is_correct -> Recalculates Leaderboard -> Emits SCORE_UPDATE.

Offline Resilience
On every Question change, the Server should dump GameState to a local backup.json file.

On server restart, check for backup.json to resume the session.

Round 1: Individual Play
Questions must be tagged with a `section`.
The Client UI must prominently display "Turn: Player [Section]".
Only answers submitted for the correct section are valid (though enforced via UI/Social contract in 1-device setup).

Round 2: Chronology
Use drag-and-drop.
Scoring: +1 per correct index, +3 for perfect match.

Round 3: Streaks
Track consecutive correct answers in `GameState`.
Bonus applied during grading: 5-6 (+1), 7-9 (+2), 10 (+3).
