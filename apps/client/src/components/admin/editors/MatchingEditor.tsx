import React from "react";
import { Plus, Trash2 } from "lucide-react";
import type { MatchingContent, MatchingItem } from "@quizco/shared";
import { v4 as uuidv4 } from "uuid";
import Button from "../../ui/Button";
import Input from "../../ui/Input";

interface MatchingEditorProps {
  content: MatchingContent;
  onChange: (content: MatchingContent) => void;
}

export const MatchingEditor: React.FC<MatchingEditorProps> = ({
  content,
  onChange,
}) => {
  const heroes = content.heroes || [];
  const stories = content.stories || [];

  const addPair = () => {
    const heroId = uuidv4();
    const storyId = uuidv4();
    const newHero: MatchingItem = {
      id: heroId,
      text: "",
      type: "hero",
    };
    const newStory: MatchingItem = {
      id: storyId,
      text: "",
      type: "story",
      correspondsTo: heroId,
    };
    onChange({
      heroes: [...heroes, newHero],
      stories: [...stories, newStory],
    });
  };

  const removePair = (heroId: string) => {
    onChange({
      heroes: heroes.filter((h) => h.id !== heroId),
      stories: stories.filter((s) => s.correspondsTo !== heroId),
    });
  };

  const updateHero = (id: string, value: string) => {
    const updatedHeroes = heroes.map((h) =>
      h.id === id ? { ...h, text: value } : h
    );
    onChange({
      heroes: updatedHeroes,
      stories,
    });
  };

  const updateStory = (id: string, value: string) => {
    const updatedStories = stories.map((s) =>
      s.id === id ? { ...s, text: value } : s
    );
    onChange({
      heroes,
      stories: updatedStories,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 mb-2">
        <label className="text-sm font-medium text-gray-700">Hero (Left)</label>
        <label className="text-sm font-medium text-gray-700">Story (Right)</label>
      </div>
      
      {heroes.map((hero, index) => {
        const matchingStory = stories.find((s) => s.correspondsTo === hero.id);
        return (
          <div key={hero.id} className="flex items-center space-x-3">
            <Input
              type="text"
              value={hero.text}
              onChange={(e) => updateHero(hero.id, e.target.value)}
              placeholder={`Hero ${index + 1}`}
            />
            <span className="text-gray-400">↔</span>
            <Input
              type="text"
              value={matchingStory?.text || ""}
              onChange={(e) => matchingStory && updateStory(matchingStory.id, e.target.value)}
              placeholder={`Story ${index + 1}`}
            />
            <Button
              variant="ghost"
              onClick={() => removePair(hero.id)}
              className="p-2"
            >
              <Trash2 className="w-5 h-5 text-gray-400 hover:text-red-500" />
            </Button>
          </div>
        );
      })}

      <Button
        variant="ghost"
        onClick={addPair}
        className="text-blue-600 p-0 hover:bg-transparent hover:underline"
      >
        <Plus className="w-4 h-4 mr-1" /> Add Pair
      </Button>
    </div>
  );
};