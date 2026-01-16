import { Prisma, question_type } from "@prisma/client";
import prisma from "./prisma";

async function seed() {
  console.log("Seeding database...");

  try {
    // 1. Create a competition
    const competition = await prisma.competitions.create({
      data: {
        title: "Bible Hero Challenge",
        host_pin: "1234",
        status: "ACTIVE",
      },
    });
    const competitionId = competition.id;

    // 2. Create a round
    const round = await prisma.rounds.create({
      data: {
        competition_id: competitionId,
        order_index: 1,
        type: "STANDARD",
        title: "General Knowledge",
      },
    });
    const roundId = round.id;

    // 3. Add some questions
    const questions: {
      text: string;
      type: question_type;
      points: number;
      content: Prisma.InputJsonValue;
    }[] = [
      {
        text: "Who built the ark?",
        type: "MULTIPLE_CHOICE",
        points: 10,
        content: {
          options: ["Moses", "Noah", "Abraham", "David"],
          correct_index: 1,
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
          correct_index: 2,
        },
      },
    ];

    for (const q of questions) {
      await prisma.questions.create({
        data: {
          round_id: roundId,
          question_text: q.text,
          type: q.type,
          points: q.points,
          content: q.content,
        },
      });
    }

    // 4. Add a crossword question
    const crosswordRound = await prisma.rounds.create({
      data: {
        competition_id: competitionId,
        order_index: 2,
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
          { number: 1, clue: "Son of God", answer: "JESUS", row: 0, col: 0 },
        ],
        down: [
          {
            number: 1,
            clue: "Wrote the 4th Gospel",
            answer: "JOHN",
            row: 0,
            col: 0,
          },
        ],
      },
    };

    await prisma.questions.create({
      data: {
        round_id: crosswordRoundId,
        question_text: "Complete the Bible crossword",
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
