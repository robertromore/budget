import {
  WorkspaceMemberRepository,
  WorkspaceMemberService,
} from "$lib/server/domains/workspace-members";
import { workspaceRoleEnum } from "$lib/schema/workspace-members";
import { publicProcedure, t } from "$lib/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

// Create service instance
const memberRepository = new WorkspaceMemberRepository();
const memberService = new WorkspaceMemberService(memberRepository);

export const workspaceMembersRoutes = t.router({
  /**
   * List all members of the current workspace
   */
  list: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to view workspace members",
      });
    }

    // Verify user is a member of the workspace
    const isMember = await memberService.isMember(ctx.workspaceId, ctx.userId);
    if (!isMember) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You are not a member of this workspace",
      });
    }

    return await memberService.getWorkspaceMembers(ctx.workspaceId);
  }),

  /**
   * Get current user's workspaces
   */
  myWorkspaces: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to view your workspaces",
      });
    }

    return await memberService.getUserWorkspaces(ctx.userId);
  }),

  /**
   * Get current user's membership in the current workspace
   */
  myMembership: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      return null;
    }

    return await memberService.getMembership(ctx.workspaceId, ctx.userId);
  }),

  /**
   * Update a member's role
   */
  updateRole: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["admin", "editor", "viewer"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to update member roles",
        });
      }

      try {
        return await memberService.updateMemberRole(
          ctx.workspaceId,
          input.userId,
          input.role,
          ctx.userId
        );
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("Forbidden")) {
            throw new TRPCError({ code: "FORBIDDEN", message: error.message });
          }
          if (error.message.includes("not found")) {
            throw new TRPCError({ code: "NOT_FOUND", message: error.message });
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update member role",
        });
      }
    }),

  /**
   * Remove a member from the workspace
   */
  remove: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to remove members",
        });
      }

      try {
        await memberService.removeMember(ctx.workspaceId, input.userId, ctx.userId);
        return { success: true };
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("Forbidden")) {
            throw new TRPCError({ code: "FORBIDDEN", message: error.message });
          }
          if (error.message.includes("not found")) {
            throw new TRPCError({ code: "NOT_FOUND", message: error.message });
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove member",
        });
      }
    }),

  /**
   * Leave the current workspace
   */
  leave: publicProcedure.mutation(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to leave a workspace",
      });
    }

    try {
      await memberService.leaveWorkspace(ctx.workspaceId, ctx.userId);
      return { success: true };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("Owner cannot leave")) {
          throw new TRPCError({ code: "FORBIDDEN", message: error.message });
        }
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to leave workspace",
      });
    }
  }),

  /**
   * Transfer workspace ownership to another member
   */
  transferOwnership: publicProcedure
    .input(z.object({ newOwnerId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to transfer ownership",
        });
      }

      try {
        await memberService.transferOwnership(
          ctx.workspaceId,
          input.newOwnerId,
          ctx.userId
        );
        return { success: true };
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("Forbidden") || error.message.includes("owner")) {
            throw new TRPCError({ code: "FORBIDDEN", message: error.message });
          }
          if (error.message.includes("not found")) {
            throw new TRPCError({ code: "NOT_FOUND", message: error.message });
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to transfer ownership",
        });
      }
    }),

  /**
   * Set default workspace for current user
   */
  setDefault: publicProcedure
    .input(z.object({ workspaceId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to set default workspace",
        });
      }

      try {
        await memberService.setDefaultWorkspace(ctx.userId, input.workspaceId);
        return { success: true };
      } catch (error) {
        if (error instanceof Error && error.message.includes("not found")) {
          throw new TRPCError({ code: "NOT_FOUND", message: error.message });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to set default workspace",
        });
      }
    }),

  /**
   * Get workspace owner
   */
  getOwner: publicProcedure.query(async ({ ctx }) => {
    return await memberService.getWorkspaceOwner(ctx.workspaceId);
  }),

  /**
   * Count members in current workspace
   */
  count: publicProcedure.query(async ({ ctx }) => {
    return await memberService.countMembers(ctx.workspaceId);
  }),
});
