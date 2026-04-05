import { afterEach, describe, expect, it, vi } from "vitest";
import { db, runWithDbForTesting, setDbForTesting } from "$core/server/db";
import { __testables } from "$core/trpc/router";

describe("Router test DB context helpers", () => {
  afterEach(() => {
    setDbForTesting(null);
    vi.restoreAllMocks();
  });

  it("normalizes test context by filling default auth/workspace values", () => {
    const normalized = __testables.normalizeTestContext({
      isTest: true,
      db: {},
    } as any);

    expect(normalized.userId).toBe("system-test-user");
    expect(normalized.sessionId).toBe("test-session");
    expect(normalized.workspaceId).toBe(1);
  });

  it("preserves explicit test context values", () => {
    const normalized = __testables.normalizeTestContext({
      isTest: true,
      db: {},
      userId: "explicit-user",
      sessionId: "explicit-session",
      workspaceId: 99,
    } as any);

    expect(normalized.userId).toBe("explicit-user");
    expect(normalized.sessionId).toBe("explicit-session");
    expect(normalized.workspaceId).toBe(99);
  });

  it("wraps nested callable values with test DB scope", () => {
    const fakeDb = {
      select(this: unknown, label: string) {
        return { label, boundTo: this };
      },
    } as any;

    const wrapped = __testables.wrapCallerWithTestDb(
      {
        nested: {
          run() {
            return (db as any).select("nested-call");
          },
        },
      },
      { isTest: true, db: fakeDb } as any
    ) as any;

    const result = wrapped.nested.run();
    expect(result.label).toBe("nested-call");
    expect(result.boundTo).toBe(fakeDb);
  });

  it("does not wrap when not in test mode", () => {
    const target = {
      nested: {
        run: () => "ok",
      },
    };

    const wrapped = __testables.wrapCallerWithTestDb(target, {
      isTest: false,
      db: {},
    } as any);

    expect(wrapped).toBe(target);
  });

  it("prefers explicit DB override over scoped DB", () => {
    const scopedDb = {
      select: vi.fn(() => "scoped"),
    } as any;
    const overrideDb = {
      select: vi.fn(() => "override"),
    } as any;

    setDbForTesting(overrideDb);

    const result = runWithDbForTesting(scopedDb, () => (db as any).select());
    expect(result).toBe("override");
    expect(overrideDb.select).toHaveBeenCalledTimes(1);
    expect(scopedDb.select).not.toHaveBeenCalled();
  });

  it("uses async-local scoped DB inside async boundaries", async () => {
    const scopedDb = {
      select: vi.fn(() => "scoped-async"),
    } as any;

    setDbForTesting(null);

    const result = await runWithDbForTesting(scopedDb, async () => {
      await Promise.resolve();
      return (db as any).select();
    });

    expect(result).toBe("scoped-async");
    expect(scopedDb.select).toHaveBeenCalledTimes(1);
  });
});
