import { Prisma } from "@prisma/client";
import prisma from "../prisma";

/**
 * Seeds Round 4: Bible Crossword
 * Single crossword puzzle question
 */
export async function seedRound4(competitionId: string): Promise<void> {
  const round = await prisma.round.create({
    data: {
      competitionId,
      orderIndex: 4,
      type: "CROSSWORD",
      title: "Round 4: Bible Crossword",
    },
  });

  await prisma.question.createMany({
    data: [
      {
        roundId: round.id,
        index: 1,
        realIndex: 1,
        questionText: "Попълнете кръстословицата",
        type: "CROSSWORD",
        points: 43,
        timeLimitSeconds: 120,
        content: {
          grid: [
            ["х", "р", "а", "м", " ", " ", " "],
            ["а", " ", "м", " ", " ", " ", " "],
            ["м", "о", "а", "в", " ", " ", " "],
            [" ", " ", "н", "о", "й", " ", " "],
            [" ", " ", " ", "о", " ", " ", " "],
            [" ", " ", "е", "з", "д", "р", "а"],
          ],
          clues: {
            across: [
              {
                number: 1,
                x: 0,
                y: 0,
                direction: "across",
                clue: "Това, което Давид искаше да направи за Господа, но синът му го създаде вместо него.",
                answer: "храм",
              },
              {
                number: 2,
                x: 0,
                y: 2,
                direction: "across",
                clue: "Родната земя на Рут.",
                answer: "моав",
              },
              {
                number: 5,
                x: 2,
                y: 3,
                direction: "across",
                clue: "Ковчегът на ...",
                answer: "ной",
              },
              {
                number: 6,
                x: 2,
                y: 5,
                direction: "across",
                clue: "Книжник, който поучава първите евреи, които се завръщат в Йерусалим след Вавилонски плен",
                answer: "ездра",
              },
            ],
            down: [
              {
                number: 1,
                x: 0,
                y: 0,
                direction: "down",
                clue: "Един от синовете на 5 (хоризонтално).",
                answer: "хам",
              },
              {
                number: 4,
                x: 2,
                y: 0,
                direction: "down",
                clue: "Сродникът-изкупител на Рут.",
                answer: "аман",
              },
              {
                number: 3,
                x: 3,
                y: 2,
                direction: "down",
                clue: "Героят от книгата Естир, чието име говори за това колко е неприятен",
                answer: "вооз",
              },
            ],
          },
        },
      },
    ],
  });
}
