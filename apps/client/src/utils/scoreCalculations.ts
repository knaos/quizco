import type {
  FillInTheBlanksContent,
  MatchingContent,
  CrosswordContent,
} from "@quizco/shared";

/**
 * Calculates the partial score for FILL_IN_THE_BLANKS questions.
 * Returns the number of correctly answered blanks.
 */
export function calculateFillInTheBlanksScore(
  content: FillInTheBlanksContent,
  answer: string[] | null,
): number {
  if (!answer || !Array.isArray(answer)) {
    return 0;
  }

  let correctCount = 0;
  const placeholderCount = content.blanks.length;

  for (let i = 0; i < placeholderCount; i++) {
    const blank = content.blanks[i];
    if (!blank) continue;

    const correctOption = blank.options.find((opt) => opt.isCorrect);
    if (!correctOption) continue;

    const correctVal = correctOption.value.toLowerCase().trim();
    const submittedVal = (answer[i] || "").toLowerCase().trim();

    if (submittedVal === correctVal) {
      correctCount++;
    }
  }

  return correctCount;
}

/**
 * Calculates the partial score for MATCHING questions.
 * Returns the number of correctly matched pairs.
 */
export function calculateMatchingScore(
  content: MatchingContent,
  answer: Record<string, string> | null,
): number {
  if (!answer || typeof answer !== "object") {
    return 0;
  }

  const { heroes, stories } = content;
  const storyById = new Map(stories.map((s) => [s.id, s]));
  let correctCount = 0;

  for (const hero of heroes) {
    const matchedStoryId = answer[hero.id];
    if (matchedStoryId) {
      const matchedStory = storyById.get(matchedStoryId);
      if (matchedStory && matchedStory.correspondsTo === hero.id) {
        correctCount++;
      }
    }
  }

  return correctCount;
}

/**
 * Calculates the partial score for CROSSWORD questions.
 * Returns the number of correctly guessed words.
 */
export function calculateCrosswordScore(
  content: CrosswordContent,
  answer: string[][] | null,
): number {
  if (!answer || !Array.isArray(answer)) {
    return 0;
  }

  // Get all clues (across + down)
  const allClues = [
    ...(content.clues?.across || []),
    ...(content.clues?.down || []),
  ];

  // If there are no clues, fall back to cell-by-cell counting
  if (allClues.length === 0) {
    return 0;
  }

  let correctWordCount = 0;

  for (const clue of allClues) {
    // Extract the word from the player's answer grid
    const word = extractWordFromGrid(
      answer,
      clue.x,
      clue.y,
      clue.direction,
      clue.answer.length,
    );

    // Compare (case-insensitive)
    if (word.toUpperCase() === clue.answer.toUpperCase()) {
      correctWordCount++;
    }
  }

  return correctWordCount;
}

/**
 * Extracts a word from the grid at the specified position and direction
 */
export function extractWordFromGrid(
  grid: string[][],
  startX: number,
  startY: number,
  direction: "across" | "down",
  length: number,
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
      break;
    }

    word += cell;
  }

  return word;
}
