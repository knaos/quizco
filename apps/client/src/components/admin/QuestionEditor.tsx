import React, { useState } from "react";
import { X, Save } from "lucide-react";
import type { Question, QuestionType, GradingMode } from "@quizco/shared";
import { MultipleChoiceEditor } from "./editors/MultipleChoiceEditor";
import { OpenWordEditor } from "./editors/OpenWordEditor";
import { CrosswordEditor } from "./editors/CrosswordEditor";
import { FillInTheBlanksEditor } from "./editors/FillInTheBlanksEditor";
import { MatchingEditor } from "./editors/MatchingEditor";

interface QuestionEditorProps {
  question: Partial<Question>;
  onSave: (question: Partial<Question>) => void;
  onCancel: () => void;
}

export const QuestionEditor: React.FC<QuestionEditorProps> = ({ question, onSave, onCancel }) => {
  const [formData, setFormData] = useState<any>({
    questionText: "",
    type: "MULTIPLE_CHOICE",
    points: 10,
    timeLimitSeconds: 30,
    grading: "AUTO",
    content: { options: ["", ""], correctIndex: 0 },
    section: "",
    ...question,
  });

  const handleTypeChange = (type: QuestionType) => {
    let content: any = {};
    if (type === "MULTIPLE_CHOICE" || type === "CLOSED") {
      content = { options: ["", ""], correctIndices: [] };
    } else if (type === "OPEN_WORD") {
      content = { answer: "" };
    } else if (type === "CROSSWORD") {
      content = { grid: [], clues: { across: [], down: [] } };
    } else if (type === "FILL_IN_THE_BLANKS") {
      content = { text: "", blanks: [] };
    } else if (type === "MATCHING") {
      content = { pairs: [] };
    }
    setFormData({ ...formData, type, content });
  };

  const handleContentChange = (content: any) => {
    setFormData({ ...formData, content });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm overflow-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
          <h2 className="text-2xl font-bold text-gray-800">
            {question.id ? "Edit Question" : "New Question"}
          </h2>
          <button onClick={onCancel} className="p-2 hover:bg-gray-200 rounded-full transition">
            <X />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600 uppercase">Question Type</label>
              <select
                value={formData.type}
                onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
                className="w-full p-3 rounded-xl border-2 border-gray-100 focus:border-blue-500 outline-none transition"
              >
                <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                <option value="CLOSED">Closed (One Answer)</option>
                <option value="OPEN_WORD">Open Word</option>
                <option value="CROSSWORD">Crossword</option>
                <option value="FILL_IN_THE_BLANKS">Fill in the Blanks</option>
                <option value="MATCHING">Matching</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600 uppercase">Grading Mode</label>
              <select
                value={formData.grading}
                onChange={(e) => setFormData({ ...formData, grading: e.target.value as GradingMode })}
                className="w-full p-3 rounded-xl border-2 border-gray-100 focus:border-blue-500 outline-none transition"
              >
                <option value="AUTO">Automatic</option>
                <option value="MANUAL">Manual (Host Graded)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600 uppercase">Question Text</label>
              <textarea
                value={formData.questionText}
                onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
                className="w-full p-4 rounded-xl border-2 border-gray-100 focus:border-blue-500 outline-none transition h-24"
                placeholder="Enter your question here..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600 uppercase">Section (Round 1 only)</label>
              <input
                type="text"
                value={formData.section || ""}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                className="w-full p-3 rounded-xl border-2 border-gray-100 focus:border-blue-500 outline-none transition"
                placeholder="e.g., Player 1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600 uppercase">Points</label>
              <input
                type="number"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })}
                className="w-full p-3 rounded-xl border-2 border-gray-100 focus:border-blue-500 outline-none transition"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600 uppercase">Time Limit (s)</label>
              <input
                type="number"
                value={formData.timeLimitSeconds}
                onChange={(e) => setFormData({ ...formData, timeLimitSeconds: parseInt(e.target.value) })}
                className="w-full p-3 rounded-xl border-2 border-gray-100 focus:border-blue-500 outline-none transition"
              />
            </div>
          </div>

          <div className="pt-6 border-t">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Content Settings</h3>

            {(formData.type === "MULTIPLE_CHOICE" || formData.type === "CLOSED") && (
              <MultipleChoiceEditor content={formData.content as any} onChange={handleContentChange} />
            )}

            {formData.type === "OPEN_WORD" && (
              <OpenWordEditor content={formData.content as any} onChange={handleContentChange} />
            )}

            {formData.type === "CROSSWORD" && (
              <CrosswordEditor content={formData.content as any} onChange={handleContentChange} />
            )}

            {formData.type === "FILL_IN_THE_BLANKS" && (
              <FillInTheBlanksEditor content={formData.content as any} onChange={handleContentChange} />
            )}

            {formData.type === "MATCHING" && (
              <MatchingEditor content={formData.content as any} onChange={handleContentChange} />
            )}
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end space-x-4 rounded-b-2xl">
          <button
            onClick={onCancel}
            className="px-6 py-2 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center shadow-lg transition"
          >
            <Save className="mr-2 w-5 h-5" /> Save Question
          </button>
        </div>
      </div>
    </div>
  );
};
