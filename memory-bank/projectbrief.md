# Project Brief: Quizco

## Overview

Quizco is a local-network, real-time Bible competition platform designed for children. It enables a host to conduct synchronous, multiplayer quizzes where teams of children use laptops to answer various types of questions.

## Core Requirements

- **Local Network Operation:** The system must run on a host machine (server/admin) and be accessible by clients (participant laptops) via a local Wi-Fi network (localhost environment, no cloud dependencies).
- **Real-Time Synchronicity:** All participant devices must be synchronized with the host's control, moving through game phases together.
- **Multiple Question Types:** Support for closed-ended, multiple-choice, open-ended (manual grading), and interactive crossword puzzles.
- **Child-Friendly UI:** The interface must be optimized for children, with large touch targets, readable typography, and instant feedback.
- **Server-Authoritative State:** The server is the single source of truth for scores, timing, and game state.

## Goals

- Create an engaging and competitive environment for children to learn the Bible.
- Ensure robust performance on potentially unstable local Wi-Fi networks.
- Provide a seamless experience for both the host (dashboard control) and participants (player view).
