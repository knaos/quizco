export type QuestionType =
  | "CLOSED"
  | "MULTIPLE_CHOICE"
  | "OPEN_WORD"
  | "CROSSWORD";
export type GradingMode = "AUTO" | "MANUAL";
export type GamePhase =
  | "WAITING"
  | "QUESTION_PREVIEW"
  | "QUESTION_ACTIVE"
  | "GRADING"
  | "REVEAL_ANSWER"
  | "LEADERBOARD";

export interface MultipleChoiceContent {
  options: string[];
  correctIndex: number;
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

export interface Question {
  id: string;
  roundId: string;
  questionText: string;
  type: QuestionType;
  points: number;
  timeLimitSeconds: number;
  content: any; // Using any for now to avoid breaking existing code, but with specialized interfaces available
  grading: GradingMode;
}

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
  type: "STANDARD" | "CROSSWORD" | "SPEED_RUN";
  title: string;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  score: number;
  lastAnswerCorrect: boolean | null;
}

export interface GameState {
  phase: GamePhase;
  currentQuestion: Question | null;
  timeRemaining: number;
  teams: Team[];
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
    answer: any;
  }) => void;
  CROSSWORD_PROGRESS: (payload: {
    competitionId: string;
    questionId: string;
    progress: any;
  }) => void;

  // Host to Server
  HOST_START_QUESTION: (payload: {
    competitionId: string;
    questionId: string;
  }) => void;
  HOST_START_TIMER: (payload: { competitionId: string }) => void;
  HOST_REVEAL_ANSWER: (payload: { competitionId: string }) => void;
  HOST_GRADE_DECISION: (payload: {
    competitionId: string;
    answerId: string;
    correct: boolean;
  }) => void;

  // Server to Client
  GAME_STATE_SYNC: (state: GameState) => void;
  TIMER_SYNC: (seconds: number) => void;
  SCORE_UPDATE: (teams: Team[]) => void;
}
