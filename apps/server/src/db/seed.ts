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

      // New Round: Fill in the Blanks & Matching
      const rSpecial = await prisma.round.create({
        data: {
          competitionId: competition.id,
          orderIndex: 3,
          type: "STANDARD",
          title: "Special Question Types",
        },
      });

      await prisma.question.createMany({
        data: [
          {
            roundId: rSpecial.id,
            questionText: "Complete the Beatitude",
            type: "FILL_IN_THE_BLANKS",
            points: 15,
            content: {
              text: "Blessed are the {0}, for they shall inherit the {1}.",
              blanks: [
                {
                  options: [
                    { value: "meek", isCorrect: true },
                    { value: "strong", isCorrect: false },
                  ],
                },
                {
                  options: [
                    { value: "earth", isCorrect: true },
                    { value: "sky", isCorrect: false },
                  ],
                },
              ],
            },
            section: "Player 1",
          },
          {
            roundId: rSpecial.id,
            questionText: "Fill in the missing words",
            type: "FILL_IN_THE_BLANKS",
            points: 15,
            content: {
              text: "In the {0} was the {1}, and the Word was with God.",
              blanks: [
                {
                  options: [
                    { value: "beginning", isCorrect: true },
                    { value: "end", isCorrect: false },
                  ],
                },
                {
                  options: [
                    { value: "Word", isCorrect: true },
                    { value: "Son", isCorrect: false },
                  ],
                },
              ],
            },
            section: "Player 2",
          },
          {
            roundId: rSpecial.id,
            questionText: "Match the Son to the Father",
            type: "MATCHING",
            points: 20,
            content: {
              pairs: [
                { id: "p1", left: "Isaac", right: "Abraham" },
                { id: "p2", left: "Solomon", right: "David" },
                { id: "p3", left: "Joseph", right: "Jacob" },
              ],
            },
            section: "Player 3",
          },
        ],
      });

      // Round 3 (now Round 4): Open Word
      const r3 = await prisma.round.create({
        data: {
          competitionId: competition.id,
          orderIndex: 4,
          type: "STANDARD",
          title: "Round 4: Open Word",
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
          {
            roundId: r3.id,
            questionText:
              "Order these events in the life of Joseph chronologically:",
            type: "CHRONOLOGY",
            points: 10,
            timeLimitSeconds: 45,
            content: {
              items: [
                { id: "j1", text: "Given a coat of many colors", order: 0 },
                {
                  id: "j2",
                  text: "Sold into slavery by his brothers",
                  order: 1,
                },
                {
                  id: "j3",
                  text: "Becomes second in command in Egypt",
                  order: 2,
                },
                { id: "j4", text: "Reunited with his family", order: 3 },
              ],
            },
            grading: "AUTO",
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
