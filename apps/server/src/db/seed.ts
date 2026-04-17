import "dotenv/config";
import prisma from "./prisma";
import { seedRound1 } from "./seed/round1";
import { seedRound2 } from "./seed/round2";
import { seedRound3 } from "./seed/round3";
import { seedRound4 } from "./seed/round4";

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
      },
      {
        title: "Тестово състезание",
        host_pin: "0000",
      },
    ];

    for (const competitionInfo of competitions) {
      console.log(`Creating competition: ${competitionInfo.title}`);
      const competition = await prisma.competition.create({
        data: {
          title: competitionInfo.title,
          host_pin: competitionInfo.host_pin,
          status: "ACTIVE",
        },
      });

      // Seed each round
      console.log(`Seeding rounds for competition: ${competitionInfo.title}`);
      await seedRound1(competition.id);
      await seedRound2(competition.id);
      await seedRound3(competition.id);
      await seedRound4(competition.id);
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
