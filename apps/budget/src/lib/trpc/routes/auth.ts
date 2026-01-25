import { AuthService } from "$lib/server/domains/auth";
import { sendEmail } from "$lib/server/email";
import { passwordResetEmail } from "$lib/server/email/templates";
import { protectedProcedure, publicProcedure, secureProtectedProcedure, t } from "$lib/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

const authService = new AuthService();

export const authRoutes = t.router({
  /**
   * Get current authenticated user
   */
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      return null;
    }

    const user = await authService.getUserById(ctx.userId);
    return user;
  }),

  /**
   * Validate password strength
   */
  validatePassword: publicProcedure
    .input(z.object({ password: z.string() }))
    .mutation(async ({ input }) => {
      return authService.validatePassword(input.password);
    }),

  /**
   * Check if email is available for registration
   */
  checkEmailAvailable: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      const isRegistered = await authService.isEmailRegistered(input.email);
      return { available: !isRegistered };
    }),

  /**
   * Initiate password reset
   */
  forgotPassword: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const result = await authService.initiatePasswordReset(input.email);

      // Send reset email if user exists
      if (result) {
        const emailContent = passwordResetEmail({
          resetUrl: result.resetUrl,
          expiresInMinutes: 60,
        });

        await sendEmail({
          to: input.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });
      }

      // Always return success to prevent email enumeration
      return { success: true };
    }),

  /**
   * Reset password with token
   */
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string(),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await authService.resetPassword(input.token, input.newPassword);
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Password reset failed",
        });
      }
    }),

  /**
   * Update user profile
   * Requires authentication
   */
  updateProfile: publicProcedure
    .input(
      z.object({
        displayName: z.string().min(2).max(50).optional(),
        image: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to update your profile",
        });
      }

      await authService.updateUserProfile(ctx.userId, input);
      return { success: true };
    }),

  /**
   * Get user preferences
   * Requires authentication
   */
  getPreferences: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      return null;
    }

    return authService.getUserPreferences(ctx.userId);
  }),

  /**
   * Update user preferences (partial update)
   * Requires authentication
   */
  updatePreferences: publicProcedure
    .input(
      z.object({
        // Display preferences
        dateFormat: z.enum(["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]).optional(),
        currencySymbol: z.string().max(5).optional(),
        numberFormat: z.enum(["en-US", "de-DE", "fr-FR"]).optional(),
        showCents: z.boolean().optional(),
        tableDisplayMode: z.enum(["popover", "sheet"]).optional(),

        // Notification preferences
        notificationMode: z.enum(["toast", "popover"]).optional(),
        notificationVerbosity: z.enum(["all", "important", "errors-only"]).optional(),

        // Theme preferences
        theme: z.string().max(50).optional(),
        customThemeColor: z.string().max(20).optional().nullable(),

        // Font size
        fontSize: z.enum(["small", "normal", "large"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to update preferences",
        });
      }

      // Filter out undefined values and handle null for customThemeColor
      const preferences = Object.fromEntries(
        Object.entries(input).filter(([, v]) => v !== undefined)
      );

      return authService.updateUserPreferences(ctx.userId, preferences);
    }),

  /**
   * Change password (requires current password verification)
   */
  changePassword: secureProtectedProcedure
    .input(
      z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // ctx.userId is guaranteed non-null by secureProtectedProcedure middleware
        await authService.changePassword(
          ctx.userId!,
          input.currentPassword,
          input.newPassword
        );
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: error instanceof Error && error.message.includes("incorrect")
            ? "UNAUTHORIZED"
            : "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Password change failed",
        });
      }
    }),

  /**
   * Get user's active sessions
   */
  sessions: protectedProcedure.query(async ({ ctx }) => {
    const sessions = await authService.getUserSessions(ctx.userId);
    return sessions.map((session) => ({
      id: session.id,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      isCurrent: session.id === ctx.sessionId,
    }));
  }),

  /**
   * Revoke a specific session
   */
  revokeSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Prevent revoking current session
      if (input.sessionId === ctx.sessionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot revoke current session. Use logout instead.",
        });
      }

      try {
        await authService.revokeSession(ctx.userId, input.sessionId);
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: error instanceof Error ? error.message : "Session not found",
        });
      }
    }),

  /**
   * Revoke all sessions except the current one
   */
  revokeOtherSessions: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.sessionId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Current session not found",
      });
    }

    const count = await authService.revokeOtherSessions(ctx.userId, ctx.sessionId);
    return { success: true, count };
  }),

  /**
   * Request email verification
   */
  requestEmailVerification: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      await authService.requestEmailVerification(ctx.userId);
      return { success: true };
    } catch (error) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: error instanceof Error ? error.message : "Verification request failed",
      });
    }
  }),

  /**
   * Verify email with token
   */
  verifyEmail: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      try {
        await authService.verifyEmail(input.token);
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Email verification failed",
        });
      }
    }),

  /**
   * Delete account (requires password confirmation)
   */
  deleteAccount: secureProtectedProcedure
    .input(z.object({ password: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // ctx.userId is guaranteed non-null by secureProtectedProcedure middleware
        await authService.deleteAccount(ctx.userId!, input.password);
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: error instanceof Error && error.message.includes("incorrect")
            ? "UNAUTHORIZED"
            : "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Account deletion failed",
        });
      }
    }),
});
