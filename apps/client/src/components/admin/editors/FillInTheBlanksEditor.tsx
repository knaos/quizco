import React from "react";
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { FillInTheBlanksContent } from "@quizco/shared";
import Button from "../../ui/Button";
import Input, { TextArea } from "../../ui/Input";
import { Card } from "../../ui/Card";

interface FillInTheBlanksEditorProps {
  content: FillInTheBlanksContent;
  onChange: (content: FillInTheBlanksContent) => void;
}

export const FillInTheBlanksEditor: React.FC<FillInTheBlanksEditorProps> = ({
  content,
  onChange,
}) => {
  const { t } = useTranslation();

  const updateText = (text: string) => {
    const placeholderCount = (text.match(/\{(\d+)\}/g) || []).length;
    const newBlanks = [...(content.blanks || [])];

    if (newBlanks.length < placeholderCount) {
      for (let i = newBlanks.length; i < placeholderCount; i++) {
        newBlanks.push({ options: [{ value: "", isCorrect: true }] });
      }
    } else if (newBlanks.length > placeholderCount) {
      newBlanks.splice(placeholderCount);
    }

    onChange({
      ...content,
      text,
      blanks: newBlanks,
    });
  };

  const addOption = (blankIndex: number) => {
    const newBlanks = [...content.blanks];
    newBlanks[blankIndex].options.push({ value: "", isCorrect: false });
    onChange({ ...content, blanks: newBlanks });
  };

  const removeOption = (blankIndex: number, optionIndex: number) => {
    const newBlanks = [...content.blanks];
    const blank = newBlanks[blankIndex];
    if (blank.options.length <= 1) return;

    const wasCorrect = blank.options[optionIndex].isCorrect;
    blank.options = blank.options.filter((_, i) => i !== optionIndex);
    
    if (wasCorrect && blank.options.length > 0) {
      blank.options[0].isCorrect = true;
    }
    
    onChange({ ...content, blanks: newBlanks });
  };

  const updateOption = (blankIndex: number, optionIndex: number, value: string) => {
    const newBlanks = [...content.blanks];
    newBlanks[blankIndex].options[optionIndex].value = value;
    onChange({ ...content, blanks: newBlanks });
  };

  const setCorrect = (blankIndex: number, optionIndex: number) => {
    const newBlanks = [...content.blanks];
    newBlanks[blankIndex].options.forEach((opt, i) => {
      opt.isCorrect = i === optionIndex;
    });
    onChange({ ...content, blanks: newBlanks });
  };

  return (
    <div className="space-y-4">
      <TextArea
        label={t("admin.fillBlanksEditor.text_placeholder_label")}
        value={content.text}
        onChange={(e) => updateText(e.target.value)}
        rows={3}
      />

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="prefill"
          checked={content.prefill || false}
          onChange={(e) => onChange({ ...content, prefill: e.target.checked })}
          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
        />
        <label htmlFor="prefill" className="text-sm font-medium text-gray-700">
          {t("admin.fillBlanksEditor.prefill")}
        </label>
      </div>

      <div className="space-y-6">
        <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider ml-1">
          {t("admin.fillBlanksEditor.blanks_config")}
        </label>
        {content.blanks.map((blank, bIdx) => (
          <Card key={bIdx} variant="flat" className="space-y-3 p-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-blue-600 font-black text-lg">{t("admin.fillBlanksEditor.placeholder")} {`{${bIdx}}`}</span>
              <span className="text-xs font-bold uppercase text-gray-400">{t("admin.fillBlanksEditor.options_for_blank")}</span>
            </div>
            
            <div className="space-y-2">
              {blank.options.map((option, oIdx) => (
                <div key={oIdx} className="flex items-center space-x-3">
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => setCorrect(bIdx, oIdx)}
                    className={`p-0 hover:bg-transparent transition-colors ${option.isCorrect ? 'text-green-500' : 'text-gray-300 hover:text-green-200'}`}
                  >
                    {option.isCorrect ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                  </Button>
                  <Input
                    type="text"
                    value={option.value}
                    onChange={(e) => updateOption(bIdx, oIdx, e.target.value)}
                    className="flex-1 py-2 text-base"
                    placeholder={t("admin.fillBlanksEditor.option_placeholder", { number: oIdx + 1 })}
                  />
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => removeOption(bIdx, oIdx)}
                    disabled={blank.options.length <= 1}
                    className="p-2 text-gray-300 hover:text-red-500 disabled:opacity-0"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              variant="ghost"
              type="button"
              onClick={() => addOption(bIdx)}
              className="text-blue-600 p-0 hover:bg-transparent hover:underline text-sm mt-2"
            >
              <Plus className="w-4 h-4 mr-1" /> {t("admin.fillBlanksEditor.add_option")}
            </Button>
          </Card>
        ))}

        {content.blanks.length === 0 && (
          <p className="text-sm text-gray-400 italic">
            {t("admin.fillBlanksEditor.hint")}
          </p>
        )}
      </div>
    </div>
  );
};
