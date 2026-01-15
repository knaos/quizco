import React from "react";
import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const nextLang = i18n.language === "en" ? "bg" : "en";
    i18n.changeLanguage(nextLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full transition-all border border-white/20 group"
      title={i18n.language === "en" ? "Switch to Bulgarian" : "Превключи на английски"}
    >
      <Languages className="w-4 h-4 group-hover:rotate-12 transition-transform" />
      <span className="text-xs font-bold uppercase tracking-wider">
        {i18n.language === "en" ? "BG" : "EN"}
      </span>
    </button>
  );
};
