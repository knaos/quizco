# Project Brief: Quizco

## Overview

Quizco is a local-network, real-time Bible competition platform designed for children. It enables a host to conduct synchronous, multiplayer quizzes where teams of children use laptops to answer various types of questions.

## Core Requirements

- **Local Network Operation:** The system must run on a host machine (server/admin) and be accessible by clients (participant laptops) via a local Wi-Fi network (localhost environment, no cloud dependencies).
- **Real-Time Synchronicity:** All participant devices must be synchronized with the host's control, moving through game phases together.
- **Multiple Question Types:** Support for 9 question types: CLOSED, MULTIPLE_CHOICE, OPEN_WORD, CROSSWORD, FILL_IN_THE_BLANKS, MATCHING, CHRONOLOGY, TRUE_FALSE, and CORRECT_THE_ERROR.
- **4-Round Competition Structure:**
  - Round 1 (Standard): Fill-in-the-blanks, Matching, Multiple Choice (Individual turns via `section` field)
  - Round 2 (Chronology): Drag-and-drop ordering of events
  - Round 3 (Streak/True-False): True/False questions with streak bonuses, Correct-the-Error
  - Round 4 (Crossword): Interactive crossword with Joker mechanic
- **Child-Friendly UI:** The interface must be optimized for children, with large touch targets, readable typography, and instant feedback.
- **Server-Authoritative State:** The server is the single source of truth for scores, timing, and game state.

## Goals

- Create an engaging and competitive environment for children to learn the Bible.
- Ensure robust performance on potentially unstable local Wi-Fi networks.
- Provide a seamless experience for both the host (dashboard control) and participants (player view).
- Support replay capability (reset scores/streaks but keep teams for new game).

## Implemented Features

### Completed Question Types (9 total)
1. **CLOSED** - Simple yes/no or single word questions
2. **MULTIPLE_CHOICE** - Single or multi-select with option reveal animation
3. **OPEN_WORD** - Free text input (manual grading)
4. **CROSSWORD** - Interactive grid with clues, Joker support
5. **FILL_IN_THE_BLANKS** - Multiple blanks with dropdown options per blank
6. **MATCHING** - Drag-and-drop matching with visual feedback
7. **CHRONOLOGY** - Drag-and-drop ordering with complex scoring
8. **TRUE_FALSE** - Rapid-fire true/false buttons
9. **CORRECT_THE_ERROR** - Select erroneous phrase and provide correction

### Game Mechanics
- **Streak System:** Tracks consecutive correct answers, awards bonus points (5-6: +1, 7-9: +2, 10+: +3)
- **Joker System:** In Crossword round, teams can reveal one letter for -2 points
- **Full Completion Bonus:** +3 points for crossword completion without jokers
- **Round-based Scoring:** Streak bonuses only apply in STREAK round type

### Technical Implementation
- Monorepo with Turborepo (apps/client, apps/server, packages/shared)
- PostgreSQL with JSONB for polymorphic questions
- Socket.io for real-time communication
- Server-authoritative state machine with 9 game phases
- Timer service with pause/resume capability
- State persistence for crash recovery
- Comprehensive E2E and unit tests
