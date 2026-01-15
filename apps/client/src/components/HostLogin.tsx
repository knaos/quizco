import React, { useState } from "react";
import { Lock, LogIn } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";

interface HostLoginProps {
  onLogin: (password: string) => void;
}

export const HostLogin: React.FC<HostLoginProps> = ({ onLogin }) => {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(password);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-gray-100"
      >
        <div className="flex justify-center mb-6">
          <div className="bg-purple-100 p-4 rounded-full shadow-inner">
            <Lock className="text-purple-600 w-10 h-10" />
          </div>
        </div>
        <h1 className="text-3xl font-black text-center mb-2 text-gray-800 tracking-tight">
          {t('host.access_title')}
        </h1>
        <p className="text-center text-gray-400 mb-8 font-medium">
          {t('host.enter_password_hint')}
        </p>
        <div className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 focus:border-purple-500 outline-none transition-all font-medium text-lg bg-gray-50"
            placeholder={t('host.password_placeholder')}
            autoFocus
          />
          <button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-purple-200 transform active:scale-95 flex items-center justify-center space-x-2"
          >
            <LogIn className="w-5 h-5" />
            <span>{t('host.login_button')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
