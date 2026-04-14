import { Prisma } from "@prisma/client";
import prisma from "../prisma";

/**
 * Seeds Round 1: Individual Game questions
 * 36 questions across 4 sections (3 question types × 3 questions × 4 sections)
 * Question types: FILL_IN_THE_BLANKS, MATCHING, MULTIPLE_CHOICE
 */
export async function seedRound1(competitionId: string): Promise<void> {
  const round = await prisma.round.create({
    data: {
      competitionId,
      orderIndex: 1,
      type: "STANDARD",
      title: "Round 1: Individual game",
    },
  });

  const questions: Prisma.QuestionCreateManyInput[] = [];

  // ==========================================
  // Section 1
  // ==========================================
  questions.push(
    // FILL_IN_THE_BLANKS Questions (3 per section)
    {
      roundId: round.id,
      section: "1",
      index: 0,
      realIndex: 0,
      questionText: "Разказ за Данаил и приятелите му",
      type: "FILL_IN_THE_BLANKS",
      timeLimitSeconds: 20,
      points: 0,
      content: {
        text: "Докато Данаил и приятелите му се обучават в(ъв) {0} империя, те отказват да ядат от изрядните ястия на царя и ядат само {1} и пият {2}.",
        blanks: [
          {
            options: [
              { value: "Вавилонската", isCorrect: true },
              { value: "Персийската", isCorrect: false },
              { value: "Римската", isCorrect: false },
              { value: "Османската", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "зеленчуци", isCorrect: true },
              { value: "агнешко", isCorrect: false },
              { value: "жито", isCorrect: false },
              { value: "мед", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "вода", isCorrect: true },
              { value: "вино", isCorrect: false },
              { value: "оцет", isCorrect: false },
              { value: "миро", isCorrect: false },
            ],
          },
        ],
      },
    },
    {
      roundId: round.id,
      section: "1",
      index: 0,
      realIndex: 1,
      questionText: "Свържи героя към историята му",
      type: "MATCHING",
      timeLimitSeconds: 25,
      points: 0,
      content: {
        pairs: [
          { id: "m1_s1_q1", left: "Исус", right: "възкресява дъщерята на Яир, началника на синагогата." },
          { id: "m1_s1_q2", left: "Апостол Павел", right: "възкресява момче на име Евтих, което пада от прозореца." },
          { id: "m1_s1_q3", left: "Пророк Илия", right: "възкресява синът на вдовицата в Сарепта Сидонска." },
        ],
      },
    },
    {
      roundId: round.id,
      section: "1",
      index: 0,
      realIndex: 2,
      questionText: "Какво прави пророк Йона, след като рибата го изплюва?",
      type: "MULTIPLE_CHOICE",
      timeLimitSeconds: 15,
      points: 0,
      content: {
        options: [
          "Отива да пророкува в град Ниневия",
          "Отива да пророкува в город Тир",
          "Бяга от Бога в пустинята",
          "Бяга от Бога, като се качва на лодка",
        ],
        correctIndices: [0],
      },
    },
  );

  await prisma.question.createMany({ data: questions });
}