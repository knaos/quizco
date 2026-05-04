import React, { useState } from "react";
import { X, Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import type {
  ChronologyContent,
  ClosedQuestionContent,
  CorrectTheErrorContent,
  CrosswordContent,
  FillInTheBlanksContent,
  GradingMode,
  MatchingContent,
  MultipleChoiceContent,
  OpenWordContent,
  Question,
  QuestionType,
  TrueFalseContent,
} from "@quizco/shared";
import { MultipleChoiceEditor } from "./editors/MultipleChoiceEditor";
import { OpenWordEditor } from "./editors/OpenWordEditor";
import { CrosswordEditor } from "./editors/CrosswordEditor";
import { FillInTheBlanksEditor } from "./editors/FillInTheBlanksEditor";
import { MatchingEditor } from "./editors/MatchingEditor";
import { ChronologyEditor } from "./editors/ChronologyEditor";
import TrueFalseEditor from "./editors/TrueFalseEditor";
import CorrectTheErrorEditor from "./editors/CorrectTheErrorEditor";
import Button from "../ui/Button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../ui/Card";
import Input, { TextArea } from "../ui/Input";

interface QuestionEditorProps {
  question: Partial<Question>;
  onSave: (question: Partial<Question>) => void;
  onCancel: () => void;
}

type EditorContent =
  | MultipleChoiceContent
  | OpenWordContent
  | CrosswordContent
  | FillInTheBlanksContent
  | MatchingContent
  | ChronologyContent
  | TrueFalseContent
  | CorrectTheErrorContent;

interface QuestionFormData extends Omit<Partial<Question>, "content" | "type" | "grading"> {
  questionText: string;
  type: QuestionType;
  points: number;
  timeLimitSeconds: number;
  grading: GradingMode;
  section: string;
  content: EditorContent;
  source: string;
}

const getDefaultContentForType = (type: QuestionType): EditorContent => {
  switch (type) {
    case "MULTIPLE_CHOICE":
    case "CLOSED":
      return { options: ["", ""], correctIndices: [] };
    case "OPEN_WORD":
      return { answer: "" };
    case "CROSSWORD":
      return { grid: [], clues: { across: [], down: [] } };
    case "FILL_IN_THE_BLANKS":
      return { text: "", blanks: [] };
    case "MATCHING":
      return { heroes: [], stories: [] };
    case "CHRONOLOGY":
      return { items: [] };
    case "TRUE_FALSE":
      return { isTrue: true };
    case "CORRECT_THE_ERROR":
      return { text: "", words: [], errorWordIndex: -1, correctReplacement: "" };
  }
};

const toQuestionPayload = (formData: QuestionFormData): Partial<Question> => {
  const basePayload = {
    ...formData,
    content: undefined,
  };

  switch (formData.type) {
    case "MULTIPLE_CHOICE":
      return {
        ...basePayload,
        type: "MULTIPLE_CHOICE",
        content: formData.content as MultipleChoiceContent,
      };
    case "CLOSED":
      return {
        ...basePayload,
        type: "CLOSED",
        content: {
          options: (formData.content as MultipleChoiceContent).options,
        } as ClosedQuestionContent,
      };
    case "OPEN_WORD":
      return {
        ...basePayload,
        type: "OPEN_WORD",
        content: formData.content as OpenWordContent,
      };
    case "CROSSWORD":
      return {
        ...basePayload,
        type: "CROSSWORD",
        content: formData.content as CrosswordContent,
      };
    case "FILL_IN_THE_BLANKS":
      return {
        ...basePayload,
        type: "FILL_IN_THE_BLANKS",
        content: formData.content as FillInTheBlanksContent,
      };
    case "MATCHING":
      return {
        ...basePayload,
        type: "MATCHING",
        content: formData.content as MatchingContent,
      };
    case "CHRONOLOGY":
      return {
        ...basePayload,
        type: "CHRONOLOGY",
        content: formData.content as ChronologyContent,
      };
    case "TRUE_FALSE":
      return {
        ...basePayload,
        type: "TRUE_FALSE",
        content: formData.content as TrueFalseContent,
      };
    case "CORRECT_THE_ERROR":
      return {
        ...basePayload,
        type: "CORRECT_THE_ERROR",
        content: formData.content as CorrectTheErrorContent,
      };
  }
};

export const QuestionEditor: React.FC<QuestionEditorProps> = ({ question, onSave, onCancel }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<QuestionFormData>({
    questionText: "",
    type: "MULTIPLE_CHOICE",
    points: 10,
    timeLimitSeconds: 30,
    grading: "AUTO",
    source: "",
    content: { options: ["", ""], correctIndices: [] },
    section: "",
    ...question,
  } as QuestionFormData);

  const handleTypeChange = (type: QuestionType) => {
    const content = getDefaultContentForType(type);
    setFormData({ ...formData, type, content });
  };

  const handleContentChange = (content: EditorContent) => {
    setFormData({ ...formData, content });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm overflow-auto">
      <Card variant="elevated" className="w-full  max-h-[90vh] flex flex-col overflow-hidden border-none">
        <CardHeader className="flex flex-row justify-between items-center bg-gray-50">
          <CardTitle>
            {question.id ? t("admin.question_editor.edit_question") : t("admin.question_editor.new_question")}
          </CardTitle>
          <Button variant="ghost" onClick={onCancel} className="p-2 rounded-full">
            <X />
          </Button>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto p-4 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600 uppercase">{t("admin.question_editor.question_type")}</label>
              <select
                value={formData.type}
                onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
                className="w-full p-3 rounded-xl border-2 border-gray-100 focus:border-blue-500 outline-none transition"
              >
                <option value="MULTIPLE_CHOICE">{t("admin.question_types.multiple_choice")}</option>
                <option value="CLOSED">{t("admin.question_types.closed")}</option>
                <option value="OPEN_WORD">{t("admin.question_types.open_word")}</option>
                <option value="CROSSWORD">{t("admin.question_types.crossword")}</option>
                <option value="FILL_IN_THE_BLANKS">{t("admin.question_types.fill_blanks")}</option>
                <option value="MATCHING">{t("admin.question_types.matching")}</option>
                <option value="CHRONOLOGY">{t("admin.question_types.chronology")}</option>
                <option value="TRUE_FALSE">{t("admin.question_types.true_false")}</option>
                <option value="CORRECT_THE_ERROR">{t("admin.question_types.correct_error")}</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600 uppercase">{t("admin.question_editor.grading_mode")}</label>
              <select
                value={formData.grading}
                onChange={(e) => setFormData({ ...formData, grading: e.target.value as GradingMode })}
                className="w-full p-3 rounded-xl border-2 border-gray-100 focus:border-blue-500 outline-none transition"
              >
                <option value="AUTO">{t("admin.grading_modes.auto")}</option>
                <option value="MANUAL">{t("admin.grading_modes.manual")}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <TextArea
              label={t("admin.question_editor.question_text")}
              value={formData.questionText}
              onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
              className="h-24"
              placeholder={t("admin.question_editor.question_placeholder")}
            />
            <Input
              label={t("admin.question_editor.section")}
              type="text"
              value={formData.section || ""}
              onChange={(e) => setFormData({ ...formData, section: e.target.value })}
              placeholder={t("admin.question_editor.section_placeholder")}
            />
          </div>

          <TextArea
            label={t("admin.question_editor.source")}
            value={formData.source || ""}
            onChange={(e) => setFormData({ ...formData, source: e.target.value })}
            className="h-20"
            placeholder={t("admin.question_editor.source_placeholder")}
          />

          <div className="grid grid-cols-2 gap-4 text-left">
            <Input
              label={t("admin.question_editor.points")}
              type="number"
              value={formData.points}
              onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })}
            />
            <Input
              label={t("admin.question_editor.time_limit")}
              type="number"
              value={formData.timeLimitSeconds}
              onChange={(e) => setFormData({ ...formData, timeLimitSeconds: parseInt(e.target.value) })}
            />
          </div>

          <div className="pt-6 border-t">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{t("admin.question_editor.content_settings")}</h3>

            {(formData.type === "MULTIPLE_CHOICE" || formData.type === "CLOSED") && (
              <MultipleChoiceEditor
                content={formData.content as MultipleChoiceContent}
                onChange={handleContentChange}
              />
            )}

            {formData.type === "OPEN_WORD" && (
              <OpenWordEditor content={formData.content as OpenWordContent} onChange={handleContentChange} />
            )}

            {formData.type === "CROSSWORD" && (
              <CrosswordEditor content={formData.content as CrosswordContent} onChange={handleContentChange} />
            )}

            {formData.type === "FILL_IN_THE_BLANKS" && (
              <FillInTheBlanksEditor
                content={formData.content as FillInTheBlanksContent}
                onChange={handleContentChange}
              />
            )}

            {formData.type === "MATCHING" && (
              <MatchingEditor content={formData.content as MatchingContent} onChange={handleContentChange} />
            )}

            {formData.type === "CHRONOLOGY" && (
              <ChronologyEditor content={formData.content as ChronologyContent} onChange={handleContentChange} />
            )}

            {formData.type === "TRUE_FALSE" && (
              <TrueFalseEditor content={formData.content as TrueFalseContent} onChange={handleContentChange} />
            )}

            {formData.type === "CORRECT_THE_ERROR" && (
              <CorrectTheErrorEditor
                content={formData.content as CorrectTheErrorContent}
                onChange={handleContentChange}
              />
            )}
          </div>
        </CardContent>

        <CardFooter className="flex justify-end space-x-4">
          <Button
            variant="outline"
            onClick={onCancel}
            className="px-6"
          >
            {t("admin.question_editor.cancel")}
          </Button>
          <Button
            onClick={() => onSave(toQuestionPayload(formData))}
            className="px-8"
          >
            <Save className="mr-2 w-5 h-5" /> {t("admin.question_editor.save_question")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
