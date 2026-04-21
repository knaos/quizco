import React from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle } from "lucide-react";

interface TrueFalsePlayerProps {
  onAnswer: (isTrue: boolean) => void;
  disabled?: boolean;
  selectedAnswer?: boolean | null;
  previewMode?: boolean;
}

const TrueFalsePlayer: React.FC<TrueFalsePlayerProps> = ({
  onAnswer,
  disabled = false,
  selectedAnswer,
  previewMode = false,
}) => {
  const { t } = useTranslation();

  // In preview mode, buttons are visible but not interactive
  const isEffectivelyDisabled = disabled || previewMode;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl mx-auto">
      <button
        onClick={() => onAnswer(true)}
        disabled={isEffectivelyDisabled}
        data-testid="player-true-choice"
        className={`aspect-square md:aspect-auto md:h-24 rounded-3xl text-4xl font-black uppercase transition-all transform flex items-center justify-center gap-3 shadow-2xl border-b-8 relative ${previewMode
          ? "bg-green-200 text-green-400 border-green-300 cursor-not-allowed"
          : selectedAnswer === true
            ? "bg-green-600 text-white border-green-800 translate-y-2"
            : "bg-green-500 text-white border-green-700 hover:bg-green-400 active:scale-95"
          } ${!previewMode && selectedAnswer !== null && selectedAnswer !== true ? "opacity-50 grayscale" : ""}`}
      >
        {t("game.true")}
        {!previewMode && selectedAnswer === true && (
          <CheckCircle className="w-8 h-8 absolute right-7" />
        )}
      </button>

      <button
        onClick={() => onAnswer(false)}
        disabled={isEffectivelyDisabled}
        data-testid="player-false-choice"
        className={`aspect-square md:aspect-auto md:h-24 rounded-3xl text-4xl font-black uppercase transition-all transform flex items-center justify-center gap-3 shadow-2xl border-b-8 relative ${previewMode
          ? "bg-red-200 text-red-400 border-red-300 cursor-not-allowed"
          : selectedAnswer === false
            ? "bg-red-600 text-white border-red-800 translate-y-2"
            : "bg-red-500 text-white border-red-700 hover:bg-red-400 active:scale-95"
          } ${!previewMode && selectedAnswer !== null && selectedAnswer !== false ? "opacity-50 grayscale" : ""}`}
      >
        {t("game.false")}
        {!previewMode && selectedAnswer === false && (
          <CheckCircle className="w-8 h-8 absolute right-7" />
        )}
      </button>
    </div>
  );
};

export default TrueFalsePlayer;
