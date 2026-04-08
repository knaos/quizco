import { describe, expect, it } from "vitest";
import {
  getQuestionRenderer,
} from "./questionRenderers";

describe("questionRenderers", () => {
  it("defines preview, active, read-only, and reveal renderers for every question type", () => {
    const questionTypes = [
      "MULTIPLE_CHOICE",
      "CROSSWORD",
      "FILL_IN_THE_BLANKS",
      "MATCHING",
      "CHRONOLOGY",
      "TRUE_FALSE",
      "CORRECT_THE_ERROR",
      "CLOSED",
      "OPEN_WORD",
    ] as const;

    questionTypes.forEach((questionType) => {
      const renderer = getQuestionRenderer(questionType);
      expect(renderer.preview).toBeTypeOf("function");
      expect(renderer.active).toBeTypeOf("function");
      expect(renderer.readOnly).toBeTypeOf("function");
      expect(renderer.reveal).toBeTypeOf("function");
    });
  });
});
