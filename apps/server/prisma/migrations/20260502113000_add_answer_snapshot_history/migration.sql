-- CreateEnum
CREATE TYPE "AnswerSnapshotType" AS ENUM ('SUBMISSION_UPDATE', 'GRADING_UPDATE', 'SCORE_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "ActorRole" AS ENUM ('SYSTEM', 'HOST', 'ADMIN');

-- CreateTable
CREATE TABLE "AnswerSnapshot" (
    "id" UUID NOT NULL,
    "answerId" UUID NOT NULL,
    "competitionId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "roundId" UUID NOT NULL,
    "snapshotType" "AnswerSnapshotType" NOT NULL,
    "actorRole" "ActorRole" NOT NULL,
    "submittedContent" JSONB NOT NULL,
    "isCorrect" BOOLEAN,
    "scoreAwarded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnswerSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnswerSnapshot_competitionId_questionId_teamId_createdAt_idx" ON "AnswerSnapshot"("competitionId", "questionId", "teamId", "createdAt");

-- CreateIndex
CREATE INDEX "AnswerSnapshot_answerId_createdAt_idx" ON "AnswerSnapshot"("answerId", "createdAt");

-- AddForeignKey
ALTER TABLE "AnswerSnapshot" ADD CONSTRAINT "AnswerSnapshot_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "Answer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerSnapshot" ADD CONSTRAINT "AnswerSnapshot_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerSnapshot" ADD CONSTRAINT "AnswerSnapshot_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerSnapshot" ADD CONSTRAINT "AnswerSnapshot_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerSnapshot" ADD CONSTRAINT "AnswerSnapshot_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;
