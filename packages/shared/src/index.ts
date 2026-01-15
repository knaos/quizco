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

export interface Question {
  id: string;
  round_id: string;
  question_text: string;
  type: QuestionType;
  points: number;
  time_limit_seconds: number;
  content: any; // Flexible based on type
  grading: GradingMode;
}

export interface Competition {
  id: string;
  title: string;
  host_pin: string;
  status: "DRAFT" | "ACTIVE" | "COMPLETED";
  created_at: string;
}

export interface Round {
  id: string;
  competition_id: string;
  order_index: number;
  type: "STANDARD" | "CROSSWORD" | "SPEED_RUN";
  title: string;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  score: number;
}

export interface GameState {
  phase: GamePhase;
  currentQuestion: Question | null;
  timeRemaining: number;
  teams: Team[];
}

export interface SocketEvents {
  // Client to Server
  JOIN_ROOM: (payload: { teamName: string; color: string }) => void;
  SUBMIT_ANSWER: (payload: { questionId: string; answer: any }) => void;
  CROSSWORD_PROGRESS: (payload: { questionId: string; progress: any }) => void;

  // Host to Server
  HOST_START_QUESTION: (payload: { questionId: string }) => void;
  HOST_START_TIMER: () => void;
  HOST_REVEAL_ANSWER: () => void;
  HOST_GRADE_DECISION: (payload: {
    answerId: string;
    correct: boolean;
  }) => void;

  // Server to Client
  GAME_STATE_SYNC: (state: GameState) => void;
  TIMER_SYNC: (seconds: number) => void;
  SCORE_UPDATE: (teams: Team[]) => void;
}
