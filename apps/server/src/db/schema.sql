-- CreateEnum
CREATE TYPE "CompetitionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "GradingMode" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('CLOSED', 'MULTIPLE_CHOICE', 'OPEN_WORD', 'CROSSWORD');

-- CreateEnum
CREATE TYPE "RoundType" AS ENUM ('STANDARD', 'CROSSWORD', 'SPEED_RUN');

-- CreateTable
CREATE TABLE "Competition" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "host_pin" VARCHAR(50) NOT NULL,
    "status" "CompetitionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" UUID NOT NULL,
    "competitionId" UUID NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "type" "RoundType" NOT NULL,
    "title" VARCHAR(255),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" UUID NOT NULL,
    "roundId" UUID NOT NULL,
    "questionText" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 10,
    "timeLimitSeconds" INTEGER NOT NULL DEFAULT 30,
    "content" JSONB NOT NULL,
    "grading" "GradingMode" NOT NULL DEFAULT 'AUTO',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" UUID NOT NULL,
    "competitionId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "color" VARCHAR(50),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "roundId" UUID NOT NULL,
    "submittedContent" JSONB NOT NULL,
    "isCorrect" BOOLEAN,
    "scoreAwarded" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Question_content_idx" ON "Question" USING GIN ("content");

-- CreateIndex
CREATE UNIQUE INDEX "Team_competitionId_name_key" ON "Team"("competitionId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Answer_teamId_questionId_key" ON "Answer"("teamId", "questionId");

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;
