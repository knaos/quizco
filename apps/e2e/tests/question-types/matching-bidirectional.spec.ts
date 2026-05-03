import { test, expect } from "@playwright/test";
import {
  clickHostNextAndExpectPhase,
  createAdminApi,
  createCompetitionWithQuestions,
  createHostAndPlayers,
  deleteCompetition,
  moveToQuestionPreview,
} from "../helpers/gameHarness";

test("MATCHING supports right-to-left connection flow", async ({ browser }) => {
  const adminApi = await createAdminApi();
  let competitionId = "";
  let session: Awaited<ReturnType<typeof createHostAndPlayers>> | null = null;

  try {
    const fixture = await createCompetitionWithQuestions(
      adminApi,
      "E2E Matching Bidirectional",
      [
        {
          questionText: "Match the items",
          type: "MATCHING",
          content: {
            heroes: [
              { id: "m1", text: "Apple", type: "hero" },
              { id: "m2", text: "Carrot", type: "hero" },
            ],
            stories: [
              { id: "s1", text: "Fruit", type: "story", correspondsTo: "m1" },
              { id: "s2", text: "Vegetable", type: "story", correspondsTo: "m2" },
            ],
          },
        },
      ],
    );
    competitionId = fixture.competitionId;

    session = await createHostAndPlayers(browser, competitionId, "Team One", "Team Two");

    // Move to QUESTION_PREVIEW
    await moveToQuestionPreview(session.hostPage);

    // Move to QUESTION_ACTIVE
    await clickHostNextAndExpectPhase(session.hostPage, "QUESTION_ACTIVE");
    await expect(session.playerOnePage.getByTestId("player-phase")).toHaveText("QUESTION_ACTIVE");

    // Test right-to-left flow: Click right item first, then left item
    // Click "Fruit" on the right side first
    await session.playerOnePage.getByTestId("matching-right-0").click();
    
    // Verify right item is now selected (visual feedback - should have different style)
    const rightItem0 = session.playerOnePage.getByTestId("matching-right-0");
    await expect(rightItem0).toHaveClass(/bg-blue-600|border-blue-400/);

    // Now click the left item "Carrot" to complete the connection (reversed)
    await session.playerOnePage.getByTestId("matching-left-m2").click();

    // Verify connection was created (should show arrow between Carrot and Vegetable)
    // The left item should now show matched state
    const leftItem2 = session.playerOnePage.getByTestId("matching-left-m2");
    await expect(leftItem2).toHaveClass(/bg-blue-50|border-blue-200/);

    // Test clearing selection by clicking right item again (deselect)
    await session.playerOnePage.getByTestId("matching-right-1").click();
    
    // Right item 1 should now be selected (Vegetable) - first click selects
    const rightItem1 = session.playerOnePage.getByTestId("matching-right-1");
    await expect(rightItem1).toHaveClass(/bg-blue-600|border-blue-400/);

    // Click again to deselect (right-side toggle off)
    await rightItem1.click();
    await expect(rightItem1).not.toHaveClass(/bg-blue-600|border-blue-400/);

    // Click a third time to reselect before creating the match
    await rightItem1.click();
    await expect(rightItem1).toHaveClass(/bg-blue-600|border-blue-400/);

    // Connect to Apple (left item m1)
    await session.playerOnePage.getByTestId("matching-left-m1").click();

    // Verify both connections are now made
    const leftItem1 = session.playerOnePage.getByTestId("matching-left-m1");
    await expect(leftItem1).toHaveClass(/bg-blue-50|border-blue-200/);

    // Submit the answer - just verify button is clickable and doesn't throw error
    await session.playerOnePage.getByTestId("player-submit-answer").click();
    
    // Verify no error toast appeared
    await expect(session.playerOnePage.locator(".toast-error, [data-testid*='error']")).toHaveCount(0);
  } finally {
    if (competitionId) {
      await deleteCompetition(adminApi, competitionId);
    }
    if (session) {
      await session.close();
    }
    await adminApi.dispose();
  }
});

test("MATCHING supports bidirectional mixed flow (both directions in same question)", async ({ browser }) => {
  const adminApi = await createAdminApi();
  let competitionId = "";
  let session: Awaited<ReturnType<typeof createHostAndPlayers>> | null = null;

  try {
    const fixture = await createCompetitionWithQuestions(
      adminApi,
      "E2E Matching Mixed Bidirectional",
      [
        {
          questionText: "Match the items",
          type: "MATCHING",
          content: {
            heroes: [
              { id: "m1", text: "Apple", type: "hero" },
              { id: "m2", text: "Carrot", type: "hero" },
              { id: "m3", text: "Bread", type: "hero" },
            ],
            stories: [
              { id: "s1", text: "Fruit", type: "story", correspondsTo: "m1" },
              { id: "s2", text: "Vegetable", type: "story", correspondsTo: "m2" },
              { id: "s3", text: "Grain", type: "story", correspondsTo: "m3" },
            ],
          },
        },
      ],
    );
    competitionId = fixture.competitionId;

    session = await createHostAndPlayers(browser, competitionId, "Team One", "Team Two");

    // Move to QUESTION_ACTIVE
    await moveToQuestionPreview(session.hostPage);
    await clickHostNextAndExpectPhase(session.hostPage, "QUESTION_ACTIVE");
    await expect(session.playerOnePage.getByTestId("player-phase")).toHaveText("QUESTION_ACTIVE");

    // First connection: left-to-right (Apple -> Fruit)
    await session.playerOnePage.getByTestId("matching-left-m1").click();
    await session.playerOnePage.getByTestId("matching-right-0").click();

    // Second connection: right-to-left (Vegetable <- Carrot)
    await session.playerOnePage.getByTestId("matching-right-1").click();
    await session.playerOnePage.getByTestId("matching-left-m2").click();

    // Third connection: left-to-right (Bread -> Grain)
    await session.playerOnePage.getByTestId("matching-left-m3").click();
    await session.playerOnePage.getByTestId("matching-right-2").click();

    // Verify all three are matched
    await expect(session.playerOnePage.getByTestId("matching-left-m1")).toHaveClass(/bg-blue-50/);
    await expect(session.playerOnePage.getByTestId("matching-left-m2")).toHaveClass(/bg-blue-50/);
    await expect(session.playerOnePage.getByTestId("matching-left-m3")).toHaveClass(/bg-blue-50/);

    // Submit and verify no errors
    await session.playerOnePage.getByTestId("player-submit-answer").click();
    await expect(session.playerOnePage.locator(".toast-error, [data-testid*='error']")).toHaveCount(0);
  } finally {
    if (competitionId) {
      await deleteCompetition(adminApi, competitionId);
    }
    if (session) {
      await session.close();
    }
    await adminApi.dispose();
  }
});
