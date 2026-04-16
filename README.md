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
└── docker-compose.yml # Local/self-hosted application stack
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

## Self-Hosting

The repo now includes a production-oriented container path for a single-host deployment. The `app` container builds the monorepo, serves the Vite client from Express, exposes Socket.io on the same origin, and runs Prisma migrations at startup. That keeps deployment simple for a home server or Synology NAS.

### Quick Start

1. Copy the deployment env template:

   ```bash
   cp .env.example .env
   ```

2. Set a real `ADMIN_PASSWORD` in `.env`.
   Also set a strong `HOST_PASSWORD`, `AUTH_TOKEN_SECRET`, and the public origin in `ALLOWED_ORIGINS`.

3. Build and start the stack:

   ```bash
   docker compose up -d --build
   ```

4. Open the app on your host machine or LAN:

   ```text
   http://YOUR-HOST-IP:4000
   ```

Routes:

- `/play` for teams
- `/host` for the quiz host
- `/admin` for content management
- `/audience` for audience mode

### Initial Data

To seed the database in the deployed stack:

```bash
docker compose run --rm app npx prisma db seed --schema apps/server/prisma/schema.prisma
```

### Synology Notes

- Use the repository root as the build context for the Compose project.
- Persist both the Postgres volume and `/app/backups` if you want session recovery across container replacement.
- If you already run a reverse proxy on Synology, publish `QUIZCO_PORT` on an internal port and proxy HTTP/WebSocket traffic to it.
- If you want the app on port 80 or 443 externally, handle that in the Synology reverse proxy rather than changing the internal container port.

## Internet Exposure

If you expose Quizco on the public internet, the production auth and origin settings are now mandatory rather than optional.

Set these in `.env` before starting the stack:

- `HOST_PASSWORD`: password for `/host`
- `ADMIN_PASSWORD`: password for `/admin`
- `AUTH_TOKEN_SECRET`: long random secret used to sign server-issued auth tokens
- `ALLOWED_ORIGINS`: comma-separated list of allowed browser origins, for example `https://quizco.example.com`

Recommended setup:

- Put the app behind a reverse proxy that terminates HTTPS
- Proxy WebSocket traffic as well as normal HTTP traffic
- Publish only the app port; do not expose Postgres publicly
- Use a long random `AUTH_TOKEN_SECRET` and non-default passwords

For Synology reverse proxy, point your public host name to:

```text
http://YOUR-NAS-IP:${SYNOLOGY_APP_PORT}
```

and set:

```text
ALLOWED_ORIGINS=https://your-public-domain.example
```

The server now refuses production startup when default passwords, the default token secret, or missing `ALLOWED_ORIGINS` are detected.

### Synology Override

The repo also includes [docker-compose.synology.yml](/Users/atanaskaynarov/Documents/Projects/quizco/.worktrees/self-hosting/docker-compose.synology.yml) so you can keep NAS-specific paths and ports out of the base stack.

It changes two things:

- Replaces Docker named volumes with Synology host-mounted paths under `/volume1/...`
- Publishes the app on `SYNOLOGY_APP_PORT` and stops exposing Postgres outside Docker by default

Run it like this:

```bash
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.synology.yml up -d --build
```

If you use Synology's reverse proxy, point it at:

```text
http://YOUR-NAS-IP:${SYNOLOGY_APP_PORT}
```

That keeps Quizco listening internally on container port `4000` while Synology handles the public URL and HTTPS.

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
