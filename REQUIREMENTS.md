AI Agent Specification: "First National Children's Bible Competition" Software

Project Objective: Build a desktop or web-based application to host a competitive Bible quiz for children aged 10-12. The software must manage teams, strictly enforce timing rules, and calculate complex scoring logic automatically.

1. Core Architecture & User Roles

Platform: Computer-based software.

User Roles:

Team: Composed of 4 children (each assigned to one specific study section).
+1

Coach: Adult supervisor (non-playing).

Administrator/Questor: Controls the game flow and validates Joker requests.

Input Methods: Primarily mouse/click-based (checkboxes, drag-and-drop, dropdowns). Keyboard typing is restricted solely to the Final Round.

2. Game Rules & Logic Specification
   The game consists of four distinct rounds. The AI must implement specific logic for question randomization, timing, and scoring for each.

Round 1: "Something for Everyone" (Individual Play)

Logic: The system must present questions individually to each of the 4 team members based on their assigned section.
+1

Volume: 9 questions per player (36 total).

Total Round Score Max: 84 points.

Question Types:

Fill in the Blanks:

Display: Sentence with exactly 3 gaps.

Input: Dropdown menu with 4 options per gap.

Scoring: 1 point per correct gap.

Timer: 20 seconds.

Match Heroes to Stories:

Display: 3 Heroes and 3 Stories.

Input: Connect/Map hero to story (1:1 ratio).

Scoring: 1 point per correct pair.

Timer: 20 seconds.

Finish the Story:

Display: Multiple choice question (A, B, C, D).

Scoring: 1 point for correct answer.

Timer: 15 seconds.

Round 2: "Biblical Chronology" (Collective Play)
Logic: Team collaboration. Questions cover all study sections.

Task: Sort a list of events into chronological order.

Volume: 4 tasks (Two with 10 events, two with 12 events).

Timer: 5 minutes (for 10 events) or 6 minutes (for 12 events).

Scoring Engine:

Standard: 1 point for every event placed in the absolute correct index.

Bonus: +3 points if the entire timeline is 100% correct.

Max Score: 56 points.

Round 3: "True or False?" (Collective Play)
Logic: 30 consecutive questions divided into 3 segments of 10.

Total Round Score Max: 43 points.

Segments:

True or False (Q1-10):

Input: Binary choice (True/False).

Timer: 10 seconds.

Score: 1 point per correct answer.

Select the Correct Statement (Q11-20):

Input: Choose the correct statement out of two options regarding a specific character.

Timer: 15 seconds.

Score: 1 point per correct answer.

Streak Bonus Logic: The AI must track consecutive correct answers within this segment:

5-6 in a row: +1 point.

7-9 in a row: +2 points.

10 in a row: +3 points.

Correct the Error (Q21-30):

Display: Sentence with exactly 1 factual error.

Input: Two-step interaction:

Click to identify the wrong phrase (1 point).

Select the correction from a list (1 point).

Timer: 20 seconds.

Round 4: "Final" (Crossword)
Logic: A crossword puzzle interface.

Volume: 8 words (2 from each study section).

Input: Keyboard typing allowed here.

Timer: 4 minutes (240 seconds).

Scoring Engine:

Standard: 3 points per correct word.

Bonus: +3 points for full completion without jokers.

Joker Mechanic: A "Reveal Letter" button must be available.

Cost: Deducts 2 points from score.

Limit: Can be used only once.

Max Score: 27 points.

3. Technical Requirements Summary
   Timer: Strict countdowns that lock input upon expiry.

State Management: Must track individual player turns (Round 1) vs. Team turns (Rounds 2-4).

Data Structure: Questions must be tagged by:

Type (e.g., FillBlank, Chronology)

Section (for assigning to specific kids in Round 1)

Difficulty/Round

UI/UX:

Clean, readable font for children.

Visual indicators for "Correct/Incorrect" answers after submission.

Real-time score display.

Next Step: Would you like me to generate a JSON schema or database structure for storing these questions based on the types defined above?
