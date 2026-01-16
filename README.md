# Quizco

Quizco is a local-network, real-time Bible competition platform designed for children. It enables a host to conduct synchronous, multiplayer quizzes where teams of children use laptops to answer various types of questions in real-time.

## 🌟 Key Features

- **Local Network Operation**: Designed to run on a host machine and accessible via local Wi-Fi. No internet connection or cloud dependencies required.
- **Real-Time Synchronicity**: Uses Socket.io to keep all participants in sync with the host's control.
- **Multiple Question Types**:
  - Closed-ended
  - Multiple-choice
  - Open-ended (Manual grading)
  - Interactive Crossword puzzles
- **Child-Centric UI**: Optimized for young users with large touch targets, readable typography (Inter/Comic Neue), and instant feedback.
- **Server-Authoritative**: The server is the single source of truth for all game states, scores, and timing.
- **Multilingual Support**: Fully localized in English and Bulgarian.

## 🏗️ Project Structure

This project is a monorepo managed with [Turborepo](https://turbo.build/).

```text
/
├── apps/
│   ├── client/       # React (Vite) frontend application
│   └── server/       # Node.js Express & Socket.io backend
├── packages/
│   └── shared/       # Shared TypeScript interfaces and types
└── docker-compose.yml # PostgreSQL database configuration
```

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Socket.io-client, react-i18next.
- **Backend**: Node.js, Express, TypeScript, Socket.io, Vitest.
- **Database**: PostgreSQL (Dockerized) with Prisma ORM.
- **Monorepo**: Turborepo, npm Workspaces.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Docker](https://www.docker.com/) and Docker Compose
- npm (v10 or higher)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/knaos/quizco.git
   cd quizco
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up the database:

   ```bash
   docker-compose up -d
   ```

4. Configure environment variables:
   - Create a `.env` file in `apps/server/` based on the database configuration.
   - Run Prisma migrations:
     ```bash
     cd apps/server
     npx prisma migrate dev
     ```

### Running the Application

From the root directory:

```bash
# Start all applications in development mode
npm run dev

# Build all applications
npm run build

# Run tests across the entire monorepo
npm run test
```

## 📜 Development Rules

This project follows strict architectural guidelines defined in `AGENTS.md`. Key principles include:

- **Server Authority**: Clients never calculate points or validate answers.
- **Strict TypeScript**: No usage of `any`.
- **Offline Resilience**: No external CDNs or cloud-based services.
- **Database Workflow**: All schema changes must be made via `apps/server/prisma/schema.prisma` and migrations.

## 🌍 Internationalization

Supported languages:

- 🇺🇸 English (`en`)
- 🇧🇬 Bulgarian (`bg`)

Translations are managed in `apps/client/src/locales/`.

## 📄 License

[MIT License](LICENSE)
