import { Prisma, QuestionType } from "@prisma/client";
import "dotenv/config";
import prisma from "./prisma";

async function seed() {
  console.log("Seeding database...");

  try {
    // 0. Cleanup
    console.log("Cleaning up old data...");
    await prisma.answer.deleteMany({});
    await prisma.question.deleteMany({});
    await prisma.round.deleteMany({});
    await prisma.team.deleteMany({});
    await prisma.competition.deleteMany({});

    const competitions = [
      {
        title: "The Bible Competition",
        host_pin: "1111",
      },
      {
        title: "Test Competition",
        host_pin: "0000",
      },
    ];

    for (const compInfo of competitions) {
      console.log(`Creating competition: ${compInfo.title}`);
      const competition = await prisma.competition.create({
        data: {
          title: compInfo.title,
          host_pin: compInfo.host_pin,
          status: "ACTIVE",
        },
      });

      // Round 1: MCQ (Single Select)
      const r1 = await prisma.round.create({
        data: {
          competitionId: competition.id,
          orderIndex: 1,
          type: "STANDARD",
          title: "Round 1: MCQ (Single Select)",
        },
      });

      await prisma.question.createMany({
        data: [
          {
            roundId: r1.id,
            questionText: "Who built the ark?",
            type: "MULTIPLE_CHOICE",
            points: 10,
            content: {
              options: ["Moses", "Noah", "Abraham", "David"],
              correctIndices: [1],
            },
          },
          {
            roundId: r1.id,
            questionText: "What is the shortest verse in the Bible?",
            type: "MULTIPLE_CHOICE",
            points: 10,
            content: {
              options: ["Genesis 1:1", "John 11:35", "Psalm 23:1", "John 3:16"],
              correctIndices: [1],
            },
          },
        ],
      });

      // Round 2: Multi-Select
      const r2 = await prisma.round.create({
        data: {
          competitionId: competition.id,
          orderIndex: 2,
          type: "STANDARD",
          title: "Round 2: Multi-Select",
        },
      });

      await prisma.question.createMany({
        data: [
          {
            roundId: r2.id,
            questionText: "Which of these are among the 12 apostles?",
            type: "MULTIPLE_CHOICE",
            points: 20,
            content: {
              options: ["Peter", "Paul", "Andrew", "Luke"],
              correctIndices: [0, 2],
            },
          },
          {
            roundId: r2.id,
            questionText: "Which of these are books of the Pentateuch?",
            type: "MULTIPLE_CHOICE",
            points: 20,
            content: {
              options: ["Genesis", "Exodus", "Isaiah", "Numbers"],
              correctIndices: [0, 1, 3],
            },
          },
        ],
      });

      // Round 3: Open Word
      const r3 = await prisma.round.create({
        data: {
          competitionId: competition.id,
          orderIndex: 3,
          type: "STANDARD",
          title: "Round 3: Open Word",
        },
      });

      await prisma.question.createMany({
        data: [
          {
            roundId: r3.id,
            questionText: "What is the first book of the Bible?",
            type: "OPEN_WORD",
            points: 15,
            content: {
              answer: "Genesis",
            },
          },
          {
            roundId: r3.id,
            questionText: "Who was the first man created?",
            type: "OPEN_WORD",
            points: 15,
            content: {
              answer: "Adam",
            },
          },
        ],
      });
    }

    console.log("Seeding completed successfully.");
  } catch (err) {
    console.error("Error seeding database:", err);
  } finally {
    await prisma.$disconnect();
    process.exit();
  }
}

seed();
