# Product Context: Quizco

## Why This Project Exists

Quizco is designed to make Bible learning interactive and competitive for children. Traditional quizzes can be static or require internet access, which isn't always available or reliable in all settings. Quizco solves this by providing a high-quality, real-time experience that runs entirely on a local network.

## Problems It Solves

- **Connectivity Issues:** By operating on a local Wi-Fi network, it avoids the latency and reliability problems of cloud-based quiz platforms in physical venues.
- **Engagement:** It provides a synchronous "game show" experience that keeps children engaged.
- **Complexity of Content:** It handles 9 varied question formats, including complex crosswords and chronology ordering, within a single, unified interface.
- **Host Control:** It gives the host complete control over the pace of the competition, including manual grading for open-ended questions.
- **Competition Structure:** Supports a 4-round national competition format with specific requirements per round.

## How It Works

1. **The Host** starts the server and logs into the Dashboard.
2. **Teams** (children) connect to the host's local IP on their laptops and enter their names.
3. **The Game Loop** progresses through phases:
   - **WAITING:** Lobby open, teams joining
   - **WELCOME:** Introduction screen
   - **ROUND_START:** New round announcement
   - **QUESTION_PREVIEW:** Question displayed, option reveal animation (for MCQ)
   - **QUESTION_ACTIVE:** Timer running, input allowed
   - **GRADING:** Input locked, grading in progress
   - **REVEAL_ANSWER:** Show correct answers with visual feedback
   - **ROUND_END:** End of round summary
   - **LEADERBOARD:** Scores displayed, with reset option for replay
4. **Interactive Crosswords:** Special round where teams fill out a grid, with progress synced to host. Includes Joker feature.

## User Experience Goals

- **Simplicity:** Minimal friction for children to join and participate.
- **Feedback:** Instant visual and auditory (if supported) confirmation for every action.
- **Accessibility:** Large buttons (minimum 48x48px) and clear, large fonts (minimum 18px) for young users.
- **Excitement:** Real-time leaderboard updates to foster friendly competition.
- **Fairness:** Section-based turns in Round 1 ensure all players get equal participation.

## Question Type Details

### Round 1: Standard (Individual Turns)
- **Fill-in-the-blanks:** Multiple blanks, each with dropdown of 4 options
- **Matching:** Match heroes to stories with drag-and-drop
- **Multiple Choice:** With animated option reveal

### Round 2: Chronology
- **Ordering Events:** Drag-and-drop to arrange events in chronological order
- **Scoring:** +1 per correct position, +3 bonus for perfect match
- Server-side shuffling ensures fair comparison

### Round 3: Streak Challenge
- **True/False:** Rapid-fire binary choices
- **Correct the Error:** Select wrong phrase and provide correction
- **Streak System:** Consecutive correct answers earn bonuses (5-6: +1, 7-9: +2, 10+: +3)

### Round 4: Final Crossword
- **Interactive Grid:** Fill in crossword with clues
- **Joker Feature:** Reveal one letter for -2 points
- **Completion Bonus:** +3 points for full completion without jokers
