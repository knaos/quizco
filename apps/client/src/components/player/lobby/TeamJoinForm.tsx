import React from "react";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "../../ui/Card";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import { LanguageSwitcher } from "../../LanguageSwitcher";

interface TeamJoinFormProps {
  teamName: string;
  setTeamName: (name: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  error?: string;
}

export const TeamJoinForm: React.FC<TeamJoinFormProps> = ({
  teamName,
  setTeamName,
  onSubmit,
  onBack,
  error,
}) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-blue-600 flex items-center justify-center p-4 relative">
      <div className="absolute top-4 left-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-white/80 hover:text-white flex items-center font-bold p-0 hover:bg-transparent"
        >
          <ChevronRight className="w-5 h-5 rotate-180 mr-1" />{" "}
          {t("common.back") || "Back"}
        </Button>
      </div>
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Card className="p-8 shadow-xl w-full max-w-md border-none">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          {t("player.join_title")}
        </h1>
        <form
          onSubmit={onSubmit}
          className="space-y-4 text-left"
          data-testid="join-team-form"
        >
          <Input
            label={t("player.team_name")}
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder={t("player.team_name")}
            data-testid="team-name-input"
            required
            error={error}
          />
          <Button
            type="submit"
            size="xl"
            className="w-full"
            data-testid="join-team-submit"
          >
            {t("player.lets_go")}
          </Button>
        </form>
      </Card>
    </div>
  );
};
