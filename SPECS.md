Project: Local-Network Bible Quiz Platform

1. System Overview
   Goal: A synchronous, local-network multiplayer competition app. Roles:

Host (Admin): Controls flow, grades open answers, views live dashboard.

Teams (Players): Join via code, answer questions (MCQ/Open/Crossword) on laptops. Infrastructure: Local Wi-Fi (No Internet). Dockerized Database.

2. Tech Stack & Constraints
   Layer Technology Constraints
   Frontend React 18+, Vite, Tailwind CSS No external fonts/CDN. Accessible UI (Kids).
   Backend Node.js, Express Server Authority (Single Source of Truth).
   Comms Socket.io Events must handle reconnects without state loss.
   Database PostgreSQL With Prisma
   Language TypeScript (Strict) Shared types (/packages/shared) for FE/BE.
   Deploy Docker Compose DB + Adminer only. App runs locally (localhost).
3. Database Schema
   Principle: Relational for structure, JSONB for content.
   3.1. Tables
   competitions: id (UUID), title, host_pin, status (DRAFT/ACTIVE/COMPLETED).
   teams: id (UUID), competition_id, name, color, score (computed).

rounds: id (UUID), type (STANDARD/CROSSWORD), order_index.

questions:

id (UUID), round_id.

type: CLOSED | MULTIPLE_CHOICE | OPEN_WORD | CROSSWORD.

grading: AUTO | MANUAL.

time_limit_seconds: Int.

content: JSONB (See 3.2).

answers:

team_id, question_id, submitted_content (JSONB).

is_correct (Boolean | Null). Null = Pending Manual Review.

score_awarded (Int).

3.2. JSONB Structures (questions.content)
MCQ: { "options": ["A", "B", "C"], "correctIndex": 1 }

Open: { "acceptedAnswers": ["Jesus", "Christ", "Messiah"] }

Crossword:

JSON

{
"grid": [ [null, "A", "R", "K", null], ... ],
"clues": { "across": { "1": "Noah's boat" } },
"solutionHash": "..."
} 4. Game State Machine (Server Authoritative)
The Client never calculates score or time. It simply renders the payload from GAME_STATE_SYNC.

4.1. Phases
WAITING: Lobby open. Teams joining.

QUESTION_PREVIEW: Title/Category shown. Input locked.

QUESTION_ACTIVE: Timer running. Inputs open.

GRADING: Timer expired or all answered. Server grading (or waiting for Host).

LEADERBOARD: Scores displayed.

ROUND_ENDED: Summary.

4.2. Socket Events API
Event Direction Payload Notes
JOIN_ROOM Client->Srvr {teamName, code} Handle duplicates gracefully.
GAME_STATE_SYNC Srvr->Client {phase, currentQ, timeRemaining} Sent on Connect/Reconnect.
HOST_START_Q Host->Srvr {questionId} Triggers QUESTION_PREVIEW.
HOST_START_TIMER Host->Srvr {} Triggers QUESTION_ACTIVE.
SUBMIT_ANSWER Client->Srvr {qId, answer} Ignored if phase != ACTIVE.
SCORE_UPDATE Srvr->Client {newScore, isCorrect} Private message to team.
MANUAL_GRADING Srvr->Host {answerId, text} Queue for manual review.
GRADE_DECISION Host->Srvr {answerId, accepted: bool} Updates DB & Score.

Експортиране в Таблици

5. UI/UX Specifications
   5.1. Player View (Child-Friendly)
   Typography: Sans-serif (Inter/Comic Neue), min 18px size.

Touch Targets: Min 48x48px.

States:

Active: Clear inputs, large "Submit" button.

Submitted: Blocking overlay ("Waiting for others...").

Result: Green background (Correct) / Red (Incorrect).

Debounce: Prevent double-submission on all buttons.

5.2. Host Dashboard
Live Leaderboard: Real-time ranking.

Manual Grading Queue: Modal for OPEN_WORD answers requiring validation.

Controls: "Next Question", "Start Timer", "Pause".

Crossword Monitor: Progress bars per team (updated via throttled CROSSWORD_PROGRESS events).

6. Logic & Rules
   6.1. Timer Logic
   Source of Truth: Server Date.now().

Drift Handling: Server sends timeRemaining (not startTime) on sync.

End Condition: When Date.now() >= end_time, Server forces transition to GRADING.

6.2. Scoring
Standard: Fixed points (e.g., 10).

Crossword: Points per word + Bonus for completion.

Speed Bonus (Optional): Base + (TimeRemaining \* Multiplier).

6.3. Crossword Implementation
Lib: react-crossword (Wrapped).

Optimization: Do not emit socket event on every keystroke.

Sync: Emit CROSSWORD_PROGRESS every 3 words or 10s. Emit SUBMIT on full completion.

7. Implementation Roadmap (Agent Instructions)
   Scaffold: Monorepo (Client/Server/Shared). Setup Docker Postgres.

Schema: Create SQL migrations with JSONB support.

Server Core: Implement GameManager class (State Machine).

Socket Layer: Implement JOIN, SYNC, and DISCONNECT (reconnect logic).

Host UI: Build Control Panel & Grading Queue.

Player UI: Build Question Renderers (MCQ, Open, Crossword).

Hardening: Add "Late Joiner" logic (sync time immediately).

8. Directory Structure
   Plaintext
   /
   ├── docker-compose.yml
   ├── packages
   │ ├── client # Vite + React
   │ │ ├── src/components/game-types/ # (Crossword, MCQ)
   │ │ └── src/hooks/useSocket.ts
   │ ├── server # Express + Socket.io
   │ │ ├── src/services/GameManager.ts
   │ │ └── src/db/schema.sql
   │ └── shared # TypeScript Interfaces
   │ └── index.ts # export type GameState...
