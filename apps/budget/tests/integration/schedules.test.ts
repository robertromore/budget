import {describe, it, expect, beforeEach} from "vitest";
import {createTestContext, seedTestData, clearTestDb} from "./setup/test-db";
import {createCaller} from "../../src/lib/trpc/router";

describe("Schedule Creation with Repeating Dates", () => {
  let ctx: Awaited<ReturnType<typeof createTestContext>>;
  let caller: ReturnType<typeof createCaller>;
  let testData: Awaited<ReturnType<typeof seedTestData>>;

  beforeEach(async () => {
    ctx = await createTestContext();
    caller = createCaller(ctx);
    await clearTestDb(ctx.db);
    testData = await seedTestData(ctx.db);
  });

  it("should create a schedule with repeating date", async () => {
    // Sample repeating date JSON from the form
    const repeatingDateJson = JSON.stringify({
      start: {
        calendar: {identifier: "gregory"},
        era: "AD",
        year: 2025,
        month: 9,
        day: 19
      },
      end: null,
      frequency: "monthly",
      interval: 1,
      limit: 0,
      move_weekends: "none",
      move_holidays: "none",
      specific_dates: [],
      on: false,
      on_type: "day"
    });

    const scheduleData = {
      name: "Test Monthly Rent",
      slug: undefined, // Should be auto-generated
      status: "active" as const,
      amount: 1200,
      amount_2: 0,
      amount_type: "exact" as const,
      recurring: false,
      auto_add: false,
      dateId: null,
      payeeId: 1,
      accountId: testData.accounts[0].id,
      repeating_date: repeatingDateJson
    };

    console.log("Creating schedule with data:", scheduleData);

    // This should work without throwing errors
    const result = await caller.scheduleRoutes.save(scheduleData);

    console.log("Schedule creation result:", result);

    // Verify the schedule was created
    expect(result).toBeDefined();
    expect(result.name).toBe("Test Monthly Rent");
    expect(result.slug).toBeDefined();
    expect(result.amount).toBe(1200);

    // If repeating date was processed correctly, dateId should be set
    if (scheduleData.repeating_date) {
      expect(result.dateId).toBeDefined();
      expect(result.dateId).toBeGreaterThan(0);
    }

    // Verify the schedule date record was created
    const scheduleWithDate = await caller.scheduleRoutes.load({id: result.id});
    expect(scheduleWithDate).toBeDefined();

    console.log("Schedule with date lookup:", scheduleWithDate);
  });

  it("should handle invalid repeating date JSON gracefully", async () => {
    const scheduleData = {
      name: "Test Schedule Bad JSON",
      status: "active" as const,
      amount: 500,
      amount_2: 0,
      amount_type: "exact" as const,
      recurring: false,
      auto_add: false,
      dateId: null,
      payeeId: 1,
      accountId: testData.accounts[0].id,
      repeating_date: "invalid json string"
    };

    // This should still create the schedule but without dateId
    const result = await caller.scheduleRoutes.save(scheduleData);

    expect(result).toBeDefined();
    expect(result.name).toBe("Test Schedule Bad JSON");
    expect(result.dateId).toBeNull(); // Should be null due to JSON parse error
  });

  it("should create schedule without repeating date", async () => {
    const scheduleData = {
      name: "Test One-time Schedule",
      status: "active" as const,
      amount: 100,
      amount_2: 0,
      amount_type: "exact" as const,
      recurring: false,
      auto_add: false,
      dateId: null,
      payeeId: 1,
      accountId: testData.accounts[0].id,
      // No repeating_date field
    };

    const result = await caller.scheduleRoutes.save(scheduleData);

    expect(result).toBeDefined();
    expect(result.name).toBe("Test One-time Schedule");
    expect(result.dateId).toBeNull(); // Should be null since no repeating date
  });
});