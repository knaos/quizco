import React from "react";
import { useTranslation } from "react-i18next";

interface TrueFalsePlayerProps {
  onAnswer: (isTrue: boolean) => void;
  disabled?: boolean;
  selectedAnswer?: boolean | null;
}

const TrueFalsePlayer: React.FC<TrueFalsePlayerProps> = ({
  onAnswer,
  disabled,
  selectedAnswer,
}) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl mx-auto">
      <button
        onClick={() => onAnswer(true)}
        disabled={disabled}
        className={`aspect-square md:aspect-auto md:h-64 rounded-3xl text-4xl font-black uppercase transition-all transform active:scale-95 flex items-center justify-center shadow-2xl border-b-8 ${
          selectedAnswer === true
            ? "bg-green-600 text-white border-green-800 translate-y-2"
            : "bg-green-500 text-white border-green-700 hover:bg-green-400"
        } ${disabled && selectedAnswer !== true ? "opacity-50 grayscale" : ""}`}
      >
        {t("game.true")}
      </button>

      <button
        onClick={() => onAnswer(false)}
        disabled={disabled}
        className={`aspect-square md:aspect-auto md:h-64 rounded-3xl text-4xl font-black uppercase transition-all transform active:scale-95 flex items-center justify-center shadow-2xl border-b-8 ${
          selectedAnswer === false
            ? "bg-red-600 text-white border-red-800 translate-y-2"
            : "bg-red-500 text-white border-red-700 hover:bg-red-400"
        } ${disabled && selectedAnswer !== false ? "opacity-50 grayscale" : ""}`}
      >
        {t("game.false")}
      </button>
    </div>
  );
};

export default TrueFalsePlayer;
