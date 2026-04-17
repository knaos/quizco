import { QuestionType } from "@prisma/client";
import prisma from "../prisma";

export async function seedRound3(competitionId: string): Promise<void> {
  const round = await prisma.round.create({
    data: {
      competitionId,
      orderIndex: 3,
      type: "STANDARD",
      title: "Рунд 3: Вярно или невярно",
    },
  });

  await prisma.question.createMany({
    data: [
      {
        roundId: round.id,
        index: 0,
        realIndex: 0,
        questionText: "Исус ходеше по водата според Библията.",
        type: "TRUE_FALSE" as QuestionType,
        points: 0,
        timeLimitSeconds: 10,
        content: { isTrue: true },
      },
      {
        roundId: round.id,
        index: 1,
        realIndex: 1,
        questionText: "Ной взе в ковчега си динозаври.",
        type: "TRUE_FALSE" as QuestionType,
        points: 1,
        timeLimitSeconds: 10,
        content: { isTrue: false },
      },
      {
        roundId: round.id,
        index: 2,
        realIndex: 2,
        questionText: "Мойсей раздели Червено море с помощта на Бога.",
        type: "TRUE_FALSE" as QuestionType,
        points: 1,
        timeLimitSeconds: 10,
        content: { isTrue: true },
      },

      {
        roundId: round.id,
        index: 0,
        realIndex: 3,
        questionText: "Кой уби Голиат?",
        type: "MULTIPLE_CHOICE",
        timeLimitSeconds: 15,
        points: 0,
        content: {
          options: ["Давид", "Саул"],
          correctIndices: [0],
        },
      },
      {
        roundId: round.id,
        index: 3,
        realIndex: 4,
        questionText: "Колко дни Бог създаде света?",
        type: "MULTIPLE_CHOICE",
        timeLimitSeconds: 15,
        points: 1,
        content: {
          options: ["Шест дни", "Седем дни"],
          correctIndices: [1],
        },
      },
      {
        roundId: round.id,
        index: 4,
        realIndex: 5,
        questionText: "Коя планина Мойсей получи десетте заповеди?",
        type: "MULTIPLE_CHOICE",
        timeLimitSeconds: 15,
        points: 1,
        content: {
          options: ["Синай", "Хорив"],
          correctIndices: [0],
        },
      },

      {
        roundId: round.id,
        index: 0,
        realIndex: 6,
        questionText: "Поправи грешката в изречението",
        type: "CORRECT_THE_ERROR" as QuestionType,
        points: 0,
        content: {
          text: "Авраам построи ковчег за да спаси животните от потопа",
          words: [
            { wordIndex: 0, text: "Авраам", alternatives: ["Ной", "Мойсей"] },
            { wordIndex: 2, text: "ковчег", alternatives: ["храм", "кула"] },
            { wordIndex: 8, text: "потопа", alternatives: ["пустинята", "морето"] },
          ],
          errorWordIndex: 0,
          correctReplacement: "Ной",
        },
      },
      {
        roundId: round.id,
        index: 5,
        realIndex: 7,
        questionText: "Поправи грешката в изречението",
        type: "CORRECT_THE_ERROR" as QuestionType,
        points: 2,
        content: {
          text: "Мойсей раздели Червеното море с помощта на Илия",
          words: [
            { wordIndex: 0, text: "Мойсей", alternatives: ["Исус", "Илия"] },
            { wordIndex: 2, text: "Червеното", alternatives: ["Черното", "Галилейското"] },
            { wordIndex: 7, text: "Илия", alternatives: ["Бог", "Ангел"] },
          ],
          errorWordIndex: 7,
          correctReplacement: "Бог",
        },
      },
      {
        roundId: round.id,
        index: 6,
        realIndex: 8,
        questionText: "Поправи грешката в изречението",
        type: "CORRECT_THE_ERROR" as QuestionType,
        points: 2,
        content: {
          text: "Давид уби Голиат с помощта на своята тояга",
          words: [
            { wordIndex: 0, text: "Давид", alternatives: ["Саул", "Йонатан"] },
            { wordIndex: 2, text: "Голиат", alternatives: ["Филистимец", "Саул"] },
            { wordIndex: 7, text: "тояга", alternatives: ["лрашка", "арфа"] },
          ],
          errorWordIndex: 7,
          correctReplacement: "прашка",
        },
      },
    ],
  });
}
