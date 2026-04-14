import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

describe("Price Check Auto-Scheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("startPriceCheckScheduler is idempotent", async () => {
    // Track setTimeout/setInterval calls
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");

    // Dynamic import to get a fresh module (reset the started flag)
    // Note: vitest module caching means this may share state across tests
    // in the same file, so we test idempotency in a single test
    const { startPriceCheckScheduler } = await import(
      "$core/server/domains/price-watcher/auto-check"
    );

    const timeoutCountBefore = setTimeoutSpy.mock.calls.length;
    const intervalCountBefore = setIntervalSpy.mock.calls.length;

    // First call should set up setTimeout + setInterval
    startPriceCheckScheduler();

    const timeoutCountAfter1 = setTimeoutSpy.mock.calls.length;
    const intervalCountAfter1 = setIntervalSpy.mock.calls.length;

    expect(timeoutCountAfter1).toBeGreaterThan(timeoutCountBefore);
    expect(intervalCountAfter1).toBeGreaterThan(intervalCountBefore);

    // Second call should be a no-op
    startPriceCheckScheduler();

    const timeoutCountAfter2 = setTimeoutSpy.mock.calls.length;
    const intervalCountAfter2 = setIntervalSpy.mock.calls.length;

    expect(timeoutCountAfter2).toBe(timeoutCountAfter1);
    expect(intervalCountAfter2).toBe(intervalCountAfter1);

    // Third call — still a no-op
    startPriceCheckScheduler();

    expect(setTimeoutSpy.mock.calls.length).toBe(timeoutCountAfter1);
    expect(setIntervalSpy.mock.calls.length).toBe(intervalCountAfter1);
  });
});
