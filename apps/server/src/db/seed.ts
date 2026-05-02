import "dotenv/config";
import prisma from "./prisma";
import { seedRound1 } from "./seed/round1";
import { seedRound2 } from "./seed/round2";
import { seedRound3 } from "./seed/round3";
import { seedRound4 } from "./seed/round4";

const BIBLE_SOURCES = [
  "Битие 1:1",
  "Псалм 23:1",
  "Притчи 3:5",
  "Исая 40:31",
  "Матей 5:14",
  "Матей 6:33",
  "Йоан 3:16",
  "Йоан 14:6",
  "Римляни 8:28",
  "1 Коринтяни 13:4",
  "Филипяни 4:13",
  "2 Тимотей 3:16",
];

function getRandomBibleSource(): string {
  const randomIndex = Math.floor(Math.random() * BIBLE_SOURCES.length);
  return BIBLE_SOURCES[randomIndex];
}

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
        title: "Библейското състезание",
        host_pin: "1111",
        milestones: [
          { threshold: 2, icon: "star" },
          { threshold: 5, icon: "zap" },
          { threshold: 7, icon: "trophy" },
          { threshold: 9, icon: "crown" },
          { threshold: 11, icon: "target" },
        ],
      },
      {
        title: "Тестово състезание",
        host_pin: "0000",
        milestones: [
          { threshold: 30, icon: "star" },
          { threshold: 80, icon: "zap" },
          { threshold: 150, icon: "trophy" },
        ],
      },
    ];

    for (const competitionInfo of competitions) {
      console.log(`Creating competition: ${competitionInfo.title}`);
      const competition = await prisma.competition.create({
        data: {
          title: competitionInfo.title,
          host_pin: competitionInfo.host_pin,
          status: "ACTIVE",
          milestones: competitionInfo.milestones,
        },
      });

      // Seed each round
      console.log(`Seeding rounds for competition: ${competitionInfo.title}`);
      await seedRound1(competition.id);
      await seedRound2(competition.id);
      await seedRound3(competition.id);
      await seedRound4(competition.id);

      const competitionQuestions = await prisma.question.findMany({
        where: {
          round: {
            competitionId: competition.id,
          },
        },
        select: {
          id: true,
        },
      });

      await Promise.all(
        competitionQuestions.map((question) =>
          prisma.question.update({
            where: { id: question.id },
            data: { source: getRandomBibleSource() },
          }),
        ),
      );
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
