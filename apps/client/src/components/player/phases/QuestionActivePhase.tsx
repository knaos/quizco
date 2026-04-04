import React from "react";
import { Send, CheckCircle, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "../../ui/Card";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import Badge from "../../ui/Badge";
import { CrosswordPlayer } from "../questions/crossword/CrosswordPlayer";
import { FillInTheBlanksPlayer } from "../questions/fillInTheBlanks/FillInTheBlanksPlayer";
import { MatchingPlayer } from "../questions/matching/MatchingPlayer";
import { ChronologyPlayer } from "../questions/chronology/ChronologyPlayer";
import TrueFalsePlayer from "../questions/trueFalse/TrueFalsePlayer";
import CorrectTheErrorPlayer from "../questions/correctTheError/CorrectTheErrorPlayer";
import { MultipleChoicePlayer } from "../questions/multipleChoice/MultipleChoicePlayer";
import { isChronologyAnswer } from "../../../utils/answerGuards";
import type {
  GameState,
  AnswerContent,
  MultipleChoiceContent,
  ChronologyContent,
  CorrectTheErrorAnswer
} from "@quizco/shared";

interface QuestionActivePhaseProps {
  state: GameState;
  hasSubmitted: boolean;
  selectedIndices: number[];
  answer: AnswerContent;
  setAnswer: (val: AnswerContent) => void;
  toggleIndex: (index: number) => void;
  submitAnswer: (value: AnswerContent, isFinal?: boolean) => void;
  submissionStatus: "idle" | "success" | "error";
  currentTeam?: { isExplicitlySubmitted?: boolean };
}

/**
 * Determines if the submit button should be disabled based on question type and answer state.
 */
const isSubmitDisabled = (
  hasSubmitted: boolean,
  questionType: string,
  selectedIndices: number[],
  answer: AnswerContent,
  currentQuestion: GameState["currentQuestion"]
): boolean => {
  if (hasSubmitted) return true;

  switch (questionType) {
    case "MULTIPLE_CHOICE":
      return selectedIndices.length === 0;
    case "MATCHING":
      return Object.keys(answer || {}).length <
        (currentQuestion?.content as { pairs: unknown[] })?.pairs?.length;
    case "TRUE_FALSE":
      return answer === null;
    case "CORRECT_THE_ERROR":
      return (
        (answer as CorrectTheErrorAnswer)?.selectedPhraseIndex === -1 ||
        !(answer as CorrectTheErrorAnswer)?.correction
      );
    default:
      return false;
  }
};

export const QuestionActivePhase: React.FC<QuestionActivePhaseProps> = ({
  state,
  hasSubmitted,
  selectedIndices,
  answer,
  setAnswer,
  toggleIndex,
  submitAnswer,
  submissionStatus,
  currentTeam,
}) => {
  const { t } = useTranslation();
  const { currentQuestion } = state;

  if (!currentQuestion) return null;

  // Calculate submit button disabled state
  const submitDisabled = isSubmitDisabled(
    hasSubmitted,
    currentQuestion.type,
    selectedIndices,
    answer,
    currentQuestion
  );

  return (
    <div className="w-full max-w-4xl space-y-8">
      {currentQuestion.section && (
        <Badge
          variant="yellow"
          className="p-4 rounded-2xl border-2 border-yellow-400 text-2xl"
        >
          {t("player.turn")}: {currentQuestion.section}
        </Badge>
      )}
      {!hasSubmitted ? (
        <div className="w-full max-w-4xl space-y-8 text-left">
          <Card variant='elevated' className="p-8 !border-b-8 !border-blue-500 text-center">
            <span className="text-blue-600 font-black uppercase tracking-widest text-lg mb-4 block">
              {t("player.question")}
            </span>
            <h2
              className="text-3xl md:text-4xl font-black text-gray-900 leading-tight"
              data-testid="player-active-question-text"
            >
              {currentQuestion.questionText}
            </h2>
          </Card>
          <div className="space-y-6 w-full bg-white p-8 rounded-3xl shadow-xl border-b-8 border-blue-500">
            {(() => {
              switch (currentQuestion.type) {
                case "MULTIPLE_CHOICE":
                  return (
                    <MultipleChoicePlayer
                      options={(currentQuestion.content as MultipleChoiceContent)?.options || []}
                      selectedIndices={selectedIndices}
                      onToggleIndex={toggleIndex}
                      disabled={hasSubmitted}
                    />
                  );
                case "CROSSWORD":
                  return (
                    <CrosswordPlayer
                      data={currentQuestion.content}
                      value={answer as string[][]}
                      onChange={(grid) => {
                        setAnswer(grid);
                      }}
                    />
                  );
                case "FILL_IN_THE_BLANKS":
                  return (
                    <FillInTheBlanksPlayer
                      content={currentQuestion.content}
                      value={(answer as string[]) || []}
                      onChange={(val) => setAnswer(val)}
                    />
                  );
                case "MATCHING":
                  return (
                    <MatchingPlayer
                      content={currentQuestion.content}
                      value={(answer as Record<string, string>) || {}}
                      onChange={(val) => setAnswer(val)}
                    />
                  );
                case "CHRONOLOGY":
                  return (
                    <ChronologyPlayer
                      key={currentQuestion.id}
                      content={currentQuestion.content}
                      value={
                        isChronologyAnswer(answer)
                          ? answer
                          : {
                            slotIds: (currentQuestion.content as ChronologyContent).items.map(
                              () => null
                            ),
                            poolIds: (currentQuestion.content as ChronologyContent).items.map(
                              (item) => item.id
                            ),
                          }
                      }
                      onChange={(val) => setAnswer(val)}
                    />
                  );
                case "TRUE_FALSE":
                  return (
                    <TrueFalsePlayer
                      selectedAnswer={answer as boolean | null}
                      disabled={hasSubmitted}
                      onAnswer={(val) => {
                        setAnswer(val);
                      }}
                    />
                  );
                case "CORRECT_THE_ERROR":
                  return (
                    <CorrectTheErrorPlayer
                      content={currentQuestion.content}
                      value={
                        (answer as CorrectTheErrorAnswer) || {
                          selectedPhraseIndex: -1,
                          correction: "",
                        }
                      }
                      onChange={(val) => setAnswer(val)}
                      disabled={hasSubmitted}
                    />
                  );
                default:
                  return (
                    <div className="flex flex-col space-y-4">
                      <Input
                        type="text"
                        value={String(answer)}
                        onChange={(e) => setAnswer(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && submitAnswer(answer, true)
                        }
                        className="text-2xl"
                        placeholder="Type your answer..."
                        data-testid="player-open-answer-input"
                      />
                    </div>
                  );
              }
            })()}
          </div>
          <div className="flex justify-center">
            <Button
              onClick={() => submitAnswer(answer, true)}
              disabled={submitDisabled}
              data-testid="player-submit-answer"
              className="px-12 py-6 rounded-3xl text-3xl shadow-xl"
            >
              <Send className="w-8 h-8 mr-2" />
              <span>{t("player.submit_answer")}</span>
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={`p-8 rounded-2xl border-2 ${submissionStatus === "error"
            ? "bg-red-100 border-red-500"
            : submissionStatus === "success" ||
              currentTeam?.isExplicitlySubmitted
              ? "bg-green-100 border-green-500"
              : "bg-blue-100 border-blue-500"
            }`}
          data-testid="player-submission-state"
        >
          {submissionStatus === "error" ? (
            <>
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-800">
                {t("player.answer_failed")}
              </h2>
            </>
          ) : (
            <>
              <CheckCircle
                className={`w-16 h-16 ${submissionStatus === "success" ||
                  currentTeam?.isExplicitlySubmitted
                  ? "text-green-500"
                  : "text-blue-500"
                  } mx-auto mb-4 ${submissionStatus === "idle" &&
                    !currentTeam?.isExplicitlySubmitted
                    ? "animate-pulse"
                    : ""
                  }`}
              />
              <h2
                className={`text-2xl font-bold ${submissionStatus === "success" ||
                  currentTeam?.isExplicitlySubmitted
                  ? "text-green-800"
                  : "text-blue-800"
                  }`}
              >
                {t("player.answer_received")}
              </h2>
              <p
                className={
                  submissionStatus === "success" ||
                    currentTeam?.isExplicitlySubmitted
                    ? "text-green-700"
                    : "text-blue-700"
                }
              >
                {t("player.waiting_others")}
              </p>
            </>
          )}
        </div>
      )}

      <div
        className="text-4xl font-black text-gray-300"
        data-testid="player-time-remaining"
      >
        {state.timeRemaining}s
      </div>
    </div>
  );
};
