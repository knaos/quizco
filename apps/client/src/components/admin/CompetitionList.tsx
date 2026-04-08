import React from "react";
import { Plus, ChevronRight, Trash2, Edit2 } from "lucide-react";
import type { Competition } from "@quizco/shared";
import { useTranslation } from "react-i18next";
import Button from "../ui/Button";
import { Card } from "../ui/Card";
import Badge from "../ui/Badge";

interface CompetitionListProps {
  competitions: Competition[];
  onSelect: (comp: Competition) => void;
  onCreate: () => void;
  onEdit: (comp: Competition) => void;
  onDelete: (id: string) => void;
}

export const CompetitionList: React.FC<CompetitionListProps> = ({
  competitions,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black text-gray-800 tracking-tight">{t("admin.competitions")}</h1>
        <Button onClick={onCreate}>
          <Plus className="mr-2 w-5 h-5" /> {t("admin.new_quiz")}
        </Button>
      </div>

      <div className="grid gap-4">
        {competitions.map((comp) => (
          <Card
            key={comp.id}
            className="p-6 flex justify-between items-center hover:shadow-md cursor-pointer group"
            onClick={() => onSelect(comp)}
          >
            <div className="flex-1 text-left">
              <h3 className="text-xl font-bold text-gray-800">{comp.title}</h3>
              <div className="flex items-center space-x-3 mt-1">
                <Badge variant={
                  comp.status === 'ACTIVE' ? 'green' : 
                  comp.status === 'COMPLETED' ? 'gray' : 'yellow'
                }>
                  {comp.status}
                </Badge>
                <span className="text-gray-400 text-sm font-bold uppercase">{t("admin.pin")}: {comp.host_pin}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(comp);
                }}
                className="p-2"
                title={t("admin.edit_settings")}
              >
                <Edit2 className="w-5 h-5 text-gray-400 hover:text-blue-600" />
              </Button>
              <Button
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(comp.id);
                }}
                className="p-2"
                title={t("admin.delete_competition")}
              >
                <Trash2 className="w-5 h-5 text-gray-400 hover:text-red-600" />
              </Button>
              <ChevronRight className="text-gray-300 group-hover:text-blue-500 transition ml-2" />
            </div>
          </Card>
        ))}
        {competitions.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            {t("admin.no_competitions")}
          </div>
        )}
      </div>
    </div>
  );
};
