import React from "react";
import { Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import type {
  AnswerContent,
  ChronologyContent,
  CorrectTheErrorAnswer,
  CorrectTheErrorContent,
  CrosswordContent,
  GameState,
  MatchingContent,
  MultipleChoiceContent,
} from "@quizco/shared";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Badge from "../ui/Badge";
import { Card } from "../ui/Card";
import { CrosswordPlayer } from "./CrosswordPlayer";
import { FillInTheBlanksPlayer } from "./FillInTheBlanksPlayer";
import { MatchingPlayer } from "./MatchingPlayer";
import { ChronologyPlayer } from "./ChronologyPlayer";
import TrueFalsePlayer from "./TrueFalsePlayer";
import CorrectTheErrorPlayer from "./CorrectTheErrorPlayer";
import { isChronologyAnswer, isStringGrid } from "../../utils/answerGuards";

interface PublicQuestionBodyProps {
  mode: "interactive" | "readOnly";
  state: GameState;
  hasSubmitted: boolean;
  selectedIndices: number[];
  answer: AnswerContent;
  setAnswer: (value: AnswerContent) => void;
  toggleIndex: (index: number) => void;
  submitAnswer: (value: AnswerContent, isFinal?: boolean) => void;
  submissionStatus: "idle" | "success" | "error";
  currentTeam?: { isExplicitlySubmitted?: boolean };
  testIdPrefix?: string;
}

export const PublicQuestionBody: React.FC<PublicQuestionBodyProps> = ({
  mode,
  state,
  hasSubmitted,
  selectedIndices,
  answer,
  setAnswer,
  toggleIndex,
  submitAnswer,
  testIdPrefix = "player",
}) => {
  const { t } = useTranslation();
  const { currentQuestion } = state;

  if (!currentQuestion) {
    return null;
  }

  const isReadOnly = mode === "readOnly";

  return (
    <div className="space-y-8 text-left">
      {currentQuestion.section && (
        <Badge
          variant="yellow"
          className="p-4 rounded-2xl border-2 border-yellow-400 text-2xl"
        >
          {t("player.turn")}: {currentQuestion.section}
        </Badge>
      )}

      <Card className="p-8 border-b-4 border-blue-500">
        <span className="text-blue-600 font-bold uppercase tracking-wider text-sm">
          {t("player.question")}
        </span>
        <h2
          className="text-2xl md:text-3xl font-bold mt-2 text-gray-800"
          data-testid={`${testIdPrefix}-active-question-text`}
        >
          {currentQuestion.questionText}
        </h2>
      </Card>

      <div className="space-y-6 w-full">
        {currentQuestion.type === "MULTIPLE_CHOICE" ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(currentQuestion.content as MultipleChoiceContent).options.map(
                (option: string, index: number) => {
                  const isSelected = selectedIndices.includes(index);
                  const classes =
                    isReadOnly
                      ? "bg-white border-gray-100 text-gray-700"
                      : isSelected
                        ? "bg-blue-600 border-blue-400 text-white shadow-lg translate-y-[-2px]"
                        : "bg-white border-gray-100 text-gray-700 hover:border-blue-200";

                  return (
                    <button
                      key={index}
                      type="button"
                      disabled={isReadOnly || hasSubmitted}
                      onClick={() => toggleIndex(index)}
                      data-testid={`${testIdPrefix}-choice-${index}`}
                      className={`border-4 p-6 rounded-2xl text-xl font-black transition-all transform text-left flex items-center justify-between ${classes}`}
                    >
                      <span>{option}</span>
                    </button>
                  );
                },
              )}
            </div>

            {!isReadOnly && (
              <Button
                variant="primary"
                onClick={() => submitAnswer(selectedIndices, true)}
                disabled={selectedIndices.length === 0}
                size="xl"
                data-testid="player-submit-answer"
                className={`w-full ${selectedIndices.length > 0 ? "translate-y-[-4px]" : ""}`}
              >
                <Send className="w-8 h-8 mr-3" />
                <span>{t("player.submit_answer")}</span>
              </Button>
            )}
          </div>
        ) : currentQuestion.type === "CROSSWORD" ? (
          <div className="bg-white p-4 rounded-xl shadow-inner max-h-[60vh] overflow-auto">
            <CrosswordPlayer
              data={currentQuestion.content}
              value={
                isStringGrid(answer)
                  ? answer
                  : (currentQuestion.content as CrosswordContent).grid.map((row) =>
                      row.map(() => "")
                    )
              }
              onChange={(grid) => {
                if (!isReadOnly) {
                  setAnswer(grid);
                }
              }}
              onSubmit={(grid) => {
                if (!isReadOnly) {
                  submitAnswer(grid, true);
                }
              }}
              readOnly={isReadOnly}
              testIdPrefix={testIdPrefix}
            />
          </div>
        ) : currentQuestion.type === "FILL_IN_THE_BLANKS" ? (
          <div className="space-y-6">
            <FillInTheBlanksPlayer
              content={currentQuestion.content}
              value={(answer as string[]) || []}
              onChange={(value) => setAnswer(value)}
              disabled={isReadOnly}
            />
            {!isReadOnly && (
              <Button
                onClick={() => submitAnswer(answer, true)}
                data-testid="player-submit-answer"
                className="w-full py-6 rounded-3xl text-3xl shadow-xl"
              >
                <Send className="w-8 h-8 mr-2" />
                <span>{t("player.submit_answer")}</span>
              </Button>
            )}
          </div>
        ) : currentQuestion.type === "MATCHING" ? (
          <div className="space-y-6">
            <MatchingPlayer
              content={currentQuestion.content}
              value={(answer as Record<string, string>) || {}}
              onChange={(value) => setAnswer(value)}
              disabled={isReadOnly}
            />
            {!isReadOnly && (
              <Button
                onClick={() => submitAnswer(answer, true)}
                disabled={
                  Object.keys(answer || {}).length <
                  (currentQuestion.content as MatchingContent).pairs.length
                }
                data-testid="player-submit-answer"
                className="w-full py-6 rounded-3xl text-3xl shadow-xl"
              >
                <Send className="w-8 h-8 mr-2" />
                <span>{t("player.submit_answer")}</span>
              </Button>
            )}
          </div>
        ) : currentQuestion.type === "CHRONOLOGY" ? (
          <div className="space-y-6">
            <ChronologyPlayer
              key={currentQuestion.id}
              content={currentQuestion.content}
              value={
                isChronologyAnswer(answer)
                  ? answer
                  : {
                      slotIds: (currentQuestion.content as ChronologyContent).items.map(
                        () => null,
                      ),
                      poolIds: (currentQuestion.content as ChronologyContent).items.map(
                        (item) => item.id,
                      ),
                    }
              }
              onChange={(value) => {
                if (!isReadOnly) {
                  setAnswer(value);
                }
              }}
              disabled={isReadOnly}
            />
            {!isReadOnly && (
              <Button
                onClick={() => submitAnswer(answer, true)}
                data-testid="player-submit-answer"
                className="w-full py-6 rounded-3xl text-3xl shadow-xl"
              >
                <Send className="w-8 h-8 mr-2" />
                <span>{t("player.submit_answer")}</span>
              </Button>
            )}
          </div>
        ) : currentQuestion.type === "TRUE_FALSE" ? (
          <div className="space-y-6">
            <TrueFalsePlayer
              selectedAnswer={answer as boolean | null}
              disabled={hasSubmitted || isReadOnly}
              onAnswer={(value) => {
                setAnswer(value);
              }}
            />
            {!isReadOnly && (
              <Button
                onClick={() => submitAnswer(answer, true)}
                disabled={answer === null}
                data-testid="player-submit-answer"
                className="w-full py-6 rounded-3xl text-3xl shadow-xl"
              >
                <Send className="w-8 h-8 mr-2" />
                <span>{t("player.submit_answer")}</span>
              </Button>
            )}
          </div>
        ) : currentQuestion.type === "CORRECT_THE_ERROR" ? (
          <div className="space-y-6">
            <CorrectTheErrorPlayer
              content={currentQuestion.content as CorrectTheErrorContent}
              value={
                (answer as CorrectTheErrorAnswer) || {
                  selectedPhraseIndex: -1,
                  correction: "",
                }
              }
              onChange={(value) => setAnswer(value)}
              disabled={hasSubmitted || isReadOnly}
            />
            {!isReadOnly && !hasSubmitted && (
              <Button
                onClick={() => submitAnswer(answer, true)}
                disabled={
                  (answer as CorrectTheErrorAnswer).selectedPhraseIndex === -1 ||
                  !(answer as CorrectTheErrorAnswer).correction
                }
                data-testid="player-submit-answer"
                className="w-full py-6 rounded-3xl text-3xl shadow-xl"
              >
                <Send className="w-8 h-8 mr-2" />
                <span>{t("player.submit_answer")}</span>
              </Button>
            )}
          </div>
        ) : isReadOnly ? null : (
          <div className="flex flex-col space-y-4">
            <Input
              type="text"
              value={String(answer)}
              onChange={(event) => setAnswer(event.target.value)}
              onKeyDown={(event) =>
                event.key === "Enter" && submitAnswer(answer, true)
              }
              className="text-2xl"
              placeholder={t("player.type_answer")}
              data-testid="player-open-answer-input"
            />
            <Button
              onClick={() => submitAnswer(answer, true)}
              size="lg"
              data-testid="player-submit-answer"
              className="shadow-lg"
            >
              <Send className="mr-2" />
              <span>{t("player.submit_answer")}</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
