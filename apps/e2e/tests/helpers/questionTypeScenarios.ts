import { expect, type Browser, type Page } from "@playwright/test";
import {
  clickHostNextAndExpectPhase,
  createAdminApi,
  createCompetitionWithQuestions,
  createHostAndPlayers,
  deleteCompetition,
  movePreviewToActive,
  moveToQuestionPreview,
  type QuestionDraft,
} from "./gameHarness";

export interface QuestionTypeScenario {
  name: string;
  type: QuestionDraft["type"];
  questions: [QuestionDraft, QuestionDraft];
  submitPlayerOne: (page: Page, questionIndex: number) => Promise<void>;
  submitPlayerTwo: (page: Page, questionIndex: number) => Promise<void>;
  multipleChoiceOptions?: number;
  expectTeamOneLeads: boolean;
}

export const QUESTION_TYPE_SCENARIOS: Record<string, QuestionTypeScenario> = {
  CLOSED: {
    name: "CLOSED",
    type: "CLOSED",
    questions: [
      {
        questionText: "Closed question 1",
        type: "CLOSED",
        content: { options: ["Jerusalem"] },
      },
      {
        questionText: "Closed question 2",
        type: "CLOSED",
        content: { options: ["Bethlehem"] },
      },
    ],
    submitPlayerOne: async (page, questionIndex) => {
      await page.getByTestId("player-open-answer-input").fill(
        questionIndex === 0 ? "Jerusalem" : "Bethlehem",
      );
      await page.getByTestId("player-submit-answer").click();
    },
    submitPlayerTwo: async (page) => {
      await page.getByTestId("player-open-answer-input").fill("Wrong");
      await page.getByTestId("player-submit-answer").click();
    },
    expectTeamOneLeads: true,
  },
  MULTIPLE_CHOICE: {
    name: "MULTIPLE_CHOICE",
    type: "MULTIPLE_CHOICE",
    questions: [
      {
        questionText: "MCQ question 1",
        type: "MULTIPLE_CHOICE",
        content: {
          options: ["Wrong", "Correct"],
          correctIndices: [1],
        },
      },
      {
        questionText: "MCQ question 2",
        type: "MULTIPLE_CHOICE",
        content: {
          options: ["Correct", "Wrong"],
          correctIndices: [0],
        },
      },
    ],
    submitPlayerOne: async (page, questionIndex) => {
      const correctLabel = questionIndex === 0 ? "Correct" : "Correct";
      await page
        .locator('[data-testid^="player-choice-"]', { hasText: correctLabel })
        .first()
        .click();
      await page.getByTestId("player-submit-answer").click();
    },
    submitPlayerTwo: async (page, _questionIndex) => {
      const wrongLabel = "Wrong";
      await page
        .locator('[data-testid^="player-choice-"]', { hasText: wrongLabel })
        .first()
        .click();
      await page.getByTestId("player-submit-answer").click();
    },
    multipleChoiceOptions: 2,
    expectTeamOneLeads: true,
  },
  OPEN_WORD: {
    name: "OPEN_WORD",
    type: "OPEN_WORD",
    questions: [
      {
        questionText: "Open question 1",
        type: "OPEN_WORD",
        content: { answer: "Faith" },
      },
      {
        questionText: "Open question 2",
        type: "OPEN_WORD",
        content: { answer: "Grace" },
      },
    ],
    submitPlayerOne: async (page, questionIndex) => {
      await page.getByTestId("player-open-answer-input").fill(
        questionIndex === 0 ? "Faith" : "Grace",
      );
      await page.getByTestId("player-submit-answer").click();
    },
    submitPlayerTwo: async (page) => {
      await page.getByTestId("player-open-answer-input").fill("Wrong");
      await page.getByTestId("player-submit-answer").click();
    },
    expectTeamOneLeads: true,
  },
  CROSSWORD: {
    name: "CROSSWORD",
    type: "CROSSWORD",
    questions: [
      {
        questionText: "Crossword question 1",
        type: "CROSSWORD",
        content: {
          grid: [["A"]],
          clues: {
            across: [{ number: 1, x: 0, y: 0, direction: "across", clue: "Letter A", answer: "A" }],
            down: [],
          },
        },
      },
      {
        questionText: "Crossword question 2",
        type: "CROSSWORD",
        content: {
          grid: [["B"]],
          clues: {
            across: [{ number: 1, x: 0, y: 0, direction: "across", clue: "Letter B", answer: "B" }],
            down: [],
          },
        },
      },
    ],
    submitPlayerOne: async (page, questionIndex) => {
      await page.getByTestId("crossword-cell-0-0").fill(questionIndex === 0 ? "A" : "B");
      await page.getByTestId("crossword-submit").click();
    },
    submitPlayerTwo: async (page) => {
      await page.getByTestId("crossword-cell-0-0").fill("Z");
      await page.getByTestId("crossword-submit").click();
    },
    expectTeamOneLeads: true,
  },
  FILL_IN_THE_BLANKS: {
    name: "FILL_IN_THE_BLANKS",
    type: "FILL_IN_THE_BLANKS",
    questions: [
      {
        questionText: "Fill blanks question 1",
        type: "FILL_IN_THE_BLANKS",
        content: {
          text: "{0} {1}",
          blanks: [
            {
              options: [
                { value: "God", isCorrect: true },
                { value: "Wrong", isCorrect: false },
              ],
            },
            {
              options: [
                { value: "Loves", isCorrect: true },
                { value: "Hates", isCorrect: false },
              ],
            },
          ],
        },
      },
      {
        questionText: "Fill blanks question 2",
        type: "FILL_IN_THE_BLANKS",
        content: {
          text: "{0} {1}",
          blanks: [
            {
              options: [
                { value: "Jesus", isCorrect: true },
                { value: "Wrong", isCorrect: false },
              ],
            },
            {
              options: [
                { value: "Saves", isCorrect: true },
                { value: "Breaks", isCorrect: false },
              ],
            },
          ],
        },
      },
    ],
    submitPlayerOne: async (page, questionIndex) => {
      if (questionIndex === 0) {
        await page.getByTestId("fill-blank-0").selectOption("God");
        await page.getByTestId("fill-blank-1").selectOption("Loves");
      } else {
        await page.getByTestId("fill-blank-0").selectOption("Jesus");
        await page.getByTestId("fill-blank-1").selectOption("Saves");
      }
      await page.getByTestId("player-submit-answer").click();
    },
    submitPlayerTwo: async (page) => {
      await page.getByTestId("fill-blank-0").selectOption("Wrong");
      await page.getByTestId("fill-blank-1").selectOption({ index: 1 });
      await page.getByTestId("player-submit-answer").click();
    },
    expectTeamOneLeads: true,
  },
  MATCHING: {
    name: "MATCHING",
    type: "MATCHING",
    questions: [
      {
        questionText: "Matching question 1",
        type: "MATCHING",
        content: {
          heroes: [
            { id: "h1", text: "Left One", type: "hero" },
            { id: "h2", text: "Left Two", type: "hero" },
          ],
          stories: [
            { id: "s1", text: "Right One", type: "story", correspondsTo: "h1" },
            { id: "s2", text: "Right Two", type: "story", correspondsTo: "h2" },
          ],
        },
      },
      {
        questionText: "Matching question 2",
        type: "MATCHING",
        content: {
          heroes: [
            { id: "h3", text: "Apple", type: "hero" },
            { id: "h4", text: "Carrot", type: "hero" },
          ],
          stories: [
            { id: "s3", text: "Fruit", type: "story", correspondsTo: "h3" },
            { id: "s4", text: "Vegetable", type: "story", correspondsTo: "h4" },
          ],
        },
      },
    ],
    submitPlayerOne: async (page, questionIndex) => {
      if (questionIndex === 0) {
        await page.getByTestId("matching-left-h1").click();
        await page.getByRole("button", { name: "Right One", exact: true }).first().click();
        await page.getByTestId("matching-left-h2").click();
        await page.getByRole("button", { name: "Right Two", exact: true }).first().click();
      } else {
        await page.getByTestId("matching-left-h3").click();
        await page.getByRole("button", { name: "Fruit", exact: true }).first().click();
        await page.getByTestId("matching-left-h4").click();
        await page.getByRole("button", { name: "Vegetable", exact: true }).first().click();
      }
      await page.getByTestId("player-submit-answer").click();
    },
    submitPlayerTwo: async (page, questionIndex) => {
      if (questionIndex === 0) {
        await page.getByTestId("matching-left-h1").click();
        await page.getByRole("button", { name: "Right Two", exact: true }).first().click();
        await page.getByTestId("matching-left-h2").click();
        await page.getByRole("button", { name: "Right One", exact: true }).first().click();
      } else {
        await page.getByTestId("matching-left-h3").click();
        await page.getByRole("button", { name: "Vegetable", exact: true }).first().click();
        await page.getByTestId("matching-left-h4").click();
        await page.getByRole("button", { name: "Fruit", exact: true }).first().click();
      }
      await page.getByTestId("player-submit-answer").click();
    },
    expectTeamOneLeads: true,
  },
  CHRONOLOGY: {
    name: "CHRONOLOGY",
    type: "CHRONOLOGY",
    questions: [
      {
        questionText: "Chronology question 1",
        type: "CHRONOLOGY",
        content: {
          items: [
            { id: "c1", text: "Second", order: 1 },
            { id: "c2", text: "First", order: 0 },
          ],
        },
      },
      {
        questionText: "Chronology question 2",
        type: "CHRONOLOGY",
        content: {
          items: [
            { id: "c3", text: "Later", order: 1 },
            { id: "c4", text: "Earlier", order: 0 },
          ],
        },
      },
    ],
    submitPlayerOne: async (page) => {
      await page.getByTestId("player-submit-answer").click();
    },
    submitPlayerTwo: async (page) => {
      await page.getByTestId("player-submit-answer").click();
    },
    expectTeamOneLeads: false,
  },
  TRUE_FALSE: {
    name: "TRUE_FALSE",
    type: "TRUE_FALSE",
    questions: [
      {
        questionText: "True false question 1",
        type: "TRUE_FALSE",
        content: { isTrue: true },
      },
      {
        questionText: "True false question 2",
        type: "TRUE_FALSE",
        content: { isTrue: false },
      },
    ],
    submitPlayerOne: async (page, questionIndex) => {
      await page
        .getByTestId(questionIndex === 0 ? "player-true-choice" : "player-false-choice")
        .click();
      await page.getByTestId("player-submit-answer").click();
    },
    submitPlayerTwo: async (page, questionIndex) => {
      await page
        .getByTestId(questionIndex === 0 ? "player-false-choice" : "player-true-choice")
        .click();
      await page.getByTestId("player-submit-answer").click();
    },
    expectTeamOneLeads: true,
  },
  CORRECT_THE_ERROR: {
    name: "CORRECT_THE_ERROR",
    type: "CORRECT_THE_ERROR",
    questions: [
      {
        questionText: "Correct error question 1",
        type: "CORRECT_THE_ERROR",
        content: {
          text: "The sky is green",
          words: [
            { wordIndex: 1, text: "sky", alternatives: ["sea", "land"] },
            { wordIndex: 3, text: "green", alternatives: ["blue", "black"] },
          ],
          errorWordIndex: 3,
          correctReplacement: "blue",
        },
      },
      {
        questionText: "Correct error question 2",
        type: "CORRECT_THE_ERROR",
        content: {
          text: "Water is dry",
          words: [
            { wordIndex: 0, text: "Water", alternatives: ["Fire", "Stone"] },
            { wordIndex: 2, text: "dry", alternatives: ["wet", "hard"] },
          ],
          errorWordIndex: 2,
          correctReplacement: "wet",
        },
      },
    ],
    submitPlayerOne: async (page, questionIndex) => {
      await page
        .getByTestId(questionIndex === 0 ? "cte-word-3" : "cte-word-2")
        .click();
      await page.getByTestId("cte-alternative-0").click();
      await page.getByTestId("player-submit-answer").click();
    },
    submitPlayerTwo: async (page, questionIndex) => {
      await page
        .getByTestId(questionIndex === 0 ? "cte-word-1" : "cte-word-0")
        .click();
      await page.getByTestId("cte-alternative-1").click();
      await page.getByTestId("player-submit-answer").click();
    },
    expectTeamOneLeads: true,
  },
};

export async function runQuestionTypeScenario(
  browser: Browser,
  scenario: QuestionTypeScenario,
): Promise<void> {
  const adminApi = await createAdminApi();
  let competitionId = "";
  let session: Awaited<ReturnType<typeof createHostAndPlayers>> | null = null;

  const teamOneName = `${scenario.name} Team One`;
  const teamTwoName = `${scenario.name} Team Two`;

  try {
    const fixture = await createCompetitionWithQuestions(
      adminApi,
      `E2E ${scenario.name}`,
      scenario.questions,
    );
    competitionId = fixture.competitionId;

    session = await createHostAndPlayers(browser, competitionId, teamOneName, teamTwoName);

    await moveToQuestionPreview(session.hostPage);

    for (let questionIndex = 0; questionIndex < 2; questionIndex++) {
      await movePreviewToActive(
        session.hostPage,
        scenario.type,
        scenario.multipleChoiceOptions ?? 0,
      );

      await expect(session.playerOnePage.getByTestId("player-phase")).toHaveText("QUESTION_ACTIVE", {
        timeout: 20_000,
      });
      await expect(session.playerTwoPage.getByTestId("player-phase")).toHaveText("QUESTION_ACTIVE", {
        timeout: 20_000,
      });
      await expect(session.playerOnePage.getByTestId("player-active-question-text")).toHaveText(
        scenario.questions[questionIndex].questionText,
      );

      await scenario.submitPlayerOne(session.playerOnePage, questionIndex);
      await scenario.submitPlayerTwo(session.playerTwoPage, questionIndex);

      await expect(session.hostPage.getByTestId("host-current-phase")).toHaveText("GRADING", {
        timeout: 20_000,
      });

      await clickHostNextAndExpectPhase(session.hostPage, "REVEAL_ANSWER");

      if (questionIndex === 0) {
        await clickHostNextAndExpectPhase(session.hostPage, "QUESTION_PREVIEW");
      } else {
        await clickHostNextAndExpectPhase(session.hostPage, "ROUND_END");
        await clickHostNextAndExpectPhase(session.hostPage, "LEADERBOARD");
      }
    }

    await expect(session.playerOnePage.getByTestId("player-leaderboard")).toBeVisible({
      timeout: 20_000,
    });
    const leaderboardRows = session.playerOnePage.getByTestId(/leaderboard-team-/);
    await expect(leaderboardRows).toHaveCount(2);
    await expect(session.playerOnePage.getByTestId(`leaderboard-team-${teamOneName}`)).toBeVisible();
    await expect(session.playerOnePage.getByTestId(`leaderboard-team-${teamTwoName}`)).toBeVisible();

    if (scenario.expectTeamOneLeads) {
      await expect(leaderboardRows.first()).toContainText(teamOneName);
    }
  } finally {
    if (competitionId) {
      await deleteCompetition(adminApi, competitionId);
    }
    if (session) {
      await session.close();
    }
    await adminApi.dispose();
  }
}
