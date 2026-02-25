import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { createCaller } from "../../../src/lib/trpc/router";

function unauthenticatedContext() {
  return {
    db: {},
    workspaceId: 1,
    userId: null,
    sessionId: null,
  } as any;
}

async function expectUnauthorized(call: () => Promise<unknown>) {
  await expect(call()).rejects.toMatchObject({ code: "UNAUTHORIZED" as TRPCError["code"] });
}

describe("tRPC auth boundary regressions", () => {
  it("allows unauthenticated access to open auth route", async () => {
    const caller = createCaller(unauthenticatedContext());
    await expect(caller.authRoutes.me()).resolves.toBeNull();
  });

  it("rejects unauthenticated access to protected auth procedures", async () => {
    const caller = createCaller(unauthenticatedContext());

    await expectUnauthorized(() => caller.authRoutes.updateProfile({ displayName: "Valid Name" }));
    await expectUnauthorized(() =>
      caller.authRoutes.changePassword({
        currentPassword: "CurrentPass123!",
        newPassword: "NextPass123!",
      })
    );
    await expectUnauthorized(() => caller.authRoutes.sessions());
    await expectUnauthorized(() => caller.authRoutes.revokeOtherSessions());
    await expectUnauthorized(() => caller.authRoutes.requestEmailVerification());
    await expectUnauthorized(() =>
      caller.authRoutes.deleteAccount({ password: "CurrentPass123!" })
    );
  });

  it("rejects unauthenticated access to protected workspace invitation procedures", async () => {
    const caller = createCaller(unauthenticatedContext());

    await expectUnauthorized(() => caller.workspaceInvitationsRoutes.list());
    await expectUnauthorized(() =>
      caller.workspaceInvitationsRoutes.create({
        email: "invitee@example.com",
        role: "viewer",
      })
    );
    await expectUnauthorized(() => caller.workspaceInvitationsRoutes.revoke({ invitationId: 1 }));
    await expectUnauthorized(() => caller.workspaceInvitationsRoutes.resend({ invitationId: 1 }));
    await expectUnauthorized(() =>
      caller.workspaceInvitationsRoutes.accept({ token: "invite_token" })
    );
    await expectUnauthorized(() => caller.workspaceInvitationsRoutes.myPendingInvitations());
  });
});
