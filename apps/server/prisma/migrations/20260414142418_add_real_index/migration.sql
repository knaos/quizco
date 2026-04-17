-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "realIndex" INTEGER;

WITH ranked_questions AS (
  SELECT
    "id",
    COALESCE(
      "index",
      ROW_NUMBER() OVER (
        PARTITION BY "roundId"
        ORDER BY "createdAt" ASC, "id" ASC
      ) - 1
    ) AS "backfilledRealIndex"
  FROM "Question"
)
UPDATE "Question" AS question
SET "realIndex" = ranked_questions."backfilledRealIndex"
FROM ranked_questions
WHERE question."id" = ranked_questions."id";
