import { Prisma, QuestionType } from "@prisma/client";
import prisma from "./prisma";

async function seed() {
  console.log("Seeding database...");

  try {
    // 1. Create a competition
    const competition = await prisma.competition.create({
      data: {
        title: "Bible Hero Challenge",
        host_pin: "1234",
        status: "ACTIVE",
      },
    });
    const competitionId = competition.id;

    // 2. Create a round
    const round = await prisma.round.create({
      data: {
        competitionId: competitionId,
        orderIndex: 1,
        type: "STANDARD",
        title: "General Knowledge",
      },
    });
    const roundId = round.id;

    // 3. Add some questions
    const questions: {
      text: string;
      type: QuestionType;
      points: number;
      content: Prisma.InputJsonValue;
    }[] = [
      {
        text: "Who built the ark?",
        type: "MULTIPLE_CHOICE",
        points: 10,
        content: {
          options: ["Moses", "Noah", "Abraham", "David"],
          correctIndex: 1,
        },
      },
      {
        text: "What is the first book of the Bible?",
        type: "OPEN_WORD",
        points: 15,
        content: {
          answer: "Genesis",
        },
      },
      {
        text: "Jesus was born in which town?",
        type: "MULTIPLE_CHOICE",
        points: 10,
        content: {
          options: ["Nazareth", "Jerusalem", "Bethlehem", "Jericho"],
          correctIndex: 2,
        },
      },
    ];

    for (const q of questions) {
      await prisma.question.create({
        data: {
          roundId: roundId,
          questionText: q.text,
          type: q.type,
          points: q.points,
          content: q.content,
        },
      });
    }

    // 4. Add a crossword question
    const crosswordRound = await prisma.round.create({
      data: {
        competitionId: competitionId,
        orderIndex: 2,
        type: "CROSSWORD",
        title: "Bible Crossword",
      },
    });
    const crosswordRoundId = crosswordRound.id;

    const crosswordContent = {
      grid: [
        ["J", "E", "S", "U", "S"],
        ["O", "", "", "", ""],
        ["H", "", "", "", ""],
        ["N", "", "", "", ""],
      ],
      clues: {
        across: [
          {
            number: 1,
            clue: "Son of God",
            answer: "JESUS",
            x: 0,
            y: 0,
            direction: "across",
          },
        ],
        down: [
          {
            number: 1,
            clue: "Wrote the 4th Gospel",
            answer: "JOHN",
            x: 0,
            y: 0,
            direction: "down",
          },
        ],
      },
    };

    await prisma.question.create({
      data: {
        roundId: crosswordRoundId,
        questionText: "Complete the Bible crossword",
        type: "CROSSWORD",
        points: 50,
        content: crosswordContent,
      },
    });

    console.log("Seeding completed successfully.");
  } catch (err) {
    console.error("Error seeding database:", err);
  } finally {
    await prisma.$disconnect();
    process.exit();
  }
}

seed();
