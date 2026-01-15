# Product Context: Quizco

## Why This Project Exists

Quizco is designed to make Bible learning interactive and competitive for children. Traditional quizzes can be static or require internet access, which isn't always available or reliable in all settings. Quizco solves this by providing a high-quality, real-time experience that runs entirely on a local network.

## Problems It Solves

- **Connectivity Issues:** By operating on a local Wi-Fi network, it avoids the latency and reliability problems of cloud-based quiz platforms in physical venues.
- **Engagement:** It provides a synchronous "game show" experience that keeps children engaged.
- **Complexity of Content:** It handles varied question formats, including complex crosswords, within a single, unified interface.
- **Host Control:** It gives the host complete control over the pace of the competition, including manual grading for open-ended questions.

## How It Works

1. **The Host** starts the server and logs into the Dashboard.
2. **Teams** (children) connect to the host's local IP on their laptops and enter their names.
3. **The Game Loop** begins:
   - **Waiting:** Teams join the lobby.
   - **Question Active:** The host pushes a question; teams have a time limit to answer.
   - **Grading:** Automatic grading for MCQ/Closed; manual grading for open-ended.
   - **Leaderboard:** Real-time scores are displayed to all participants.
4. **Interactive Crosswords:** A special round where teams fill out a grid, with progress synced to the host.

## User Experience Goals

- **Simplicity:** Minimal friction for children to join and participate.
- **Feedback:** Instant visual and auditory (if supported) confirmation for every action.
- **Accessibility:** Large buttons (minimum 48x48px) and clear, large fonts (minimum 18px) for young users.
- **Excitement:** Real-time leaderboard updates to foster friendly competition.
