import type { WorkspaceMember, WorkspaceRole } from "$lib/schema/workspace-members";
import { workspaces } from "$lib/schema/workspaces";
import { db } from "$lib/server/shared/database";
import {
  ConflictError,
  ForbiddenError,
  ValidationError,
} from "$lib/server/shared/types/errors";
import { eq } from "drizzle-orm";
import {
  WorkspaceMemberRepository,
  type MemberWithUser,
  type MemberWithWorkspace,
} from "./repository";

// Role hierarchy for permission checks
const ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};

/**
 * Workspace Members service containing business logic
 */
export class WorkspaceMemberService {
  constructor(private repository: WorkspaceMemberRepository) {}

  /**
   * Get all members of a workspace
   */
  async getWorkspaceMembers(workspaceId: number): Promise<MemberWithUser[]> {
    return await this.repository.findByWorkspace(workspaceId);
  }

  /**
   * Get all workspaces for a user
   */
  async getUserWorkspaces(userId: string): Promise<MemberWithWorkspace[]> {
    return await this.repository.findWorkspacesForUser(userId);
  }

  /**
   * Get user's membership in a workspace
   */
  async getMembership(
    workspaceId: number,
    userId: string
  ): Promise<WorkspaceMember | null> {
    return await this.repository.findMembership(workspaceId, userId);
  }

  /**
   * Check if user is a member of workspace
   */
  async isMember(workspaceId: number, userId: string): Promise<boolean> {
    const membership = await this.repository.findMembership(workspaceId, userId);
    return membership !== null;
  }

  /**
   * Add a member to a workspace
   */
  async addMember(
    workspaceId: number,
    userId: string,
    role: WorkspaceRole,
    invitedBy?: string
  ): Promise<WorkspaceMember> {
    // Validate role
    if (!["owner", "admin", "editor", "viewer"].includes(role)) {
      throw new ValidationError(`Invalid role: ${role}`);
    }

    // Check if user is already a member
    const existingMembership = await this.repository.findMembership(
      workspaceId,
      userId
    );
    if (existingMembership) {
      throw new ConflictError("User is already a member of this workspace");
    }

    // Only one owner allowed (handled by transfer ownership)
    if (role === "owner") {
      const currentOwner = await this.repository.getOwner(workspaceId);
      if (currentOwner) {
        throw new ConflictError(
          "Workspace already has an owner. Use transfer ownership instead."
        );
      }
    }

    return await this.repository.create({
      workspaceId,
      userId,
      role,
      invitedBy,
      isDefault: false,
    });
  }

  /**
   * Update a member's role
   */
  async updateMemberRole(
    workspaceId: number,
    targetUserId: string,
    newRole: WorkspaceRole,
    requesterId: string
  ): Promise<WorkspaceMember> {
    // Validate role
    if (!["owner", "admin", "editor", "viewer"].includes(newRole)) {
      throw new ValidationError(`Invalid role: ${newRole}`);
    }

    // Get requester's membership
    const requesterMembership = await this.repository.findMembershipOrThrow(
      workspaceId,
      requesterId
    );

    // Get target's membership
    const targetMembership = await this.repository.findMembershipOrThrow(
      workspaceId,
      targetUserId
    );

    // Cannot change owner role (use transfer ownership)
    if (targetMembership.role === "owner") {
      throw new ForbiddenError(
        "Cannot change owner role. Use transfer ownership instead."
      );
    }

    // Cannot promote to owner (use transfer ownership)
    if (newRole === "owner") {
      throw new ForbiddenError(
        "Cannot promote to owner. Use transfer ownership instead."
      );
    }

    // Check permission: requester must have higher role than both current and new role
    const requesterLevel = ROLE_HIERARCHY[requesterMembership.role];
    const currentLevel = ROLE_HIERARCHY[targetMembership.role];
    const newLevel = ROLE_HIERARCHY[newRole];

    if (requesterLevel <= currentLevel || requesterLevel <= newLevel) {
      throw new ForbiddenError(
        "Insufficient permissions to change this member's role"
      );
    }

    return await this.repository.updateRole(workspaceId, targetUserId, newRole);
  }

  /**
   * Remove a member from a workspace
   */
  async removeMember(
    workspaceId: number,
    targetUserId: string,
    requesterId: string
  ): Promise<void> {
    // Get requester's membership
    const requesterMembership = await this.repository.findMembershipOrThrow(
      workspaceId,
      requesterId
    );

    // Get target's membership
    const targetMembership = await this.repository.findMembershipOrThrow(
      workspaceId,
      targetUserId
    );

    // Cannot remove owner
    if (targetMembership.role === "owner") {
      throw new ForbiddenError("Cannot remove workspace owner");
    }

    // Check permission: requester must have higher role than target
    const requesterLevel = ROLE_HIERARCHY[requesterMembership.role];
    const targetLevel = ROLE_HIERARCHY[targetMembership.role];

    if (requesterLevel <= targetLevel) {
      throw new ForbiddenError("Insufficient permissions to remove this member");
    }

    await this.repository.delete(workspaceId, targetUserId);
  }

  /**
   * Leave a workspace (self-removal)
   */
  async leaveWorkspace(workspaceId: number, userId: string): Promise<void> {
    const membership = await this.repository.findMembershipOrThrow(
      workspaceId,
      userId
    );

    // Owner cannot leave without transferring ownership
    if (membership.role === "owner") {
      throw new ForbiddenError(
        "Owner cannot leave workspace. Transfer ownership first."
      );
    }

    await this.repository.delete(workspaceId, userId);
  }

  /**
   * Transfer workspace ownership to another member
   */
  async transferOwnership(
    workspaceId: number,
    newOwnerId: string,
    currentOwnerId: string
  ): Promise<void> {
    // Verify current owner
    const currentOwnerMembership = await this.repository.findMembershipOrThrow(
      workspaceId,
      currentOwnerId
    );

    if (currentOwnerMembership.role !== "owner") {
      throw new ForbiddenError("Only the owner can transfer ownership");
    }

    // Verify new owner is a member
    const newOwnerMembership = await this.repository.findMembershipOrThrow(
      workspaceId,
      newOwnerId
    );

    if (newOwnerMembership.role === "owner") {
      throw new ValidationError("User is already the owner");
    }

    // Transfer ownership (demote current owner to admin, promote new owner)
    await this.repository.updateRole(workspaceId, currentOwnerId, "admin");
    await this.repository.updateRole(workspaceId, newOwnerId, "owner");

    // Update workspace ownerId
    await db
      .update(workspaces)
      .set({ ownerId: newOwnerId })
      .where(eq(workspaces.id, workspaceId));
  }

  /**
   * Set user's default workspace
   */
  async setDefaultWorkspace(userId: string, workspaceId: number): Promise<void> {
    // Verify membership exists
    await this.repository.findMembershipOrThrow(workspaceId, userId);

    await this.repository.setDefaultWorkspace(userId, workspaceId);
  }

  /**
   * Get user's default workspace
   */
  async getDefaultWorkspace(userId: string): Promise<MemberWithWorkspace | null> {
    return await this.repository.findDefaultForUser(userId);
  }

  /**
   * Get workspace owner
   */
  async getWorkspaceOwner(workspaceId: number): Promise<MemberWithUser | null> {
    return await this.repository.getOwner(workspaceId);
  }

  /**
   * Count members in a workspace
   */
  async countMembers(workspaceId: number): Promise<number> {
    return await this.repository.countMembers(workspaceId);
  }

  /**
   * Check if user has at least the specified role
   */
  async hasRole(
    workspaceId: number,
    userId: string,
    minimumRole: WorkspaceRole
  ): Promise<boolean> {
    const membership = await this.repository.findMembership(workspaceId, userId);
    if (!membership) return false;

    const userLevel = ROLE_HIERARCHY[membership.role];
    const requiredLevel = ROLE_HIERARCHY[minimumRole];

    return userLevel >= requiredLevel;
  }
}
