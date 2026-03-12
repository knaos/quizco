import { test } from "@playwright/test";
import { QUESTION_TYPE_SCENARIOS, runQuestionTypeScenario } from "../helpers/questionTypeScenarios";

test("Question type flow: OPEN_WORD", async ({ browser }) => {
  await runQuestionTypeScenario(browser, QUESTION_TYPE_SCENARIOS.OPEN_WORD);
});
