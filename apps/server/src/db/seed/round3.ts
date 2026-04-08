import { Prisma, QuestionType } from "@prisma/client";
import prisma from "../prisma";

/**
 * Seeds Round 3: True or False, Multiple Choice, and Correct the Error
 */
export async function seedRound3(competitionId: string): Promise<void> {
  const round = await prisma.round.create({
    data: {
      competitionId,
      orderIndex: 3,
      type: "STANDARD",
      title: "Round 3: True or False",
    },
  });

  await prisma.question.createMany({
    data: [
      {
        roundId: round.id,
        index: 1,
        questionText:
          "Въпреки че Есей не му представи най-малкия си син, Самуил веднага помисли, че Давид е помазаникът, когото Господ е избрал.",
        type: "TRUE_FALSE" as QuestionType,
        points: 1,
        timeLimitSeconds: 10,
        content: { isTrue: false },
      },
      {
        roundId: round.id,
        index: 2,
        questionText: "Кое твърдение за Рут е вярно?",
        type: "MULTIPLE_CHOICE",
        timeLimitSeconds: 15,
        points: 1,
        content: {
          options: [
            "Тя беше от народа Моав",
            "Тя беше единствената снаха на Ноемин",
          ],
          correctIndices: [0],
        },
      },
      {
        roundId: round.id,
        index: 3,
        questionText: "Поправи грешката в изречението",
        type: "CORRECT_THE_ERROR" as QuestionType,
        points: 2,
        content: {
          text: "Пророк Илия избива 450 от пророците на Ваал при потока Кисон.",
          phrases: [
            {
              text: "Пророк Елисей",
              alternatives: ["Пророк Илия", "Цар Давид", "Пророк Йона"],
            },
            {
              text: "избива 450",
              alternatives: ["помазва 450", "изцелява 450", "избива 400"],
            },
            {
              text: "от пророците на Ваал",
              alternatives: [
                "от жреците на Ашера",
                "от синовете на Израел",
                "от войниците на Ахав",
              ],
            },
            {
              text: "при потока Кисон.",
              alternatives: [
                "на планината Кармил.",
                "в город Самария.",
                "при река Йордан.",
              ],
            },
          ],
          errorPhraseIndex: 0,
          correctReplacement: "Пророк Илия",
        },
      },
    ],
  });
}
