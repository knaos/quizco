export type QuestionType =
  | "CLOSED"
  | "MULTIPLE_CHOICE"
  | "OPEN_WORD"
  | "CROSSWORD"
  | "FILL_IN_THE_BLANKS"
  | "MATCHING"
  | "CHRONOLOGY"
  | "TRUE_FALSE"
  | "CORRECT_THE_ERROR";
export type GradingMode = "AUTO" | "MANUAL";
export type GamePhase =
  | "WAITING"
  | "WELCOME"
  | "ROUND_START"
  | "QUESTION_PREVIEW"
  | "QUESTION_ACTIVE"
  | "GRADING"
  | "REVEAL_ANSWER"
  | "ROUND_END"
  | "LEADERBOARD";

export type MultipleChoiceAnswer = number[];
export type OpenWordAnswer = string;
export type ClosedAnswer = string;
export type CrosswordAnswer = string[][];
export type FillInTheBlanksAnswer = string[]; // Values for blanks in order
export type MatchingAnswer = Record<string, string>; // leftSideId -> rightSideId
export type ChronologyAnswer = {
  slotIds: Array<string | null>; // IDs placed into right-column slots
  poolIds: string[]; // Remaining IDs in left-column pool order
};
export type TrueFalseAnswer = boolean;
export type CorrectTheErrorAnswer = {
  selectedWordIndex: number; // Index into original sentence words that was selected
  correction: string;
};

export type AnswerContent =
  | MultipleChoiceAnswer
  | OpenWordAnswer
  | ClosedAnswer
  | CrosswordAnswer
  | FillInTheBlanksAnswer
  | MatchingAnswer
  | ChronologyAnswer
  | TrueFalseAnswer
  | CorrectTheErrorAnswer;

export type CrosswordGridState = string[][];

export interface MultipleChoiceContent {
  options: string[];
  correctIndices: number[];
}

export interface CrosswordClue {
  clue: string;
  answer: string;
  direction: "across" | "down";
  x: number; // Column
  y: number; // Row
  number: number;
}

export interface CrosswordContent {
  grid: string[][];
  clues: {
    across: CrosswordClue[];
    down: CrosswordClue[];
  };
}

export interface OpenWordContent {
  answer: string;
}

export interface ClosedQuestionContent {
  options: string[]; // For CLOSED questions, content.options holds correct answers
}

export interface FillInTheBlanksOption {
  value: string;
  isCorrect: boolean;
}

export interface FillInTheBlanksBlank {
  options: FillInTheBlanksOption[];
}

export interface FillInTheBlanksContent {
  text: string; // "This is a {0} with {1}."
  blanks: FillInTheBlanksBlank[]; // Array of blanks, each with its own options
  prefill?: boolean; // If true, auto-fill blanks with first option
}

export interface MatchingItem {
  id: string;
  text: string;
  type: "hero" | "story";
  correspondsTo?: string; // Only for stories - the hero id it matches
}

export interface MatchingContent {
  heroes: MatchingItem[];
  stories: MatchingItem[];
}

export interface ChronologyItem {
  id: string;
  text: string;
  order: number; // Correct position (0-indexed)
}

export interface ChronologyContent {
  items: ChronologyItem[];
}

export interface TrueFalseContent {
  isTrue: boolean;
}

export interface TrueFalseRevealProps {
  content: TrueFalseContent;
  lastAnswer: boolean | null;
  variant?: "player" | "audience" | "host";
}

export interface CorrectTheErrorWord {
  wordIndex: number; // Index of the word in the sentence (0-based)
  text: string; // The original word text
  alternatives: string[]; // Alternative options for this word
}

export interface CorrectTheErrorContent {
  text: string; // The full sentence
  words: CorrectTheErrorWord[]; // Only words with alternatives (subset of words in sentence)
  errorWordIndex: number; // Index into the original sentence's words that is wrong
  correctReplacement: string; // The correct alternative for the error word
}

export type QuestionContent =
  | MultipleChoiceContent
  | CrosswordContent
  | OpenWordContent
  | ClosedQuestionContent
  | FillInTheBlanksContent
  | MatchingContent
  | ChronologyContent
  | TrueFalseContent
  | CorrectTheErrorContent;

interface BaseQuestion {
  id: string;
  roundId: string;
  questionText: string;
  points: number;
  timeLimitSeconds: number;
  grading: GradingMode;
  section?: string;
  index?: number;
  realIndex?: number;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: "MULTIPLE_CHOICE";
  content: MultipleChoiceContent;
}

export interface ClosedQuestion extends BaseQuestion {
  type: "CLOSED";
  content: ClosedQuestionContent;
}

export interface OpenWordQuestion extends BaseQuestion {
  type: "OPEN_WORD";
  content: OpenWordContent;
}

export interface CrosswordQuestion extends BaseQuestion {
  type: "CROSSWORD";
  content: CrosswordContent;
}

export interface FillInTheBlanksQuestion extends BaseQuestion {
  type: "FILL_IN_THE_BLANKS";
  content: FillInTheBlanksContent;
}

export interface MatchingQuestion extends BaseQuestion {
  type: "MATCHING";
  content: MatchingContent;
}

export interface ChronologyQuestion extends BaseQuestion {
  type: "CHRONOLOGY";
  content: ChronologyContent;
}

export interface TrueFalseQuestion extends BaseQuestion {
  type: "TRUE_FALSE";
  content: TrueFalseContent;
}

export interface CorrectTheErrorQuestion extends BaseQuestion {
  type: "CORRECT_THE_ERROR";
  content: CorrectTheErrorContent;
}

export type Question =
  | MultipleChoiceQuestion
  | ClosedQuestion
  | OpenWordQuestion
  | CrosswordQuestion
  | FillInTheBlanksQuestion
  | MatchingQuestion
  | ChronologyQuestion
  | TrueFalseQuestion
  | CorrectTheErrorQuestion;

export interface Competition {
  id: string;
  title: string;
  host_pin: string;
  status: "DRAFT" | "ACTIVE" | "COMPLETED";
  createdAt: string;
}

export interface Round {
  id: string;
  competitionId: string;
  orderIndex: number;
  type: "STANDARD" | "CROSSWORD" | "SPEED_RUN" | "STREAK";
  title: string;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  score: number;
  streak: number;
  lastAnswerCorrect: boolean | null;
  lastAnswer: AnswerContent | null;
  isExplicitlySubmitted: boolean;
  isConnected: boolean;
}

export interface GameState {
  phase: GamePhase;
  currentQuestion: Question | null;
  timeRemaining: number;
  teams: Team[];
  revealStep: number;
  timerPaused: boolean;
}

export interface SessionMetadata {
  shuffle_seed?: string;
  shuffle_mapping?: Record<string, unknown>;
  chronologyPerfectAnswers?: number;
  chronologyBonusAwarded?: boolean;
  [key: `shuffle_${string}`]: unknown;
}

export interface SocketEvents {
  // Client to Server
  JOIN_ROOM: (payload: {
    competitionId: string;
    teamName: string;
    color: string;
  }) => void;
  RECONNECT_TEAM: (payload: { competitionId: string; teamId: string }) => void;
  SUBMIT_ANSWER: (payload: {
    competitionId: string;
    teamId: string;
    questionId: string;
    answer: AnswerContent;
    isFinal?: boolean;
  }) => void;
  REQUEST_JOKER: (payload: {
    competitionId: string;
    teamId: string;
    questionId: string;
  }) => void;

  // Host to Server
  HOST_START_QUESTION: (payload: {
    competitionId: string;
    questionId: string;
  }) => void;
  HOST_START_TIMER: (payload: { competitionId: string }) => void;
  HOST_REVEAL_ANSWER: (payload: { competitionId: string }) => void;
  HOST_NEXT: (payload: { competitionId: string }) => void;
  HOST_GRADE_DECISION: (payload: {
    competitionId: string;
    answerId: string;
    correct: boolean;
  }) => void;
  HOST_PAUSE_TIMER: (payload: { competitionId: string }) => void;
  HOST_RESUME_TIMER: (payload: { competitionId: string }) => void;

  // Server to Client
  GAME_STATE_SYNC: (state: GameState) => void;
  TIMER_SYNC: (seconds: number) => void;
  SCORE_UPDATE: (teams: Team[]) => void;
  JOKER_REVEAL: (payload: {
    questionId: string;
    teamId: string;
    letter: string;
    x: number;
    y: number;
    newScore: number;
  }) => void;
  JOKER_ERROR: (payload: { message: string }) => void;
}
