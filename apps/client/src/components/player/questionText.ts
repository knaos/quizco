import type {
  ChronologyContent,
  CorrectTheErrorContent,
  FillInTheBlanksContent,
  MatchingContent,
  Question,
  TrueFalseContent,
} from "@quizco/shared";
import type { TFunction } from "i18next";

export function getQuestionCorrectAnswer(question: Question, t: TFunction): string {
  const { type, content } = question;

  if (type === "MULTIPLE_CHOICE") {
    return content.correctIndices.map((idx) => content.options[idx]).join(", ") || "Unknown";
  }

  if (type === "CLOSED") {
    return content.options[0] || "Unknown";
  }

  if (type === "OPEN_WORD") {
    return content.answer;
  }

  if (type === "CROSSWORD") {
    return t("player.see_grid");
  }

  if (type === "FILL_IN_THE_BLANKS") {
    return (content as FillInTheBlanksContent).blanks
      .map((blank) => blank.options.find((option) => option.isCorrect)?.value || "??")
      .join(", ");
  }

  if (type === "MATCHING") {
    const matchingContent = content as MatchingContent;
    return matchingContent.heroes
      .map((hero) => {
        const story = matchingContent.stories.find((s) => s.correspondsTo === hero.id);
        return `${hero.text} -> ${story?.text || "??"}`;
      })
      .join(" | ");
  }

  if (type === "CHRONOLOGY") {
    return [...(content as ChronologyContent).items]
      .sort((a, b) => a.order - b.order)
      .map((item) => item.text)
      .join(" -> ");
  }

  if (type === "TRUE_FALSE") {
    return (content as TrueFalseContent).isTrue ? t("game.true") : t("game.false");
  }

  if (type === "CORRECT_THE_ERROR") {
    const correctTheErrorContent = content as CorrectTheErrorContent;
    const errorWord =
      correctTheErrorContent.words.find((word) => word.wordIndex === correctTheErrorContent.errorWordIndex)?.text ??
      "??";
    return `${errorWord} -> ${correctTheErrorContent.correctReplacement}`;
  }

  return "Unknown";
}
