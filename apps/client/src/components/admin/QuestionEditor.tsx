import React, { useState, useEffect } from "react";
import { X, Save, Plus, Trash2 } from "lucide-react";
import type { Question, QuestionType, GradingMode, MultipleChoiceContent, CrosswordClue } from "@quizco/shared";
import { Crossword } from "../Crossword";

interface QuestionEditorProps {
  question: Partial<Question>;
  onSave: (question: Partial<Question>) => void;
  onCancel: () => void;
}

export const QuestionEditor: React.FC<QuestionEditorProps> = ({
  question,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<Partial<Question>>({
    question_text: "",
    type: "MULTIPLE_CHOICE",
    points: 10,
    time_limit_seconds: 30,
    grading: "AUTO",
    content: { options: ["", ""], correctIndex: 0 },
    ...question,
  });

  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    if (formData.type === "CROSSWORD") {
      setPreviewKey(k => k + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.content]);

  const handleTypeChange = (type: QuestionType) => {
    let content: any = {};
    if (type === "MULTIPLE_CHOICE" || type === "CLOSED") {
      content = { options: ["", ""], correctIndex: 0 };
    } else if (type === "OPEN_WORD") {
      content = { answer: "" };
    } else if (type === "CROSSWORD") {
      content = { across: [], down: [] };
    }
    setFormData({ ...formData, type, content });
  };

  const addMCOption = () => {
    const content = formData.content as MultipleChoiceContent;
    setFormData({
      ...formData,
      content: { ...content, options: [...content.options, ""] },
    });
  };

  const removeMCOption = (index: number) => {
    const content = formData.content as MultipleChoiceContent;
    const newOptions = content.options.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      content: { 
        ...content, 
        options: newOptions,
        correctIndex: content.correctIndex >= newOptions.length ? 0 : content.correctIndex 
      },
    });
  };

  const updateMCOption = (index: number, value: string) => {
    const content = formData.content as MultipleChoiceContent;
    const newOptions = [...content.options];
    newOptions[index] = value;
    setFormData({
      ...formData,
      content: { ...content, options: newOptions },
    });
  };

  const addCrosswordClue = (direction: "across" | "down") => {
    const content = { ...formData.content };
    const newClue: CrosswordClue = {
        number: (content.across.length + content.down.length) + 1,
        x: 0,
        y: 0,
        direction,
        clue: "",
        answer: ""
    };
    content[direction] = [...content[direction], newClue];
    setFormData({ ...formData, content });
  };

  const updateCrosswordClue = (direction: "across" | "down", index: number, field: keyof CrosswordClue, value: any) => {
    const content = { ...formData.content };
    const newClues = [...content[direction]];
    newClues[index] = { ...newClues[index], [field]: value };
    content[direction] = newClues;
    setFormData({ ...formData, content });
  };

  const removeCrosswordClue = (direction: "across" | "down", index: number) => {
    const content = { ...formData.content };
    content[direction] = content[direction].filter((_: any, i: number) => i !== index);
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

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-600 uppercase">Question Text</label>
            <textarea
              value={formData.question_text}
              onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
              className="w-full p-4 rounded-xl border-2 border-gray-100 focus:border-blue-500 outline-none transition h-24"
              placeholder="Enter your question here..."
            />
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
                value={formData.time_limit_seconds}
                onChange={(e) => setFormData({ ...formData, time_limit_seconds: parseInt(e.target.value) })}
                className="w-full p-3 rounded-xl border-2 border-gray-100 focus:border-blue-500 outline-none transition"
              />
            </div>
          </div>

          <div className="pt-6 border-t">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Content Settings</h3>
            
            {(formData.type === "MULTIPLE_CHOICE" || formData.type === "CLOSED") && (
              <div className="space-y-4">
                {(formData.content as MultipleChoiceContent).options.map((opt, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="correctIndex"
                      checked={(formData.content as MultipleChoiceContent).correctIndex === i}
                      onChange={() => setFormData({
                        ...formData,
                        content: { ...formData.content, correctIndex: i }
                      })}
                      className="w-5 h-5 text-blue-600"
                    />
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => updateMCOption(i, e.target.value)}
                      className="flex-1 p-3 rounded-xl border-2 border-gray-100 focus:border-blue-500 outline-none transition"
                      placeholder={`Option ${i + 1}`}
                    />
                    <button
                      onClick={() => removeMCOption(i)}
                      className="p-2 text-gray-400 hover:text-red-500 transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addMCOption}
                  className="text-blue-600 font-bold flex items-center hover:underline"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Option
                </button>
              </div>
            )}

            {formData.type === "OPEN_WORD" && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600 uppercase">Correct Answer</label>
                <input
                  type="text"
                  value={formData.content?.answer || ""}
                  onChange={(e) => setFormData({
                    ...formData,
                    content: { ...formData.content, answer: e.target.value }
                  })}
                  className="w-full p-3 rounded-xl border-2 border-gray-100 focus:border-blue-500 outline-none transition"
                  placeholder="Enter the correct answer"
                />
              </div>
            )}

            {formData.type === "CROSSWORD" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  {["across", "down"].map((dir) => (
                    <div key={dir}>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-gray-700 uppercase text-xs">{dir}</h4>
                        <button
                          onClick={() => addCrosswordClue(dir as any)}
                          className="text-xs text-blue-600 font-bold"
                        >
                          + Add Word
                        </button>
                      </div>
                      <div className="space-y-3">
                        {formData.content[dir].map((clue: CrosswordClue, i: number) => (
                          <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                            <div className="grid grid-cols-4 gap-2">
                                <input
                                    type="number"
                                    placeholder="X"
                                    value={clue.x}
                                    onChange={(e) => updateCrosswordClue(dir as any, i, "x", parseInt(e.target.value))}
                                    className="p-1 text-xs border rounded"
                                />
                                <input
                                    type="number"
                                    placeholder="Y"
                                    value={clue.y}
                                    onChange={(e) => updateCrosswordClue(dir as any, i, "y", parseInt(e.target.value))}
                                    className="p-1 text-xs border rounded"
                                />
                                <input
                                    type="number"
                                    placeholder="#"
                                    value={clue.number}
                                    onChange={(e) => updateCrosswordClue(dir as any, i, "number", parseInt(e.target.value))}
                                    className="p-1 text-xs border rounded"
                                />
                                <button onClick={() => removeCrosswordClue(dir as any, i)} className="text-red-500 flex justify-end">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <input
                              type="text"
                              placeholder="Word (Answer)"
                              value={clue.answer}
                              onChange={(e) => updateCrosswordClue(dir as any, i, "answer", e.target.value)}
                              className="w-full p-2 text-sm border rounded"
                            />
                            <input
                              type="text"
                              placeholder="Clue"
                              value={clue.clue}
                              onChange={(e) => updateCrosswordClue(dir as any, i, "clue", e.target.value)}
                              className="w-full p-2 text-sm border rounded"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-gray-100 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[300px]">
                    <span className="text-xs font-bold text-gray-400 uppercase mb-4">Live Preview</span>
                    <div className="w-full h-full max-h-[400px] overflow-auto">
                        <Crossword key={previewKey} data={formData.content} onCrosswordCorrect={() => {}} />
                    </div>
                </div>
              </div>
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
