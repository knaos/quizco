import React from "react";
import { Plus, ChevronRight, Trash2, Edit2 } from "lucide-react";
import type { Competition } from "@quizco/shared";

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
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Competitions</h1>
        <button
          onClick={onCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center font-semibold transition"
        >
          <Plus className="mr-2 w-5 h-5" /> New Quiz
        </button>
      </div>

      <div className="grid gap-4">
        {competitions.map((comp) => (
          <div
            key={comp.id}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition group"
          >
            <div 
              className="flex-1 cursor-pointer"
              onClick={() => onSelect(comp)}
            >
              <h3 className="text-xl font-bold text-gray-800">{comp.title}</h3>
              <div className="flex items-center space-x-3 mt-1">
                <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${
                  comp.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 
                  comp.status === 'COMPLETED' ? 'bg-gray-100 text-gray-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {comp.status}
                </span>
                <span className="text-gray-400 text-sm">PIN: {comp.host_pin}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(comp);
                }}
                className="p-2 text-gray-400 hover:text-blue-600 transition"
                title="Edit Settings"
              >
                <Edit2 className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Are you sure you want to delete this competition?")) {
                    onDelete(comp.id);
                  }
                }}
                className="p-2 text-gray-400 hover:text-red-600 transition"
                title="Delete Competition"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <ChevronRight className="text-gray-300 group-hover:text-blue-500 transition ml-2" />
            </div>
          </div>
        ))}
        {competitions.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No competitions found. Create your first one!
          </div>
        )}
      </div>
    </div>
  );
};
