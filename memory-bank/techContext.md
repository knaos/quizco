# Tech Context: Quizco

## Development Environment

- **Operating System:** Windows 11
- **IDE:** Visual Studio Code
- **Runtime:** Node.js 18+
- **Package Manager:** npm (using Workspaces)
- **Monorepo Tool:** Turborepo

## Core Technologies

### Frontend

- **Framework:** React 18 (Vite)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State Management:** React Context + useReducer
- **Communication:** Socket.io-client
- **Internationalization:** react-i18next (English, Bulgarian)

### Backend

- **Runtime:** Node.js
- **Framework:** Express
- **Language:** TypeScript
- **Real-Time:** Socket.io
- **Testing:** Vitest

### Database

- **Engine:** PostgreSQL
- **Setup:** Dockerized (see `docker-compose.yml`)
- **Key Features:** UUID-ossp extension, JSONB for polymorphic questions.

## Technical Constraints

- **Offline First (LAN):** No external dependencies like Auth0, Firebase, or CDNs. Everything must run on the local Wi-Fi.
- **Local IP Discovery:** The server must provide its local LAN IP for clients to connect.
- **Server Authority:** All game logic and scoring must happen on the server.
- **Child-Centric Design:** Strict UI requirements for touch targets (48px+) and font sizes (18px+).

## Key Dependencies

- `socket.io` & `socket.io-client`
- `react-i18next`
- `tailwindcss`
- `pg` (PostgreSQL client)
- `turbo` (Build system)
