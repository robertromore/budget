import {
  WorkspaceInvitationRepository,
  WorkspaceInvitationService,
} from "$lib/server/domains/workspace-invitations";
import { WorkspaceMemberRepository } from "$lib/server/domains/workspace-members";
import { publicProcedure, t } from "$lib/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

// Create service instances
const invitationRepository = new WorkspaceInvitationRepository();
const memberRepository = new WorkspaceMemberRepository();
const invitationService = new WorkspaceInvitationService(
  invitationRepository,
  memberRepository
);

export const workspaceInvitationsRoutes = t.router({
  /**
   * List pending invitations for current workspace
   */
  list: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to view invitations",
      });
    }

    // Check if user has permission to view invitations (owner or admin)
    const membership = await memberRepository.findMembership(
      ctx.workspaceId,
      ctx.userId
    );
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only owners and admins can view workspace invitations",
      });
    }

    return await invitationService.getWorkspaceInvitations(ctx.workspaceId);
  }),

  /**
   * Create a new invitation
   */
  create: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        role: z.enum(["admin", "editor", "viewer"]),
        message: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to send invitations",
        });
      }

      try {
        return await invitationService.createInvitation(
          ctx.workspaceId,
          input.email,
          input.role,
          ctx.userId,
          input.message
        );
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("Forbidden")) {
            throw new TRPCError({ code: "FORBIDDEN", message: error.message });
          }
          if (error.message.includes("Conflict") || error.message.includes("already")) {
            throw new TRPCError({ code: "CONFLICT", message: error.message });
          }
          if (error.message.includes("Invalid")) {
            throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create invitation",
        });
      }
    }),

  /**
   * Revoke an invitation
   */
  revoke: publicProcedure
    .input(z.object({ invitationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to revoke invitations",
        });
      }

      try {
        return await invitationService.revokeInvitation(
          input.invitationId,
          ctx.userId,
          ctx.workspaceId
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
          message: "Failed to revoke invitation",
        });
      }
    }),

  /**
   * Resend an invitation
   */
  resend: publicProcedure
    .input(z.object({ invitationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to resend invitations",
        });
      }

      try {
        return await invitationService.resendInvitation(
          input.invitationId,
          ctx.userId,
          ctx.workspaceId
        );
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("Forbidden")) {
            throw new TRPCError({ code: "FORBIDDEN", message: error.message });
          }
          if (error.message.includes("not found") || error.message.includes("pending")) {
            throw new TRPCError({ code: "NOT_FOUND", message: error.message });
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to resend invitation",
        });
      }
    }),

  /**
   * Get invitation by token (public - for invitation acceptance page)
   */
  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      try {
        const invitation = await invitationService.getInvitationByToken(input.token);
        // Return limited info for public view
        return {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
          message: invitation.message,
          workspace: invitation.workspace,
          inviter: {
            displayName: invitation.inviter.displayName,
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found or has expired",
        });
      }
    }),

  /**
   * Accept an invitation
   */
  accept: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to accept an invitation",
        });
      }

      try {
        const result = await invitationService.acceptInvitation(input.token, ctx.userId);
        return {
          success: true,
          workspaceId: result.membership.workspaceId,
        };
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("Forbidden") || error.message.includes("different email")) {
            throw new TRPCError({ code: "FORBIDDEN", message: error.message });
          }
          if (error.message.includes("expired")) {
            throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
          }
          if (error.message.includes("already")) {
            throw new TRPCError({ code: "CONFLICT", message: error.message });
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to accept invitation",
        });
      }
    }),

  /**
   * Decline an invitation
   */
  decline: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      try {
        await invitationService.declineInvitation(input.token);
        return { success: true };
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("already")) {
            throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
          }
        }
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }
    }),

  /**
   * Get current user's pending invitations
   */
  myPendingInvitations: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      return [];
    }

    // Get user's email to find their invitations
    const { users } = await import("$lib/schema/users");
    const { eq } = await import("drizzle-orm");

    const [user] = await ctx.db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, ctx.userId))
      .limit(1);

    if (!user?.email) {
      return [];
    }

    return await invitationService.getUserPendingInvitations(user.email);
  }),
});
