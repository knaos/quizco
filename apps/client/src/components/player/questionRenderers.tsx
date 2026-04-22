import React from "react";
import type {
  AnswerContent,
  ChronologyAnswer,
  ChronologyContent,
  CorrectTheErrorAnswer,
  CorrectTheErrorContent,
  CrosswordContent,
  FillInTheBlanksContent,
  MatchingContent,
  MultipleChoiceContent,
  MultipleChoiceQuestion,
  Question,
  QuestionType,
  TrueFalseContent,
} from "@quizco/shared";
import type { TFunction } from "i18next";
import Button from "../ui/Button";
import Input from "../ui/Input";
import { CrosswordAudienceView } from "./CrosswordAudienceView";
import { CrosswordPlayer } from "./questions/crossword/CrosswordPlayer";
import { FillInTheBlanksPlayer } from "./questions/fillInTheBlanks/FillInTheBlanksPlayer";
import { MatchingPlayer } from "./questions/matching/MatchingPlayer";
import { ChronologyPlayer } from "./questions/chronology/ChronologyPlayer";
import TrueFalsePlayer from "./questions/trueFalse/TrueFalsePlayer";
import CorrectTheErrorPlayer from "./questions/correctTheError/CorrectTheErrorPlayer";
import { MultipleChoicePlayer } from "./questions/multipleChoice/MultipleChoicePlayer";
import { MultipleChoiceReveal } from "./questions/multipleChoice/MultipleChoiceReveal";
import { ChronologyReveal } from "./questions/chronology/ChronologyReveal";
import { MatchingReveal } from "./questions/matching/MatchingReveal";
import { FillInTheBlanksReveal } from "./questions/fillInTheBlanks/FillInTheBlanksReveal";
import { CrosswordReveal } from "./questions/crossword/CrosswordReveal";
import { CorrectTheErrorReveal } from "./questions/correctTheError/CorrectTheErrorReveal";
import { TrueFalseReveal } from "./questions/trueFalse/TrueFalseReveal";
import { DefaultReveal } from "./questions/DefaultReveal";
import { isChronologyAnswer, isStringGrid } from "../../utils/answerGuards";
import { getQuestionCorrectAnswer } from "./questionText";

export interface QuestionPreviewRendererContext {
  question: Question;
  revealStep: number;
  testIdPrefix: string;
  t: TFunction;
}

export interface InteractiveQuestionRendererContext {
  question: Question;
  answer: AnswerContent;
  selectedIndices: number[];
  hasSubmitted: boolean;
  setAnswer: (value: AnswerContent) => void;
  toggleIndex: (index: number) => void;
  submitAnswer: (value: AnswerContent, isFinal?: boolean) => void;
  testIdPrefix: string;
  requestJoker?: () => void;
  t: TFunction;
}

export interface ReadOnlyQuestionRendererContext {
  question: Question;
  answer?: AnswerContent;
  selectedIndices?: number[];
  testIdPrefix: string;
  t: TFunction;
}

export interface RevealQuestionRendererContext {
  question: Question;
  lastAnswer?: AnswerContent | null;
  gradingStatus?: boolean;
  t: TFunction;
  variant: "player" | "audience" | "host";
}

export interface QuestionRenderer {
  preview: (context: QuestionPreviewRendererContext) => React.ReactNode;
  active: (context: InteractiveQuestionRendererContext) => React.ReactNode;
  readOnly: (context: ReadOnlyQuestionRendererContext) => React.ReactNode;
  reveal: (context: RevealQuestionRendererContext) => React.ReactNode;
}

function buildEmptyChronologyAnswer(content: ChronologyContent): ChronologyAnswer {
  return {
    slotIds: content.items.map(() => null),
    poolIds: content.items.map((item) => item.id),
  };
}

function buildCorrectChronologyAnswer(content: ChronologyContent): ChronologyAnswer {
  const ordered = [...content.items].sort((left, right) => left.order - right.order);
  return {
    slotIds: ordered.map((item) => item.id),
    poolIds: [],
  };
}

function buildFillInTheBlanksAnswer(content: FillInTheBlanksContent): string[] {
  return content.blanks.map(
    (blank) => blank.options.find((option) => option.isCorrect)?.value || "",
  );
}

function buildMatchingAnswer(content: MatchingContent): Record<string, string> {
  const storyByHero = new Map(
    content.stories
      .filter((s) => s.correspondsTo)
      .map((s) => [s.correspondsTo, s.id])
  );
  return Object.fromEntries(
    content.heroes.map((hero) => [hero.id, storyByHero.get(hero.id) || ""])
  );
}

function buildCorrectTheErrorAnswer(
  content: CorrectTheErrorContent,
): CorrectTheErrorAnswer {
  return {
    selectedWordIndex: content.errorWordIndex,
    correction: content.correctReplacement,
  };
}

function renderDefaultReadOnlyAnswer(question: Question, t: TFunction, testIdPrefix: string) {
  return (
    <div
      className="bg-white p-8 rounded-3xl shadow-xl border-b-8 border-blue-500 text-left leading-loose text-2xl font-medium text-gray-800"
      data-testid={`${testIdPrefix}-passive-answer-placeholder`}
    >
      {question.type === "CLOSED"
        ? question.content.options.join(", ")
        : t("audience.open_answer_hidden")}
    </div>
  );
}

function renderSimpleCorrectAnswer(question: Question, t: TFunction, variant: "audience" | "host") {
  return (
    <div
      className="bg-green-50 p-6 rounded-2xl border-2 border-green-200"
      data-testid={variant === "audience" ? "audience-correct-answer" : undefined}
    >
      <span className="text-green-600 text-xs font-bold uppercase">
        {t("player.correct_answer")}
      </span>
      <p className="text-2xl font-black text-green-900 mt-1">
        {getQuestionCorrectAnswer(question, t)}
      </p>
    </div>
  );
}

const questionRenderers: Record<QuestionType, QuestionRenderer> = {
  MULTIPLE_CHOICE: {
    preview: ({ question, revealStep, testIdPrefix }) => (
      <MultipleChoicePlayer
        options={(question.content as MultipleChoiceContent).options}
        selectedIndices={[]}
        onToggleIndex={() => undefined}
        previewMode={true}
        revealStep={revealStep}
        testIdPrefix={testIdPrefix}
      />
    ),
    active: ({
      question,
      selectedIndices,
      toggleIndex,
      submitAnswer,
      testIdPrefix,
      t,
    }) => (
      <div className="space-y-6">
        <MultipleChoicePlayer
          options={(question.content as MultipleChoiceContent).options}
          selectedIndices={selectedIndices}
          onToggleIndex={toggleIndex}
          disabled={false}
          testIdPrefix={testIdPrefix}
        />
        <Button
          variant="primary"
          onClick={() => submitAnswer(selectedIndices, true)}
          disabled={selectedIndices.length === 0}
          size="xl"
          data-testid={`${testIdPrefix}-submit-answer`}
          className={`w-full ${selectedIndices.length > 0 ? "translate-y-[-4px]" : ""}`}
        >
          {t("player.submit_answer")}
        </Button>
      </div>
    ),
    readOnly: ({ question, selectedIndices = [], testIdPrefix }) => (
      <div className="space-y-6">
        <MultipleChoicePlayer
          options={(question.content as MultipleChoiceContent).options}
          selectedIndices={selectedIndices}
          onToggleIndex={() => undefined}
          disabled
          testIdPrefix={testIdPrefix}
        />
        <div data-testid={`${testIdPrefix}-readonly-multiple-choice`} />
      </div>
    ),
    reveal: ({ question, lastAnswer, variant }) => (
      <MultipleChoiceReveal
        question={question as MultipleChoiceQuestion}
        lastAnswer={
          variant === "audience"
            ? (question.content as MultipleChoiceContent).correctIndices
            : ((lastAnswer as number[] | null) ?? null)
        }
        showSelectionLabels={variant !== "audience"}
      />
    ),
  },
  CROSSWORD: {
    preview: ({ question }) => (
      <CrosswordPlayer
        data={question.content as CrosswordContent}
        previewMode
      />
    ),
    active: ({ question, answer, setAnswer, submitAnswer, requestJoker, testIdPrefix, t }) => (
      <CrosswordPlayer
        data={question.content as CrosswordContent}
        value={
          isStringGrid(answer)
            ? answer
            : (question.content as CrosswordContent).grid.map((row) => row.map(() => ""))
        }
        onChange={(grid) => setAnswer(grid)}
        onSubmit={(grid) => submitAnswer(grid, true)}
        onRequestJoker={requestJoker}
        requestJokerLabel={t("game.request_joker")}
        submitLabel={t("player.submit_crossword")}
        testIdPrefix={testIdPrefix}
      />
    ),
    readOnly: ({ question, testIdPrefix }) => (
      <div className="bg-white p-4 rounded-xl shadow-inner max-h-[60vh] overflow-auto">
        <CrosswordAudienceView
          content={question.content as CrosswordContent}
          testIdPrefix={testIdPrefix}
        />
      </div>
    ),
    reveal: ({ question, lastAnswer, variant }) => (
      <CrosswordReveal
        content={question.content as CrosswordContent}
        lastAnswer={
          variant === "audience" || variant === "host"
            ? (question.content as CrosswordContent).grid
            : ((lastAnswer as string[][] | null) ?? null)
        }
      />
    ),
  },
  FILL_IN_THE_BLANKS: {
    preview: ({ question }) => (
      <FillInTheBlanksPlayer
        content={question.content as FillInTheBlanksContent}
        value={[]}
        onChange={() => undefined}
        previewMode
      />
    ),
    active: ({ question, answer, setAnswer, submitAnswer, testIdPrefix, t }) => (
      <div className="space-y-6">
        <FillInTheBlanksPlayer
          content={question.content as FillInTheBlanksContent}
          value={(answer as string[]) || []}
          onChange={(value) => setAnswer(value)}
        />
        <Button
          onClick={() => submitAnswer(answer, true)}
          data-testid={`${testIdPrefix}-submit-answer`}
          className="w-full py-6 rounded-3xl text-3xl shadow-xl"
        >
          {t("player.submit_answer")}
        </Button>
      </div>
    ),
    readOnly: ({ question, answer = [] }) => (
      <FillInTheBlanksPlayer
        content={question.content as FillInTheBlanksContent}
        value={(answer as string[]) || []}
        onChange={() => undefined}
        disabled
      />
    ),
    reveal: ({ question, lastAnswer, variant }) => (
      <FillInTheBlanksReveal
        content={question.content as FillInTheBlanksContent}
        lastAnswer={
          variant === "audience" || variant === "host"
            ? buildFillInTheBlanksAnswer(question.content as FillInTheBlanksContent)
            : ((lastAnswer as string[] | null) ?? null)
        }
      />
    ),
  },
  MATCHING: {
    preview: ({ question }) => (
      <MatchingPlayer
        content={question.content as MatchingContent}
        value={{}}
        onChange={() => undefined}
        previewMode
      />
    ),
    active: ({ question, answer, setAnswer, submitAnswer, testIdPrefix, t }) => (
      <div className="space-y-6">
        <MatchingPlayer
          content={question.content as MatchingContent}
          value={(answer as Record<string, string>) || {}}
          onChange={(value) => setAnswer(value)}
        />
        <Button
          onClick={() => submitAnswer(answer, true)}
          disabled={
            Object.keys((answer as Record<string, string>) || {}).length <
            (question.content as MatchingContent).heroes.length
          }
          data-testid={`${testIdPrefix}-submit-answer`}
          className="w-full py-6 rounded-3xl text-3xl shadow-xl"
        >
          {t("player.submit_answer")}
        </Button>
      </div>
    ),
    readOnly: ({ question, answer = {} }) => (
      <MatchingPlayer
        content={question.content as MatchingContent}
        value={(answer as Record<string, string>) || {}}
        onChange={() => undefined}
        disabled
      />
    ),
    reveal: ({ question, lastAnswer, variant }) => (
      <MatchingReveal
        content={question.content as MatchingContent}
        lastAnswer={
          variant === "audience" || variant === "host"
            ? buildMatchingAnswer(question.content as MatchingContent)
            : ((lastAnswer as Record<string, string> | null) ?? null)
        }
      />
    ),
  },
  CHRONOLOGY: {
    preview: ({ question }) => (
      <ChronologyPlayer
        content={question.content as ChronologyContent}
        value={buildEmptyChronologyAnswer(question.content as ChronologyContent)}
        onChange={() => undefined}
        previewMode
      />
    ),
    active: ({ question, answer, setAnswer, submitAnswer, testIdPrefix, t }) => (
      <div className="space-y-6">
        <ChronologyPlayer
          key={question.id}
          content={question.content as ChronologyContent}
          value={
            isChronologyAnswer(answer)
              ? answer
              : buildEmptyChronologyAnswer(question.content as ChronologyContent)
          }
          onChange={(value) => setAnswer(value)}
        />
        <Button
          onClick={() => submitAnswer(answer, true)}
          data-testid={`${testIdPrefix}-submit-answer`}
          className="w-full py-6 rounded-3xl text-3xl shadow-xl"
        >
          {t("player.submit_answer")}
        </Button>
      </div>
    ),
    readOnly: ({ question, answer }) => (
      <ChronologyPlayer
        key={question.id}
        content={question.content as ChronologyContent}
        value={
          isChronologyAnswer(answer)
            ? answer
            : buildEmptyChronologyAnswer(question.content as ChronologyContent)
        }
        onChange={() => undefined}
        disabled
      />
    ),
    reveal: ({ question, lastAnswer, variant }) => (
      <ChronologyReveal
        content={question.content as ChronologyContent}
        lastAnswer={
          variant === "audience" || variant === "host"
            ? buildCorrectChronologyAnswer(question.content as ChronologyContent)
            : ((lastAnswer as ChronologyAnswer | null) ?? null)
        }
      />
    ),
  },
  TRUE_FALSE: {
    preview: () => (
      <TrueFalsePlayer
        selectedAnswer={null}
        onAnswer={() => undefined}
        previewMode
      />
    ),
    active: ({ answer, setAnswer, submitAnswer, testIdPrefix, t }) => (
      <div className="space-y-6">
        <TrueFalsePlayer
          selectedAnswer={answer as boolean | null}
          onAnswer={(value) => setAnswer(value)}
        />
        <Button
          onClick={() => submitAnswer(answer, true)}
          disabled={answer === null}
          data-testid={`${testIdPrefix}-submit-answer`}
          className="w-full py-6 rounded-3xl text-3xl shadow-xl"
        >
          {t("player.submit_answer")}
        </Button>
      </div>
    ),
    readOnly: ({ answer }) => (
      <TrueFalsePlayer
        selectedAnswer={(answer as boolean | null) ?? null}
        onAnswer={() => undefined}
        disabled
      />
    ),
    reveal: ({ question, lastAnswer, variant }) => (
      <TrueFalseReveal
        content={question.content as TrueFalseContent}
        lastAnswer={
          variant === "audience" || variant === "host"
            ? (question.content as TrueFalseContent).isTrue
            : ((lastAnswer as boolean | null) ?? null)
        }
        variant={variant}
      />
    ),
  },
  CORRECT_THE_ERROR: {
    preview: ({ question }) => (
      <CorrectTheErrorPlayer
        content={question.content as CorrectTheErrorContent}
        value={{ selectedWordIndex: -1, correction: "" }}
        onChange={() => undefined}
        previewMode
      />
    ),
    active: ({ question, answer, setAnswer, submitAnswer, hasSubmitted, testIdPrefix, t }) => (
      <div className="space-y-6">
        <CorrectTheErrorPlayer
          content={question.content as CorrectTheErrorContent}
          value={
            (answer as CorrectTheErrorAnswer) || {
              selectedWordIndex: -1,
              correction: "",
            }
          }
          onChange={(value) => setAnswer(value)}
          disabled={hasSubmitted}
        />
        <Button
          onClick={() => submitAnswer(answer, true)}
          disabled={
            (answer as CorrectTheErrorAnswer)?.selectedWordIndex === -1 ||
            !(answer as CorrectTheErrorAnswer)?.correction
          }
          data-testid={`${testIdPrefix}-submit-answer`}
          className="w-full py-6 rounded-3xl text-3xl shadow-xl"
        >
          {t("player.submit_answer")}
        </Button>
      </div>
    ),
    readOnly: ({ question, answer }) => (
      <CorrectTheErrorPlayer
        content={question.content as CorrectTheErrorContent}
        value={
          (answer as CorrectTheErrorAnswer) || {
            selectedWordIndex: -1,
            correction: "",
          }
        }
        onChange={() => undefined}
        disabled
      />
    ),
    reveal: ({ question, lastAnswer, variant }) => (
      <CorrectTheErrorReveal
        content={question.content as CorrectTheErrorContent}
        lastAnswer={
          variant === "audience" || variant === "host"
            ? buildCorrectTheErrorAnswer(question.content as CorrectTheErrorContent)
            : ((lastAnswer as CorrectTheErrorAnswer | null) ?? null)
        }
      />
    ),
  },
  CLOSED: {
    preview: ({ t }) => (
      <Input
        type="text"
        value=""
        readOnly
        disabled
        placeholder={t("player.type_answer")}
        data-testid="player-preview-answer-input"
        className="text-2xl"
      />
    ),
    active: ({ answer, setAnswer, submitAnswer, testIdPrefix, t }) => (
      <div className="flex flex-col space-y-4">
        <Input
          type="text"
          value={String(answer)}
          onChange={(event) => setAnswer(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && submitAnswer(answer, true)}
          className="text-2xl"
          placeholder={t("player.type_answer")}
          data-testid={`${testIdPrefix}-open-answer-input`}
        />
        <Button
          onClick={() => submitAnswer(answer, true)}
          size="lg"
          data-testid={`${testIdPrefix}-submit-answer`}
          className="shadow-lg"
        >
          {t("player.submit_answer")}
        </Button>
      </div>
    ),
    readOnly: ({ question, t, testIdPrefix }) =>
      renderDefaultReadOnlyAnswer(question, t, testIdPrefix),
    reveal: ({ question, lastAnswer, gradingStatus, t, variant }) =>
      variant === "audience" || variant === "host" ? (
        renderSimpleCorrectAnswer(question, t, variant)
      ) : (
        <DefaultReveal
          lastAnswer={lastAnswer as AnswerContent}
          gradingStatus={gradingStatus}
          getCorrectAnswer={() => getQuestionCorrectAnswer(question, t)}
        />
      ),
  },
  OPEN_WORD: {
    preview: ({ t }) => (
      <Input
        type="text"
        value=""
        readOnly
        disabled
        placeholder={t("player.type_answer")}
        data-testid="player-preview-answer-input"
        className="text-2xl"
      />
    ),
    active: ({ answer, setAnswer, submitAnswer, testIdPrefix, t }) => (
      <div className="flex flex-col space-y-4">
        <Input
          type="text"
          value={String(answer)}
          onChange={(event) => setAnswer(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && submitAnswer(answer, true)}
          className="text-2xl"
          placeholder={t("player.type_answer")}
          data-testid={`${testIdPrefix}-open-answer-input`}
        />
        <Button
          onClick={() => submitAnswer(answer, true)}
          size="lg"
          data-testid={`${testIdPrefix}-submit-answer`}
          className="shadow-lg"
        >
          {t("player.submit_answer")}
        </Button>
      </div>
    ),
    readOnly: ({ question, t, testIdPrefix }) =>
      renderDefaultReadOnlyAnswer(question, t, testIdPrefix),
    reveal: ({ question, lastAnswer, gradingStatus, t, variant }) =>
      variant === "audience" || variant === "host" ? (
        renderSimpleCorrectAnswer(question, t, variant)
      ) : (
        <DefaultReveal
          lastAnswer={lastAnswer as AnswerContent}
          gradingStatus={gradingStatus}
          getCorrectAnswer={() => getQuestionCorrectAnswer(question, t)}
        />
      ),
  },
};

export function getQuestionRenderer(type: QuestionType): QuestionRenderer {
  return questionRenderers[type];
}

export function getQuestionPreviewRenderer(context: QuestionPreviewRendererContext) {
  return getQuestionRenderer(context.question.type).preview(context);
}

export function getQuestionActiveRenderer(context: InteractiveQuestionRendererContext) {
  return getQuestionRenderer(context.question.type).active(context);
}

export function getQuestionReadOnlyRenderer(context: ReadOnlyQuestionRendererContext) {
  return getQuestionRenderer(context.question.type).readOnly(context);
}

export function getQuestionRevealRenderer(context: RevealQuestionRendererContext) {
  return getQuestionRenderer(context.question.type).reveal(context);
}
