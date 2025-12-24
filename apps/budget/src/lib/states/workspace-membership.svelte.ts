import type { WorkspaceMember, WorkspaceRole } from "$lib/schema/workspace-members";
import { Context } from "runed";

/**
 * Role hierarchy for comparisons
 * Higher number = more permissions
 */
const ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};

/**
 * State class representing the current user's membership in the active workspace
 */
export class WorkspaceMembershipState {
  membership = $state<WorkspaceMember | null>(null);
  role = $state<WorkspaceRole | null>(null);

  constructor(membership: WorkspaceMember | null = null) {
    if (membership) {
      this.setMembership(membership);
    }
  }

  setMembership(membership: WorkspaceMember) {
    this.membership = membership;
    this.role = membership.role;
  }

  clearMembership() {
    this.membership = null;
    this.role = null;
  }

  /**
   * Check if user is the workspace owner
   */
  get isOwner(): boolean {
    return this.role === "owner";
  }

  /**
   * Check if user is an admin (owner or admin role)
   */
  get isAdmin(): boolean {
    return this.role === "owner" || this.role === "admin";
  }

  /**
   * Check if user can edit (owner, admin, or editor)
   */
  get canEdit(): boolean {
    return this.role === "owner" || this.role === "admin" || this.role === "editor";
  }

  /**
   * Check if user is viewer only
   */
  get isViewer(): boolean {
    return this.role === "viewer";
  }

  /**
   * Check if user can manage members (invite, remove, change roles)
   */
  get canManageMembers(): boolean {
    return this.isAdmin;
  }

  /**
   * Check if user can manage workspace settings
   */
  get canManageWorkspace(): boolean {
    return this.isOwner;
  }

  /**
   * Check if user can create/update/delete entities
   */
  get canModify(): boolean {
    return this.canEdit;
  }

  /**
   * Check if current role is higher or equal to another role
   */
  isRoleHigherOrEqual(targetRole: WorkspaceRole): boolean {
    if (!this.role) return false;
    return ROLE_HIERARCHY[this.role] >= ROLE_HIERARCHY[targetRole];
  }

  /**
   * Check if current role can manage another role
   */
  canManageRole(targetRole: WorkspaceRole): boolean {
    if (!this.role) return false;
    // Only owner can manage owners
    if (targetRole === "owner") return this.isOwner;
    // Otherwise, must be strictly higher in hierarchy
    return ROLE_HIERARCHY[this.role] > ROLE_HIERARCHY[targetRole];
  }
}

/**
 * Context instance for workspace membership state
 * Use workspaceMembership.get() to access in components
 */
export const workspaceMembership = new Context<WorkspaceMembershipState>("workspace_membership");
