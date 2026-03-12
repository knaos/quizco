import { test } from "@playwright/test";
import { QUESTION_TYPE_SCENARIOS, runQuestionTypeScenario } from "../helpers/questionTypeScenarios";

test("Question type flow: FILL_IN_THE_BLANKS", async ({ browser }) => {
  await runQuestionTypeScenario(browser, QUESTION_TYPE_SCENARIOS.FILL_IN_THE_BLANKS);
});
