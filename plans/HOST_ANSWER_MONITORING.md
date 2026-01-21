# Implementation Plan

[Overview]
Enhance the Host Dashboard to provide real-time feedback on team submissions, including counts, correctness, and a detailed list of all collected answers.

This implementation is needed to give the host better visibility into the progress of the competition during the "QUESTION_ACTIVE", "GRADING", and "REVEAL_ANSWER" phases. It allows the host to see exactly what each team submitted and how it was graded, which is crucial for monitoring and potentially adjusting manual grading. The high-level approach involves updating the `HostDashboard.tsx` component to fetch and display this information in real-time, leveraging the existing Socket.io state synchronization and creating a new API endpoint if necessary to fetch detailed answers for the current question.

[Types]  
No new base types are required, but existing interfaces in `HostDashboard.tsx` will be expanded to handle the detailed answer information.

- `interface CollectedAnswer`: Represents an answer submitted by a team for the current question.
  - `teamName: string`
  - `submittedContent: any`
  - `isCorrect: boolean | null`
  - `points: number`
  - `color: string`

[Files]
Modifying existing files to include the new UI elements and data fetching logic.

Detailed breakdown:

- Existing files to be modified:
  - `apps/client/src/components/HostDashboard.tsx`: Add UI components for submission count, correctness summary, and the detailed answer list. Implement data fetching/syncing for current question answers.
  - `apps/server/src/createQuizServer.ts`: Add a new endpoint to fetch all answers for a specific question in a competition.
  - `apps/client/src/locales/en.json` & `apps/client/src/locales/bg.json`: Add translations for the new UI labels.

[Functions]
Adding and modifying functions to support data retrieval and UI updates.

Detailed breakdown:

- New functions:
  - `fetchCurrentQuestionAnswers` in `HostDashboard.tsx`: Fetches the detailed list of answers for the current question from the server.
- Modified functions:
  - `useEffect` in `HostDashboard.tsx`: Add a effect to fetch answers when the phase changes to `GRADING` or `REVEAL_ANSWER`, or when `GAME_STATE_SYNC` indicates a change.

[Classes]
No class modifications are required as the logic fits into existing functional components and services.

[Dependencies]
No new dependencies are required.

[Implementation Order]
The implementation will follow a logical sequence from backend to frontend to ensure data availability.

1.  **Backend Enhancement**: Implement the `/api/competitions/:id/questions/:questionId/answers` endpoint in `apps/server/src/createQuizServer.ts`.
2.  **Internationalization**: Add new translation keys to `en.json` and `bg.json`.
3.  **Frontend Data Logic**: Update `HostDashboard.tsx` to include state for collected answers and the fetching logic.
4.  **Frontend UI - Statistics**: Add the submission count and correctness summary to the Host Dashboard's current status section.
5.  **Frontend UI - Detailed List**: Add a new section below the control panel or grading queue to display the detailed list of collected answers.
6.  **Verification**: Test with multiple simulated teams to ensure real-time updates and correct data display.

task_progress Items:

- [ ] Step 1: Add API endpoint to fetch question answers in server
- [ ] Step 2: Update translations for host dashboard enhancements
- [ ] Step 3: Implement data fetching logic in HostDashboard component
- [ ] Step 4: Add real-time submission statistics to HostDashboard UI
- [ ] Step 5: Add detailed collected answers list to HostDashboard UI
- [ ] Step 6: Verify implementation with live competition session
