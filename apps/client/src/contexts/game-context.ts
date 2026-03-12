import { createContext } from "react";
import type { Dispatch } from "react";
import type { GameState, Team } from "@quizco/shared";

export type GameAction =
  | { type: "SYNC_STATE"; payload: GameState }
  | { type: "UPDATE_TIMER"; payload: number }
  | { type: "UPDATE_SCORES"; payload: Team[] };

export const GameContext = createContext<{
  state: GameState;
  dispatch: Dispatch<GameAction>;
} | null>(null);
