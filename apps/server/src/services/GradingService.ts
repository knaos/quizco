import {
  Question,
  AnswerContent,
  MultipleChoiceContent,
  ClosedQuestionContent,
  CrosswordContent,
  CrosswordAnswer,
} from "@quizco/shared";

export class GradingService {
  public gradeAnswer(
    question: Question,
    answer: AnswerContent,
  ): { isCorrect: boolean; score: number } | null {
    if (question.grading === "MANUAL") {
      return null; // Needs manual grading
    }

    // Auto-grading logic
    try {
      if (question.type === "MULTIPLE_CHOICE") {
        return this.gradeMultipleChoice(
          question.content as MultipleChoiceContent,
          answer as number,
          question.points,
        );
      }

      if (question.type === "CLOSED") {
        return this.gradeClosed(
          question.content as ClosedQuestionContent,
          answer as string,
          question.points,
        );
      }

      if (question.type === "CROSSWORD") {
        return this.gradeCrossword(
          question.content as CrosswordContent,
          answer as CrosswordAnswer,
          question.points,
        );
      }
    } catch (error) {
      console.error("Error grading answer:", error);
      return { isCorrect: false, score: 0 };
    }

    return null;
  }

  private gradeMultipleChoice(
    content: MultipleChoiceContent,
    answer: number,
    points: number,
  ) {
    const isCorrect = answer === content.correctIndex;
    return { isCorrect, score: isCorrect ? points : 0 };
  }

  private gradeClosed(
    content: ClosedQuestionContent,
    answer: string,
    points: number,
  ) {
    const correctAnswers = content.options.map((o: string) =>
      o.toLowerCase().trim(),
    );
    const submittedAnswer = String(answer).toLowerCase().trim();
    const isCorrect = correctAnswers.includes(submittedAnswer);
    return { isCorrect, score: isCorrect ? points : 0 };
  }

  private gradeCrossword(
    content: CrosswordContent,
    answer: CrosswordAnswer,
    points: number,
  ) {
    if (!answer || !Array.isArray(answer)) {
      return { isCorrect: false, score: 0 };
    }

    const solutionGrid = content.grid;
    // Check dimensions
    if (
      solutionGrid.length !== answer.length ||
      solutionGrid[0].length !== answer[0].length
    ) {
      return { isCorrect: false, score: 0 };
    }

    // Coordinate by coordinate check
    for (let row = 0; row < solutionGrid.length; row++) {
      for (let col = 0; col < solutionGrid[0].length; col++) {
        const solutionChar = (solutionGrid[row][col] || "").toUpperCase();
        const answerChar = (answer[row][col] || "").toUpperCase();

        // If solution has a character (is part of a word), answer must match
        if (solutionChar !== "" && solutionChar !== answerChar) {
          return { isCorrect: false, score: 0 };
        }
      }
    }

    return { isCorrect: true, score: points };
  }
}
