import {
  Question,
  AnswerContent,
  MultipleChoiceContent,
  ClosedQuestionContent,
  CrosswordContent,
  CrosswordAnswer,
  FillInTheBlanksContent,
  FillInTheBlanksAnswer,
  MatchingContent,
  MatchingAnswer,
  ChronologyContent,
  ChronologyAnswer,
} from "@quizco/shared";

export class GradingService {
  public gradeAnswer(
    question: Question,
    answer: AnswerContent
  ): { isCorrect: boolean; score: number } | null {
    if (question.grading === "MANUAL") {
      return null; // Needs manual grading
    }

    // Auto-grading logic
    try {
      if (question.type === "MULTIPLE_CHOICE") {
        return this.gradeMultipleChoice(
          question.content as MultipleChoiceContent,
          answer as unknown as number[],
          question.points
        );
      }

      if (question.type === "CLOSED") {
        return this.gradeClosed(
          question.content as ClosedQuestionContent,
          answer as string,
          question.points
        );
      }

      if (question.type === "CROSSWORD") {
        return this.gradeCrossword(
          question.content as CrosswordContent,
          answer as CrosswordAnswer,
          question.points
        );
      }

      if (question.type === "FILL_IN_THE_BLANKS") {
        return this.gradeFillInTheBlanks(
          question.content as FillInTheBlanksContent,
          answer as FillInTheBlanksAnswer,
          question.points
        );
      }

      if (question.type === "MATCHING") {
        return this.gradeMatching(
          question.content as MatchingContent,
          answer as MatchingAnswer,
          question.points
        );
      }

      if (question.type === "CHRONOLOGY") {
        return this.gradeChronology(
          question.content as ChronologyContent,
          answer as ChronologyAnswer,
          question.points
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
    answer: number[],
    points: number
  ) {
    if (!Array.isArray(answer)) {
      return { isCorrect: false, score: 0 };
    }

    const correctIndices = [...content.correctIndices].sort((a, b) => a - b);
    const submittedIndices = [...answer].sort((a, b) => a - b);

    const isCorrect =
      correctIndices.length === submittedIndices.length &&
      correctIndices.every((val, index) => val === submittedIndices[index]);

    return { isCorrect, score: isCorrect ? points : 0 };
  }

  private gradeClosed(
    content: ClosedQuestionContent,
    answer: string,
    points: number
  ) {
    const correctAnswers = content.options.map((o: string) =>
      o.toLowerCase().trim()
    );
    const submittedAnswer = String(answer).toLowerCase().trim();
    const isCorrect = correctAnswers.includes(submittedAnswer);
    return { isCorrect, score: isCorrect ? points : 0 };
  }

  private gradeCrossword(
    content: CrosswordContent,
    answer: CrosswordAnswer,
    points: number
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

  private gradeFillInTheBlanks(
    content: FillInTheBlanksContent,
    answer: FillInTheBlanksAnswer,
    points: number
  ) {
    if (!Array.isArray(answer)) {
      return { isCorrect: false, score: 0 };
    }

    const placeholderCount = (content.text.match(/\{(\d+)\}/g) || []).length;

    if (answer.length < placeholderCount) {
      return { isCorrect: false, score: 0 };
    }

    // Compare each submitted value against the marked correct option for that blank
    for (let i = 0; i < placeholderCount; i++) {
      const blank = content.blanks[i];
      if (!blank) continue;

      const correctOption = blank.options.find((opt) => opt.isCorrect);
      if (!correctOption) return { isCorrect: false, score: 0 };

      const correctVal = correctOption.value.toLowerCase().trim();
      const submittedVal = (answer[i] || "").toLowerCase().trim();

      if (submittedVal !== correctVal) {
        return { isCorrect: false, score: 0 };
      }
    }

    return { isCorrect: true, score: points };
  }

  private gradeMatching(
    content: MatchingContent,
    answer: MatchingAnswer,
    points: number
  ) {
    if (!answer || typeof answer !== "object") {
      return { isCorrect: false, score: 0 };
    }

    const pairs = content.pairs;
    let correctCount = 0;

    pairs.forEach((pair) => {
      if (answer[pair.id] === pair.right) {
        correctCount++;
      }
    });

    const isCorrect = correctCount === pairs.length;
    return { isCorrect, score: isCorrect ? points : 0 };
  }

  private gradeChronology(
    content: ChronologyContent,
    answer: ChronologyAnswer,
    _points: number
  ) {
    if (!Array.isArray(answer)) {
      return { isCorrect: false, score: 0 };
    }

    // Reconstruction of correct order based on 'order' property
    const items = [...content.items].sort((a, b) => a.order - b.order);
    const correctOrderIds = items.map((i) => i.id);

    let correctCount = 0;
    const n = correctOrderIds.length;

    // Compare submitted IDs against correct IDs at each index
    for (let i = 0; i < n; i++) {
      if (answer[i] === correctOrderIds[i]) {
        correctCount++;
      }
    }

    const isPerfect = correctCount === n;
    // Score: +1 per correct index, +3 bonus for perfect match
    const score = correctCount + (isPerfect ? 3 : 0);

    return { isCorrect: isPerfect, score };
  }
}
