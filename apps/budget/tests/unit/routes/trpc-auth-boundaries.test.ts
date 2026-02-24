import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const isBunRuntime = typeof Bun !== "undefined";

if (isBunRuntime) {
  describe.skip("tRPC auth boundary regressions", () => {
    it("is skipped under Bun due module mocking limitations", () => {});
  });
} else {
const mocks = {
  auth: {
    getUserById: vi.fn(),
    validatePassword: vi.fn(),
    isEmailRegistered: vi.fn(),
    initiatePasswordReset: vi.fn(),
    resetPassword: vi.fn(),
    verifyEmail: vi.fn(),
    updateUserProfile: vi.fn(),
    getUserPreferences: vi.fn(),
    updateUserPreferences: vi.fn(),
    changePassword: vi.fn(),
    getUserSessions: vi.fn(),
    revokeSession: vi.fn(),
    revokeOtherSessions: vi.fn(),
    requestEmailVerification: vi.fn(),
    deleteAccount: vi.fn(),
  },
  email: {
    sendEmail: vi.fn(),
  },
  invitations: {
    findMembership: vi.fn(),
    getInvitationByToken: vi.fn(),
    declineInvitation: vi.fn(),
    getWorkspaceInvitations: vi.fn(),
    createInvitation: vi.fn(),
    revokeInvitation: vi.fn(),
    resendInvitation: vi.fn(),
    acceptInvitation: vi.fn(),
    getUserPendingInvitations: vi.fn(),
  },
};

vi.mock("$lib/server/domains/auth", () => ({
  AuthService: class {
    getUserById(...args: unknown[]) {
      return mocks.auth.getUserById(...args);
    }
    validatePassword(...args: unknown[]) {
      return mocks.auth.validatePassword(...args);
    }
    isEmailRegistered(...args: unknown[]) {
      return mocks.auth.isEmailRegistered(...args);
    }
    initiatePasswordReset(...args: unknown[]) {
      return mocks.auth.initiatePasswordReset(...args);
    }
    resetPassword(...args: unknown[]) {
      return mocks.auth.resetPassword(...args);
    }
    verifyEmail(...args: unknown[]) {
      return mocks.auth.verifyEmail(...args);
    }
    updateUserProfile(...args: unknown[]) {
      return mocks.auth.updateUserProfile(...args);
    }
    getUserPreferences(...args: unknown[]) {
      return mocks.auth.getUserPreferences(...args);
    }
    updateUserPreferences(...args: unknown[]) {
      return mocks.auth.updateUserPreferences(...args);
    }
    changePassword(...args: unknown[]) {
      return mocks.auth.changePassword(...args);
    }
    getUserSessions(...args: unknown[]) {
      return mocks.auth.getUserSessions(...args);
    }
    revokeSession(...args: unknown[]) {
      return mocks.auth.revokeSession(...args);
    }
    revokeOtherSessions(...args: unknown[]) {
      return mocks.auth.revokeOtherSessions(...args);
    }
    requestEmailVerification(...args: unknown[]) {
      return mocks.auth.requestEmailVerification(...args);
    }
    deleteAccount(...args: unknown[]) {
      return mocks.auth.deleteAccount(...args);
    }
  },
}));

vi.mock("$lib/server/email", () => ({
  sendEmail: (...args: unknown[]) => mocks.email.sendEmail(...args),
}));

vi.mock("$lib/server/email/templates", () => ({
  passwordResetEmail: ({ resetUrl }: { resetUrl: string }) => ({
    subject: "Reset your password",
    html: `<p>Reset link: ${resetUrl}</p>`,
    text: `Reset link: ${resetUrl}`,
  }),
}));

vi.mock("$lib/server/domains/workspace-members", () => ({
  WorkspaceMemberRepository: class {
    findMembership(...args: unknown[]) {
      return mocks.invitations.findMembership(...args);
    }
  },
}));

vi.mock("$lib/server/domains/workspace-invitations", () => ({
  WorkspaceInvitationRepository: class {},
  WorkspaceInvitationService: class {
    getInvitationByToken(...args: unknown[]) {
      return mocks.invitations.getInvitationByToken(...args);
    }
    declineInvitation(...args: unknown[]) {
      return mocks.invitations.declineInvitation(...args);
    }
    getWorkspaceInvitations(...args: unknown[]) {
      return mocks.invitations.getWorkspaceInvitations(...args);
    }
    createInvitation(...args: unknown[]) {
      return mocks.invitations.createInvitation(...args);
    }
    revokeInvitation(...args: unknown[]) {
      return mocks.invitations.revokeInvitation(...args);
    }
    resendInvitation(...args: unknown[]) {
      return mocks.invitations.resendInvitation(...args);
    }
    acceptInvitation(...args: unknown[]) {
      return mocks.invitations.acceptInvitation(...args);
    }
    getUserPendingInvitations(...args: unknown[]) {
      return mocks.invitations.getUserPendingInvitations(...args);
    }
  },
}));

vi.mock("$lib/trpc", async () => {
  const trpc = await import("../../../src/lib/trpc/t");
  return trpc;
});

let createAuthCaller: ((ctx: unknown) => any) | undefined;
let createWorkspaceInvitationCaller: ((ctx: unknown) => any) | undefined;

async function ensureCallersLoaded() {
  if (createAuthCaller && createWorkspaceInvitationCaller) {
    return;
  }

  const [{ authRoutes }, { workspaceInvitationsRoutes }, { t }] = await Promise.all([
    import("../../../src/lib/trpc/routes/auth"),
    import("../../../src/lib/trpc/routes/workspace-invitations"),
    import("../../../src/lib/trpc/t"),
  ]);

  createAuthCaller = t.createCallerFactory(authRoutes);
  createWorkspaceInvitationCaller = t.createCallerFactory(workspaceInvitationsRoutes);
}

function unauthenticatedContext() {
  return { isTest: true, db: {}, workspaceId: 1 } as any;
}

async function expectUnauthorized(call: () => Promise<unknown>) {
  try {
    await call();
    expect.fail("Expected UNAUTHORIZED error");
  } catch (error) {
    expect(error).toBeInstanceOf(TRPCError);
    expect((error as TRPCError).code).toBe("UNAUTHORIZED");
  }
}

describe("tRPC auth boundary regressions", () => {
  beforeEach(async () => {
    await ensureCallersLoaded();
    vi.clearAllMocks();

    mocks.auth.validatePassword.mockReturnValue({
      valid: true,
      errors: [],
      strength: "strong",
    });
    mocks.auth.isEmailRegistered.mockResolvedValue(false);
    mocks.auth.initiatePasswordReset.mockResolvedValue({
      resetUrl: "https://example.com/reset?token=test-token",
    });
    mocks.auth.resetPassword.mockResolvedValue(undefined);
    mocks.auth.verifyEmail.mockResolvedValue(undefined);
    mocks.email.sendEmail.mockResolvedValue({ success: true });

    mocks.invitations.getInvitationByToken.mockResolvedValue({
      id: 7,
      email: "invitee@example.com",
      role: "viewer",
      status: "pending",
      expiresAt: "2099-01-01T00:00:00.000Z",
      message: "Welcome",
      workspace: {
        id: 1,
        displayName: "Main Workspace",
        slug: "main-workspace",
      },
      inviter: {
        id: "user_owner",
        displayName: "Owner User",
        email: "owner@example.com",
      },
    });
    mocks.invitations.declineInvitation.mockResolvedValue(undefined);
  });

  describe("auth routes", () => {
    it("allows unauthenticated access to open procedures", async () => {
      const caller = createAuthCaller!(unauthenticatedContext());

      await expect(caller.me()).resolves.toBeNull();
      await expect(
        caller.validatePassword({
          password: "ComplexPass123!",
        })
      ).resolves.toEqual({
        valid: true,
        errors: [],
        strength: "strong",
      });
      await expect(caller.checkEmailAvailable({ email: "new@example.com" })).resolves.toEqual({
        available: true,
      });
      await expect(caller.forgotPassword({ email: "new@example.com" })).resolves.toEqual({
        success: true,
      });
      await expect(
        caller.resetPassword({ token: "token_123", newPassword: "ComplexPass123!" })
      ).resolves.toEqual({
        success: true,
      });
      await expect(caller.verifyEmail({ token: "verify_token" })).resolves.toEqual({
        success: true,
      });
    });

    it("rejects unauthenticated access to auth-required procedures", async () => {
      const caller = createAuthCaller!(unauthenticatedContext());

      await expectUnauthorized(() => caller.updateProfile({ displayName: "New Name" }));
      await expectUnauthorized(() => caller.getPreferences());
      await expectUnauthorized(() => caller.updatePreferences({ theme: "zinc" }));
      await expectUnauthorized(() =>
        caller.changePassword({
          currentPassword: "OldPass123!",
          newPassword: "NewPass123!",
        })
      );
      await expectUnauthorized(() => caller.sessions());
      await expectUnauthorized(() => caller.revokeSession({ sessionId: "session_2" }));
      await expectUnauthorized(() => caller.revokeOtherSessions());
      await expectUnauthorized(() => caller.requestEmailVerification());
      await expectUnauthorized(() => caller.deleteAccount({ password: "OldPass123!" }));

      expect(mocks.auth.updateUserProfile).not.toHaveBeenCalled();
      expect(mocks.auth.getUserPreferences).not.toHaveBeenCalled();
      expect(mocks.auth.updateUserPreferences).not.toHaveBeenCalled();
      expect(mocks.auth.changePassword).not.toHaveBeenCalled();
      expect(mocks.auth.getUserSessions).not.toHaveBeenCalled();
      expect(mocks.auth.revokeSession).not.toHaveBeenCalled();
      expect(mocks.auth.revokeOtherSessions).not.toHaveBeenCalled();
      expect(mocks.auth.requestEmailVerification).not.toHaveBeenCalled();
      expect(mocks.auth.deleteAccount).not.toHaveBeenCalled();
    });
  });

  describe("workspace invitation routes", () => {
    it("allows unauthenticated access to token-based open procedures", async () => {
      const caller = createWorkspaceInvitationCaller!(unauthenticatedContext());

      await expect(caller.decline({ token: "invite_token" })).resolves.toEqual({
        success: true,
      });

      await expect(caller.getByToken({ token: "invite_token" })).resolves.toEqual({
        id: 7,
        email: "invitee@example.com",
        role: "viewer",
        status: "pending",
        expiresAt: "2099-01-01T00:00:00.000Z",
        message: "Welcome",
        workspace: {
          id: 1,
          displayName: "Main Workspace",
          slug: "main-workspace",
        },
        inviter: {
          displayName: "Owner User",
        },
      });
    });

    it("rejects unauthenticated access to auth-required invitation procedures", async () => {
      const caller = createWorkspaceInvitationCaller!(unauthenticatedContext());

      await expectUnauthorized(() => caller.list());
      await expectUnauthorized(() =>
        caller.create({
          email: "invitee@example.com",
          role: "viewer",
        })
      );
      await expectUnauthorized(() => caller.revoke({ invitationId: 1 }));
      await expectUnauthorized(() => caller.resend({ invitationId: 1 }));
      await expectUnauthorized(() => caller.accept({ token: "invite_token" }));
      await expectUnauthorized(() => caller.myPendingInvitations());

      expect(mocks.invitations.getWorkspaceInvitations).not.toHaveBeenCalled();
      expect(mocks.invitations.createInvitation).not.toHaveBeenCalled();
      expect(mocks.invitations.revokeInvitation).not.toHaveBeenCalled();
      expect(mocks.invitations.resendInvitation).not.toHaveBeenCalled();
      expect(mocks.invitations.acceptInvitation).not.toHaveBeenCalled();
      expect(mocks.invitations.getUserPendingInvitations).not.toHaveBeenCalled();
    });
  });
});
}
