import { beforeEach } from "vitest";
import prisma from "../db/prisma";

beforeEach(async () => {
  // Clear all data before each test
  // We use raw query for TRUNCATE CASCADE as it's the most efficient way to clear everything
  await prisma.$executeRawUnsafe(
    "TRUNCATE teams, competitions, rounds, questions, answers CASCADE"
  );
});
