import {
  Question,
  AnswerContent,
  MultipleChoiceContent,
  ClosedQuestionContent,
  CrosswordContent,
  CrosswordAnswer,
  CrosswordClue,
  FillInTheBlanksContent,
  FillInTheBlanksAnswer,
  MatchingContent,
  MatchingAnswer,
  ChronologyContent,
  ChronologyAnswer,
  TrueFalseContent,
  CorrectTheErrorContent,
  CorrectTheErrorAnswer,
} from "@quizco/shared";

export class GradingService {
  public gradeAnswer(
    question: Question,
    answer: AnswerContent,
    options: { usedJokers?: boolean } = {}
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
          question.points,
          options.usedJokers || false
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

      if (question.type === "TRUE_FALSE") {
        return this.gradeTrueFalse(
          question.content as TrueFalseContent,
          answer as unknown as boolean,
          question.points
        );
      }

      if (question.type === "CORRECT_THE_ERROR") {
        return this.gradeCorrectTheError(
          question.content as CorrectTheErrorContent,
          answer as unknown as CorrectTheErrorAnswer,
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
    _points: number
  ) {
    if (!Array.isArray(answer)) {
      return { isCorrect: false, score: 0 };
    }

    const correctIndices = new Set(content.correctIndices);
    const submittedIndices = new Set(answer);

    // Count how many correct indices were selected
    let correctCount = 0;
    submittedIndices.forEach((index) => {
      if (correctIndices.has(index)) {
        correctCount++;
      }
    });

    // isCorrect is true only if ALL correct indices were selected and no wrong ones
    const isCorrect =
      correctIndices.size === submittedIndices.size &&
      correctCount === correctIndices.size;

    // 1 point per correct answer
    return { isCorrect, score: correctCount };
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
    points: number,
    usedJokers: boolean
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

    // Get all clues (across + down)
    const allClues: CrosswordClue[] = [
      ...(content.clues?.across || []),
      ...(content.clues?.down || []),
    ];

    // If there are no clues, fall back to the old cell-by-cell grading
    if (allClues.length === 0) {
      // Coordinate by coordinate check (old behavior)
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

      let scoreAwarded = points;
      // Add +3 bonus points if completed without jokers
      if (!usedJokers) {
        scoreAwarded += 3;
      }

      return { isCorrect: true, score: scoreAwarded };
    }

    // NEW BEHAVIOR: Score 3 points per correct guessed word
    let correctWordCount = 0;

    for (const clue of allClues) {
      // Extract the word from the player's answer grid based on clue position and direction
      const word = this.extractWordFromGrid(
        answer,
        clue.x,
        clue.y,
        clue.direction,
        clue.answer.length
      );

      // Compare (case-insensitive)
      if (word.toUpperCase() === clue.answer.toUpperCase()) {
        correctWordCount++;
      }
    }

    // Calculate score: 3 points per correct word
    let scoreAwarded = correctWordCount * 3;

    // Check if all words are correct
    const allCorrect = correctWordCount === allClues.length;

    // Add +3 bonus if all words are correct AND no jokers were used
    if (allCorrect && !usedJokers) {
      scoreAwarded += 3;
    }

    return { isCorrect: allCorrect, score: scoreAwarded };
  }

  /**
   * Extracts a word from the grid at the specified position and direction
   */
  private extractWordFromGrid(
    grid: CrosswordAnswer,
    startX: number,
    startY: number,
    direction: "across" | "down",
    length: number
  ): string {
    let word = "";

    for (let i = 0; i < length; i++) {
      const x = direction === "across" ? startX + i : startX;
      const y = direction === "down" ? startY + i : startY;

      // Check bounds
      if (y >= grid.length || x >= grid[0].length) {
        break;
      }

      const cell = grid[y][x];
      if (cell === undefined || cell === null || cell === "") {
        // Stop at empty cell (black square)
        break;
      }

      word += cell;
    }

    return word;
  }

  private gradeFillInTheBlanks(
    content: FillInTheBlanksContent,
    answer: FillInTheBlanksAnswer,
    _points: number
  ) {
    if (!Array.isArray(answer)) {
      return { isCorrect: false, score: 0 };
    }

    const placeholderCount = (content.text.match(/\{(\d+)\}/g) || []).length;

    if (answer.length < placeholderCount) {
      return { isCorrect: false, score: 0 };
    }

    // Count correct blanks - 1 point per correct blank
    let correctCount = 0;

    for (let i = 0; i < placeholderCount; i++) {
      const blank = content.blanks[i];
      if (!blank) continue;

      const correctOption = blank.options.find((opt) => opt.isCorrect);
      if (!correctOption) return { isCorrect: false, score: 0 };

      const correctVal = correctOption.value.toLowerCase().trim();
      const submittedVal = (answer[i] || "").toLowerCase().trim();

      if (submittedVal === correctVal) {
        correctCount++;
      }
    }

    const isCorrect = correctCount === placeholderCount;
    return { isCorrect, score: correctCount };
  }

  private gradeMatching(
    content: MatchingContent,
    answer: MatchingAnswer,
    _points: number
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
    // 1 point per correct match
    return { isCorrect, score: correctCount };
  }

  /**
   * Chronology scoring:
   *  - +1 per correct index
   *  - +3 perfect-order bonus
   * Uses slot-first order followed by remaining pool items.
   */
  private gradeChronology(
    content: ChronologyContent,
    answer: ChronologyAnswer,
    _points: number
  ) {
    if (
      !answer ||
      typeof answer !== "object" ||
      !Array.isArray(answer.slotIds) ||
      !Array.isArray(answer.poolIds)
    ) {
      return { isCorrect: false, score: 0 };
    }

    // Reconstruction of correct order based on 'order' property
    const items = [...content.items].sort((a, b) => a.order - b.order);
    const correctOrderIds = items.map((i) => i.id);
    const knownIds = new Set(correctOrderIds);

    const uniqueSlotIds = answer.slotIds.filter(
      (id, index): id is string =>
        typeof id === "string" &&
        knownIds.has(id) &&
        answer.slotIds.indexOf(id) === index,
    );
    const uniquePoolIds = answer.poolIds.filter(
      (id, index) =>
        knownIds.has(id) &&
        answer.poolIds.indexOf(id) === index &&
        !uniqueSlotIds.includes(id),
    );
    const submittedOrderIds = [
      ...uniqueSlotIds,
      ...uniquePoolIds,
    ];

    let correctCount = 0;
    const n = correctOrderIds.length;

    // Compare submitted IDs against correct IDs at each index
    for (let i = 0; i < n; i++) {
      if (submittedOrderIds[i] === correctOrderIds[i]) {
        correctCount++;
      }
    }

    const isPerfect = correctCount === n;
    // Score: +1 per correct index, +3 bonus for perfect match
    const score = correctCount + (isPerfect ? 3 : 0);

    return { isCorrect: isPerfect, score };
  }

  private gradeTrueFalse(
    content: TrueFalseContent,
    answer: boolean,
    _points: number
  ) {
    const isCorrect = content.isTrue === answer;
    // Each correct answer scores 1 point
    return { isCorrect, score: isCorrect ? 1 : 0 };
  }

  private gradeCorrectTheError(
    content: CorrectTheErrorContent,
    answer: CorrectTheErrorAnswer,
    _totalPoints: number
  ) {
    if (!answer || typeof answer.selectedPhraseIndex === "undefined") {
      return { isCorrect: false, score: 0 };
    }

    let score = 0;

    // 1. Correct phrase selection (1pt)
    if (answer.selectedPhraseIndex === content.errorPhraseIndex) {
      score += 1;
    }

    // 2. Correct text replacement (1pt)
    const normalizedCorrection = (answer.correction || "").trim().toLowerCase();
    const normalizedTarget = content.correctReplacement.trim().toLowerCase();

    if (normalizedCorrection === normalizedTarget) {
      score += 1;
    }

    return {
      isCorrect: score === 2,
      score: score,
    };
  }
}
