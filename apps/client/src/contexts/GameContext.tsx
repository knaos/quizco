import React, { createContext, useContext, useEffect, useReducer } from "react";
import type { GameState, Team } from "@quizco/shared";
import { socket } from "../socket";

type Action =
  | { type: "SYNC_STATE"; payload: GameState }
  | { type: "UPDATE_TIMER"; payload: number }
  | { type: "UPDATE_SCORES"; payload: Team[] };

const initialState: GameState = {
  phase: "WAITING",
  currentQuestion: null,
  timeRemaining: 0,
  teams: [],
  revealStep: 0,
  timerPaused: false,
};

function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "SYNC_STATE":
      return { ...state, ...action.payload };
    case "UPDATE_TIMER":
      return { ...state, timeRemaining: action.payload };
    case "UPDATE_SCORES":
      return { ...state, teams: action.payload };
    default:
      return state;
  }
}

const GameContext = createContext<{
  state: GameState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  useEffect(() => {
    socket.on("GAME_STATE_SYNC", (payload: GameState) => {
      dispatch({ type: "SYNC_STATE", payload });
    });

    socket.on("TIMER_SYNC", (payload: number) => {
      dispatch({ type: "UPDATE_TIMER", payload });
    });

    socket.on("SCORE_UPDATE", (payload: Team[]) => {
      dispatch({ type: "UPDATE_SCORES", payload });
    });

    return () => {
      socket.off("GAME_STATE_SYNC");
      socket.off("TIMER_SYNC");
      socket.off("SCORE_UPDATE");
    };
  }, []);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used within GameProvider");
  return context;
};
