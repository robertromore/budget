import type { WorkspaceInvitation } from "$lib/schema/workspace-invitations";
import type { InvitationWithDetails } from "$lib/server/domains/workspace-invitations";
import { trpc } from "$lib/trpc/client";
import { cachePatterns } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

export const workspaceInvitationKeys = createQueryKeys("workspaceInvitations", {
  all: () => ["workspaceInvitations", "all"] as const,
  byToken: (token: string) => ["workspaceInvitations", "token", token] as const,
  myPending: () => ["workspaceInvitations", "myPending"] as const,
});

/**
 * List pending invitations for current workspace
 */
export const listWorkspaceInvitations = () =>
  defineQuery<InvitationWithDetails[]>({
    queryKey: workspaceInvitationKeys.all(),
    queryFn: () => trpc().workspaceInvitationsRoutes.list.query(),
  });

/**
 * Get invitation by token (public)
 */
type InvitationByTokenResult = {
  id: number;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  message: string | null;
  workspace: {
    id: number;
    displayName: string | null;
    slug: string | null;
  };
  inviter: {
    displayName: string | null;
  };
};

export const getInvitationByToken = defineQuery<{ token: string }, InvitationByTokenResult>({
  queryKey: (params: { token: string }) => workspaceInvitationKeys.byToken(params.token),
  queryFn: (params: { token: string }) => trpc().workspaceInvitationsRoutes.getByToken.query(params),
});

/**
 * Get current user's pending invitations
 */
export const getMyPendingInvitations = () =>
  defineQuery<InvitationWithDetails[]>({
    queryKey: workspaceInvitationKeys.myPending(),
    queryFn: () => trpc().workspaceInvitationsRoutes.myPendingInvitations.query(),
  });

/**
 * Create a new invitation
 */
export const createInvitation = defineMutation<
  {
    email: string;
    role: "admin" | "editor" | "viewer";
    message?: string;
  },
  WorkspaceInvitation
>({
  mutationFn: (input) => trpc().workspaceInvitationsRoutes.create.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(workspaceInvitationKeys.all());
  },
  successMessage: "Invitation sent",
  errorMessage: (error) => error.message || "Failed to send invitation",
});

/**
 * Revoke an invitation
 */
export const revokeInvitation = defineMutation<
  { invitationId: number },
  WorkspaceInvitation
>({
  mutationFn: (input) => trpc().workspaceInvitationsRoutes.revoke.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(workspaceInvitationKeys.all());
  },
  successMessage: "Invitation revoked",
  errorMessage: (error) => error.message || "Failed to revoke invitation",
});

/**
 * Resend an invitation
 */
export const resendInvitation = defineMutation<
  { invitationId: number },
  WorkspaceInvitation
>({
  mutationFn: (input) => trpc().workspaceInvitationsRoutes.resend.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(workspaceInvitationKeys.all());
  },
  successMessage: "Invitation resent",
  errorMessage: (error) => error.message || "Failed to resend invitation",
});

/**
 * Accept an invitation
 */
export const acceptInvitation = defineMutation<
  { token: string },
  { success: boolean; workspaceId: number }
>({
  mutationFn: (input) => trpc().workspaceInvitationsRoutes.accept.mutate(input),
  onSuccess: (_, variables) => {
    cachePatterns.invalidatePrefix(workspaceInvitationKeys.byToken(variables.token));
    cachePatterns.invalidatePrefix(workspaceInvitationKeys.myPending());
  },
  successMessage: "Invitation accepted! Welcome to the workspace.",
  errorMessage: (error) => error.message || "Failed to accept invitation",
});

/**
 * Decline an invitation
 */
export const declineInvitation = defineMutation<{ token: string }, { success: boolean }>({
  mutationFn: (input) => trpc().workspaceInvitationsRoutes.decline.mutate(input),
  onSuccess: (_, variables) => {
    cachePatterns.invalidatePrefix(workspaceInvitationKeys.byToken(variables.token));
    cachePatterns.invalidatePrefix(workspaceInvitationKeys.myPending());
  },
  successMessage: "Invitation declined",
  errorMessage: (error) => error.message || "Failed to decline invitation",
});
