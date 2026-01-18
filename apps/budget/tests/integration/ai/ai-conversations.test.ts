/**
 * AI Conversations - Integration Tests
 *
 * Tests the AI chat conversation system.
 * Includes conversations and messages with context tracking.
 */

import {describe, it, expect, beforeEach} from "vitest";
import {setupTestDb} from "../setup/test-db";
import * as schema from "../../../src/lib/schema";
import {eq, and, isNull, desc} from "drizzle-orm";
import type {BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";

type TestDb = BunSQLiteDatabase<typeof schema>;

interface TestContext {
  db: TestDb;
  workspaceId: number;
}

async function setupTestContext(): Promise<TestContext> {
  const db = await setupTestDb();

  const [workspace] = await db
    .insert(schema.workspaces)
    .values({
      displayName: "Test Workspace",
      slug: "test-workspace",
    })
    .returning();

  return {
    db,
    workspaceId: workspace.id,
  };
}

describe("AI Conversations", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("conversation creation", () => {
    it("should create a conversation", async () => {
      const [conversation] = await ctx.db
        .insert(schema.aiConversations)
        .values({
          workspaceId: ctx.workspaceId,
          title: "Budget Planning Help",
        })
        .returning();

      expect(conversation).toBeDefined();
      expect(conversation.workspaceId).toBe(ctx.workspaceId);
      expect(conversation.title).toBe("Budget Planning Help");
      expect(conversation.messageCount).toBe(0);
    });

    it("should create conversation with context", async () => {
      const context = {
        page: "/budgets",
        entityType: "budget" as const,
        entityId: 123,
        data: {budgetName: "Monthly Budget"},
      };

      const [conversation] = await ctx.db
        .insert(schema.aiConversations)
        .values({
          workspaceId: ctx.workspaceId,
          title: "Budget Questions",
          context,
        })
        .returning();

      expect(conversation.context).toEqual(context);
    });

    it("should allow null title and summary", async () => {
      const [conversation] = await ctx.db
        .insert(schema.aiConversations)
        .values({
          workspaceId: ctx.workspaceId,
        })
        .returning();

      expect(conversation.title).toBeNull();
      expect(conversation.summary).toBeNull();
    });
  });

  describe("conversation messages", () => {
    let conversationId: number;

    beforeEach(async () => {
      const [conversation] = await ctx.db
        .insert(schema.aiConversations)
        .values({
          workspaceId: ctx.workspaceId,
          title: "Test Conversation",
        })
        .returning();
      conversationId = conversation.id;
    });

    it("should create user message", async () => {
      const [message] = await ctx.db
        .insert(schema.aiConversationMessages)
        .values({
          conversationId,
          role: "user",
          content: "How do I create a budget?",
        })
        .returning();

      expect(message).toBeDefined();
      expect(message.role).toBe("user");
      expect(message.content).toBe("How do I create a budget?");
    });

    it("should create assistant message with reasoning", async () => {
      const [message] = await ctx.db
        .insert(schema.aiConversationMessages)
        .values({
          conversationId,
          role: "assistant",
          content: "To create a budget, go to the Budgets page and click 'New Budget'.",
          reasoning: "User is asking about budget creation. Providing step-by-step guidance.",
        })
        .returning();

      expect(message.role).toBe("assistant");
      expect(message.reasoning).toBe("User is asking about budget creation. Providing step-by-step guidance.");
    });

    it("should track tools used by assistant", async () => {
      const toolsUsed = ["budgetLookup", "categoryList"];

      const [message] = await ctx.db
        .insert(schema.aiConversationMessages)
        .values({
          conversationId,
          role: "assistant",
          content: "Here are your current budgets and categories.",
          toolsUsed,
        })
        .returning();

      expect(message.toolsUsed).toEqual(toolsUsed);
    });

    it("should support all role types", async () => {
      const roles = ["user", "assistant", "system"] as const;

      for (const role of roles) {
        const [message] = await ctx.db
          .insert(schema.aiConversationMessages)
          .values({
            conversationId,
            role,
            content: `${role} message`,
          })
          .returning();

        expect(message.role).toBe(role);
      }
    });
  });

  describe("conversation updates", () => {
    it("should update message count", async () => {
      const [conversation] = await ctx.db
        .insert(schema.aiConversations)
        .values({
          workspaceId: ctx.workspaceId,
          messageCount: 0,
        })
        .returning();

      // Add messages
      await ctx.db.insert(schema.aiConversationMessages).values([
        {conversationId: conversation.id, role: "user", content: "Hello"},
        {conversationId: conversation.id, role: "assistant", content: "Hi there!"},
      ]);

      // Update message count
      await ctx.db
        .update(schema.aiConversations)
        .set({messageCount: 2})
        .where(eq(schema.aiConversations.id, conversation.id));

      const [updated] = await ctx.db
        .select()
        .from(schema.aiConversations)
        .where(eq(schema.aiConversations.id, conversation.id));

      expect(updated.messageCount).toBe(2);
    });

    it("should update summary", async () => {
      const [conversation] = await ctx.db
        .insert(schema.aiConversations)
        .values({
          workspaceId: ctx.workspaceId,
          title: "Budget Help",
        })
        .returning();

      await ctx.db
        .update(schema.aiConversations)
        .set({summary: "Discussion about creating and managing budgets"})
        .where(eq(schema.aiConversations.id, conversation.id));

      const [updated] = await ctx.db
        .select()
        .from(schema.aiConversations)
        .where(eq(schema.aiConversations.id, conversation.id));

      expect(updated.summary).toBe("Discussion about creating and managing budgets");
    });
  });

  describe("soft delete", () => {
    it("should soft delete conversation", async () => {
      const [conversation] = await ctx.db
        .insert(schema.aiConversations)
        .values({
          workspaceId: ctx.workspaceId,
          title: "To Delete",
        })
        .returning();

      await ctx.db
        .update(schema.aiConversations)
        .set({deletedAt: new Date().toISOString()})
        .where(eq(schema.aiConversations.id, conversation.id));

      const activeConvos = await ctx.db
        .select()
        .from(schema.aiConversations)
        .where(
          and(
            eq(schema.aiConversations.id, conversation.id),
            isNull(schema.aiConversations.deletedAt)
          )
        );

      expect(activeConvos).toHaveLength(0);
    });
  });

  describe("conversation queries", () => {
    beforeEach(async () => {
      // Create multiple conversations
      const convos = await ctx.db
        .insert(schema.aiConversations)
        .values([
          {workspaceId: ctx.workspaceId, title: "Budget Help", messageCount: 5},
          {workspaceId: ctx.workspaceId, title: "Category Questions", messageCount: 3},
          {workspaceId: ctx.workspaceId, title: "Import Assistance", messageCount: 10},
        ])
        .returning();

      // Add messages to first conversation
      await ctx.db.insert(schema.aiConversationMessages).values([
        {conversationId: convos[0].id, role: "user", content: "Question 1"},
        {conversationId: convos[0].id, role: "assistant", content: "Answer 1"},
      ]);
    });

    it("should find all active conversations", async () => {
      const conversations = await ctx.db
        .select()
        .from(schema.aiConversations)
        .where(
          and(
            eq(schema.aiConversations.workspaceId, ctx.workspaceId),
            isNull(schema.aiConversations.deletedAt)
          )
        );

      expect(conversations).toHaveLength(3);
    });

    it("should order by updated time", async () => {
      const conversations = await ctx.db
        .select()
        .from(schema.aiConversations)
        .where(eq(schema.aiConversations.workspaceId, ctx.workspaceId))
        .orderBy(desc(schema.aiConversations.updatedAt));

      expect(conversations.length).toBe(3);
    });

    it("should get messages for conversation", async () => {
      const [conversation] = await ctx.db
        .select()
        .from(schema.aiConversations)
        .where(eq(schema.aiConversations.title, "Budget Help"));

      const messages = await ctx.db
        .select()
        .from(schema.aiConversationMessages)
        .where(eq(schema.aiConversationMessages.conversationId, conversation.id));

      expect(messages).toHaveLength(2);
    });
  });

  describe("workspace isolation", () => {
    it("should isolate conversations between workspaces", async () => {
      const [workspace2] = await ctx.db
        .insert(schema.workspaces)
        .values({
          displayName: "Second Workspace",
          slug: "second-workspace",
        })
        .returning();

      await ctx.db.insert(schema.aiConversations).values([
        {workspaceId: ctx.workspaceId, title: "WS1 Convo"},
        {workspaceId: workspace2.id, title: "WS2 Convo"},
      ]);

      const ws1Convos = await ctx.db
        .select()
        .from(schema.aiConversations)
        .where(eq(schema.aiConversations.workspaceId, ctx.workspaceId));

      const ws2Convos = await ctx.db
        .select()
        .from(schema.aiConversations)
        .where(eq(schema.aiConversations.workspaceId, workspace2.id));

      expect(ws1Convos).toHaveLength(1);
      expect(ws2Convos).toHaveLength(1);
    });
  });

  describe("relationships", () => {
    it("should join messages with conversation", async () => {
      const [conversation] = await ctx.db
        .insert(schema.aiConversations)
        .values({
          workspaceId: ctx.workspaceId,
          title: "Join Test",
        })
        .returning();

      await ctx.db.insert(schema.aiConversationMessages).values({
        conversationId: conversation.id,
        role: "user",
        content: "Test message",
      });

      const results = await ctx.db
        .select({
          message: schema.aiConversationMessages,
          conversationTitle: schema.aiConversations.title,
        })
        .from(schema.aiConversationMessages)
        .innerJoin(
          schema.aiConversations,
          eq(schema.aiConversationMessages.conversationId, schema.aiConversations.id)
        )
        .where(eq(schema.aiConversations.id, conversation.id));

      expect(results).toHaveLength(1);
      expect(results[0].conversationTitle).toBe("Join Test");
      expect(results[0].message.content).toBe("Test message");
    });
  });
});
