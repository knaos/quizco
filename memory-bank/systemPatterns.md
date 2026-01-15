# System Patterns: Quizco

## Architecture Overview

Quizco follows a **Monorepo** strategy with a clear separation between frontend, backend, and shared packages.

- **Frontend:** React (Vite) single-page application.
- **Backend:** Node.js Express server with Socket.io for real-time communication.
- **Database:** PostgreSQL for persistent storage, using a hybrid Relational + JSONB approach.
- **Real-Time:** Server-authoritative state machine via Socket.io.

## Key Technical Decisions

### 1. Server Authority

The server is the single source of truth. Clients send "Intent" (e.g., `SUBMIT_ANSWER`), and the server validates it against the current game state before broadcasting the updated "State" (e.g., `SCORE_UPDATED`).

### 2. Hybrid Database Schema

PostgreSQL is used with JSONB to handle polymorphic question types (Standard vs. Crossword) without complex EAV patterns. This allows storing a full crossword grid as a single document.

### 3. Real-Time State Machine

The game moves through defined phases:

- `WAITING` (Lobby)
- `QUESTION_ACTIVE` (Timer running, input allowed)
- `GRADING` (Manual or Auto grading in progress)
- `LEADERBOARD` (Scores displayed)

### 4. Drift Prevention

Client clocks are not trusted. The server tracks the official start time, and clients calculate remaining time based on server-provided deltas.

## Component Patterns (Frontend)

- **Context API + useReducer:** Primary state management for the Game State.
- **Feature-Based Structure:** Code organized by domain (e.g., Crossword, Admin, Player).
- **Atomic UI Components:** Reusable buttons, inputs, and layout wrappers optimized for child accessibility.

## Event Patterns (Socket.io)

- `GAME_STATE_SYNC`: Full state dump on join/reconnect.
- `SUBMIT_ANSWER`: Client submission with server-side validation of the current phase.
- `CROSSWORD_PROGRESS`: Throttled updates (every 5 seconds or 3 words) from client to server.

## Directory Structure

```
/
├── apps/
│   ├── client/         # React SPA
│   └── server/         # Node.js Server
├── packages/
│   └── shared/         # Shared TypeScript interfaces & types
└── memory-bank/        # Documentation
```
