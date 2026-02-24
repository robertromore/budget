import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createCaller } from "../../../src/lib/trpc/router";
import { clearTestDb, setupTestDb } from "../setup/test-db";

describe("Onboarding tRPC Integration Tests", () => {
  let db: Awaited<ReturnType<typeof setupTestDb>>;
  let caller: ReturnType<typeof createCaller>;

  beforeEach(async () => {
    db = await setupTestDb();
    caller = createCaller({ db, isTest: true } as any);
  });

  afterEach(async () => {
    if (db) {
      await clearTestDb(db);
    }
  });

  test("skipWizard marks onboarding as skipped and suppresses onboarding prompt", async () => {
    const initialStatus = await caller.onboardingRoutes.getStatus();
    expect(initialStatus.wizardCompleted).toBe(false);
    expect(initialStatus.wizardSkipped).toBe(false);

    const shouldShowBefore = await caller.onboardingRoutes.shouldShowOnboarding();
    expect(shouldShowBefore).toBe(true);

    const result = await caller.onboardingRoutes.skipWizard();
    expect(result).toEqual({ success: true });

    const statusAfterSkip = await caller.onboardingRoutes.getStatus();
    expect(statusAfterSkip.wizardCompleted).toBe(false);
    expect(statusAfterSkip.wizardSkipped).toBe(true);

    const shouldShowAfter = await caller.onboardingRoutes.shouldShowOnboarding();
    expect(shouldShowAfter).toBe(false);
  });

  test("resetOnboarding clears skipped wizard state", async () => {
    await caller.onboardingRoutes.skipWizard();

    const skippedStatus = await caller.onboardingRoutes.getStatus();
    expect(skippedStatus.wizardSkipped).toBe(true);

    await caller.onboardingRoutes.resetOnboarding();

    const resetStatus = await caller.onboardingRoutes.getStatus();
    expect(resetStatus.wizardCompleted).toBe(false);
    expect(resetStatus.wizardSkipped).toBe(false);

    const shouldShowAfterReset = await caller.onboardingRoutes.shouldShowOnboarding();
    expect(shouldShowAfterReset).toBe(true);
  });
});
