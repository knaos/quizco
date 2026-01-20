-- AlterEnum
ALTER TYPE "QuestionType" ADD VALUE 'TRUE_FALSE';

-- AlterEnum
ALTER TYPE "RoundType" ADD VALUE 'STREAK';

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "streak" INTEGER NOT NULL DEFAULT 0;
