import React, { useEffect, useState } from "react";
import { Lock, LogIn } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";
import Button from "./ui/Button";
import Input from "./ui/Input";
import { Card } from "./ui/Card";

interface HostLoginProps {
  onLogin: (password: string) => void;
}

export const HostLogin: React.FC<HostLoginProps> = ({ onLogin }) => {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");

  useEffect(() => {
    document.title = "Host login"
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(password);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Card
        className="p-8 w-full max-w-md border-none shadow-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
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
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('host.password_placeholder')}
              autoFocus
            />
            <Button
              type="submit"
              variant="purple"
              className="w-full py-4 text-lg"
            >
              <LogIn className="w-5 h-5 mr-2" />
              <span>{t('host.login_button')}</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
