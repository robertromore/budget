import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { users, workspaceMembers, workspaces } from "$lib/schema";
import { createCaller } from "../../../src/lib/trpc/router";
import { clearTestDb, setupTestDb } from "../setup/test-db";

describe("LLM settings routes", () => {
  let db: Awaited<ReturnType<typeof setupTestDb>>;
  let caller: ReturnType<typeof createCaller>;
  let workspaceId: number;

  beforeEach(async () => {
    db = await setupTestDb();

    const testUserId = `llm-settings-user-${Date.now()}`;
    await db.insert(users).values({
      id: testUserId,
      name: "LLM Settings User",
      displayName: "LLM Settings User",
      email: `${testUserId}@example.com`,
    });

    const [workspace] = await db
      .insert(workspaces)
      .values({
        displayName: "LLM Settings Workspace",
        slug: `llm-settings-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        ownerId: testUserId,
      })
      .returning();
    workspaceId = workspace.id;

    await db.insert(workspaceMembers).values({
      workspaceId,
      userId: testUserId,
      role: "owner",
      isDefault: true,
    });

    caller = createCaller({
      db: db as any,
      userId: testUserId,
      sessionId: "llm-settings-session",
      workspaceId,
      event: {} as any,
      isTest: true,
    });
  });

  afterEach(async () => {
    if (db) {
      await clearTestDb(db);
    }
  });

  test("getOllamaModels rejects non-loopback endpoints", async () => {
    const result = await caller.llmSettingsRoutes.getOllamaModels({
      endpoint: "http://example.com:11434",
    });

    expect(result.success).toBe(false);
    expect(result.models).toEqual([]);
    expect(result.error).toContain("localhost or loopback");
  });

  test("getOllamaModels rejects endpoints with credentials", async () => {
    const result = await caller.llmSettingsRoutes.getOllamaModels({
      endpoint: "http://user:pass@localhost:11434",
    });

    expect(result.success).toBe(false);
    expect(result.models).toEqual([]);
    expect(result.error).toContain("must not include credentials");
  });

  test("getOllamaModels allows loopback endpoint and normalizes origin", async () => {
    const result = await caller.llmSettingsRoutes.getOllamaModels({
      endpoint: "http://localhost:1/custom/path",
    });

    expect(result.success).toBe(false);
    expect(result.models).toEqual([]);
    expect(result.error).toContain("Cannot connect to Ollama at http://localhost:1");
  });

  test("getOllamaModels accepts IPv6 loopback endpoints", async () => {
    const result = await caller.llmSettingsRoutes.getOllamaModels({
      endpoint: "http://[::1]:1/api",
    });

    expect(result.success).toBe(false);
    expect(result.models).toEqual([]);
    expect(result.error).toContain("Cannot connect to Ollama at http://[::1]:1");
  });
});
