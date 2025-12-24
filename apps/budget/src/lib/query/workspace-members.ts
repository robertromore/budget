import type { WorkspaceMember, WorkspaceRole } from "$lib/schema/workspace-members";
import type {
  MemberWithUser,
  MemberWithWorkspace,
} from "$lib/server/domains/workspace-members";
import { trpc } from "$lib/trpc/client";
import { cachePatterns } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

export const workspaceMemberKeys = createQueryKeys("workspaceMembers", {
  all: () => ["workspaceMembers", "all"] as const,
  myWorkspaces: () => ["workspaceMembers", "myWorkspaces"] as const,
  myMembership: () => ["workspaceMembers", "myMembership"] as const,
  owner: () => ["workspaceMembers", "owner"] as const,
  count: () => ["workspaceMembers", "count"] as const,
});

/**
 * List all members of the current workspace
 */
export const listWorkspaceMembers = () =>
  defineQuery<MemberWithUser[]>({
    queryKey: workspaceMemberKeys.all(),
    queryFn: () => trpc().workspaceMembersRoutes.list.query(),
  });

/**
 * Get current user's workspaces
 */
export const getMyWorkspaces = () =>
  defineQuery<MemberWithWorkspace[]>({
    queryKey: workspaceMemberKeys.myWorkspaces(),
    queryFn: () => trpc().workspaceMembersRoutes.myWorkspaces.query(),
  });

/**
 * Get current user's membership in the current workspace
 */
export const getMyMembership = () =>
  defineQuery<WorkspaceMember | null>({
    queryKey: workspaceMemberKeys.myMembership(),
    queryFn: () => trpc().workspaceMembersRoutes.myMembership.query(),
  });

/**
 * Get workspace owner
 */
export const getWorkspaceOwner = () =>
  defineQuery<MemberWithUser | null>({
    queryKey: workspaceMemberKeys.owner(),
    queryFn: () => trpc().workspaceMembersRoutes.getOwner.query(),
  });

/**
 * Get member count
 */
export const getWorkspaceMemberCount = () =>
  defineQuery<number>({
    queryKey: workspaceMemberKeys.count(),
    queryFn: () => trpc().workspaceMembersRoutes.count.query(),
  });

/**
 * Update a member's role
 */
export const updateMemberRole = defineMutation<
  { userId: string; role: "admin" | "editor" | "viewer" },
  WorkspaceMember
>({
  mutationFn: (input) => trpc().workspaceMembersRoutes.updateRole.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(workspaceMemberKeys.all());
  },
  successMessage: "Member role updated",
  errorMessage: (error) => error.message || "Failed to update member role",
});

/**
 * Remove a member from the workspace
 */
export const removeMember = defineMutation<{ userId: string }, { success: boolean }>({
  mutationFn: (input) => trpc().workspaceMembersRoutes.remove.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(workspaceMemberKeys.all());
    cachePatterns.invalidatePrefix(workspaceMemberKeys.count());
  },
  successMessage: "Member removed",
  errorMessage: (error) => error.message || "Failed to remove member",
});

/**
 * Leave the current workspace
 */
export const leaveWorkspace = defineMutation<void, { success: boolean }>({
  mutationFn: () => trpc().workspaceMembersRoutes.leave.mutate(),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(workspaceMemberKeys.myWorkspaces());
    cachePatterns.invalidatePrefix(workspaceMemberKeys.myMembership());
  },
  successMessage: "Left workspace",
  errorMessage: (error) => error.message || "Failed to leave workspace",
});

/**
 * Transfer workspace ownership
 */
export const transferOwnership = defineMutation<
  { newOwnerId: string },
  { success: boolean }
>({
  mutationFn: (input) => trpc().workspaceMembersRoutes.transferOwnership.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(workspaceMemberKeys.all());
    cachePatterns.invalidatePrefix(workspaceMemberKeys.owner());
    cachePatterns.invalidatePrefix(workspaceMemberKeys.myMembership());
  },
  successMessage: "Ownership transferred",
  errorMessage: (error) => error.message || "Failed to transfer ownership",
});

/**
 * Set default workspace
 */
export const setDefaultWorkspace = defineMutation<
  { workspaceId: number },
  { success: boolean }
>({
  mutationFn: (input) => trpc().workspaceMembersRoutes.setDefault.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(workspaceMemberKeys.myWorkspaces());
  },
  successMessage: "Default workspace updated",
  errorMessage: (error) => error.message || "Failed to set default workspace",
});
