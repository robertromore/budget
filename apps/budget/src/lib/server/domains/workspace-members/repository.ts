import type { WorkspaceMember, WorkspaceRole } from "$lib/schema/workspace-members";
import { workspaceMembers } from "$lib/schema/workspace-members";
import { workspaces } from "$lib/schema/workspaces";
import { users } from "$lib/schema/users";
import { db } from "$lib/server/shared/database";
import { DatabaseError, NotFoundError } from "$lib/server/shared/types/errors";
import { and, eq, isNull, desc } from "drizzle-orm";

export interface CreateMemberInput {
  workspaceId: number;
  userId: string;
  role: WorkspaceRole;
  invitedBy?: string | null;
  isDefault?: boolean;
}

export interface UpdateMemberInput {
  role?: WorkspaceRole;
  isDefault?: boolean;
}

export interface MemberWithUser extends WorkspaceMember {
  user: {
    id: string;
    displayName: string | null;
    email: string | null;
    image: string | null;
  };
}

export interface MemberWithWorkspace extends WorkspaceMember {
  workspace: {
    id: number;
    displayName: string | null;
    slug: string | null;
  };
}

/**
 * Workspace Members repository for managing user-workspace relationships
 */
export class WorkspaceMemberRepository {
  /**
   * Find membership by workspace and user
   */
  async findMembership(
    workspaceId: number,
    userId: string
  ): Promise<WorkspaceMember | null> {
    try {
      const [membership] = await db
        .select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, userId)
          )
        )
        .limit(1);

      return membership || null;
    } catch (error) {
      throw new DatabaseError("Failed to find membership", "findMembership");
    }
  }

  /**
   * Find membership or throw error
   */
  async findMembershipOrThrow(
    workspaceId: number,
    userId: string
  ): Promise<WorkspaceMember> {
    const membership = await this.findMembership(workspaceId, userId);
    if (!membership) {
      throw new NotFoundError("Workspace membership");
    }
    return membership;
  }

  /**
   * Find all members of a workspace with user details
   */
  async findByWorkspace(workspaceId: number): Promise<MemberWithUser[]> {
    try {
      const members = await db
        .select({
          id: workspaceMembers.id,
          cuid: workspaceMembers.cuid,
          workspaceId: workspaceMembers.workspaceId,
          userId: workspaceMembers.userId,
          role: workspaceMembers.role,
          invitedBy: workspaceMembers.invitedBy,
          joinedAt: workspaceMembers.joinedAt,
          isDefault: workspaceMembers.isDefault,
          createdAt: workspaceMembers.createdAt,
          updatedAt: workspaceMembers.updatedAt,
          user: {
            id: users.id,
            displayName: users.displayName,
            email: users.email,
            image: users.image,
          },
        })
        .from(workspaceMembers)
        .innerJoin(users, eq(workspaceMembers.userId, users.id))
        .where(eq(workspaceMembers.workspaceId, workspaceId))
        .orderBy(desc(workspaceMembers.joinedAt));

      return members;
    } catch (error) {
      throw new DatabaseError("Failed to find workspace members", "findByWorkspace");
    }
  }

  /**
   * Find all workspaces for a user with workspace details
   */
  async findWorkspacesForUser(userId: string): Promise<MemberWithWorkspace[]> {
    try {
      const memberships = await db
        .select({
          id: workspaceMembers.id,
          cuid: workspaceMembers.cuid,
          workspaceId: workspaceMembers.workspaceId,
          userId: workspaceMembers.userId,
          role: workspaceMembers.role,
          invitedBy: workspaceMembers.invitedBy,
          joinedAt: workspaceMembers.joinedAt,
          isDefault: workspaceMembers.isDefault,
          createdAt: workspaceMembers.createdAt,
          updatedAt: workspaceMembers.updatedAt,
          workspace: {
            id: workspaces.id,
            displayName: workspaces.displayName,
            slug: workspaces.slug,
          },
        })
        .from(workspaceMembers)
        .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
        .where(
          and(
            eq(workspaceMembers.userId, userId),
            isNull(workspaces.deletedAt)
          )
        )
        .orderBy(desc(workspaceMembers.isDefault), desc(workspaceMembers.joinedAt));

      return memberships;
    } catch (error) {
      throw new DatabaseError("Failed to find user workspaces", "findWorkspacesForUser");
    }
  }

  /**
   * Get user's default workspace membership
   */
  async findDefaultForUser(userId: string): Promise<MemberWithWorkspace | null> {
    try {
      const [membership] = await db
        .select({
          id: workspaceMembers.id,
          cuid: workspaceMembers.cuid,
          workspaceId: workspaceMembers.workspaceId,
          userId: workspaceMembers.userId,
          role: workspaceMembers.role,
          invitedBy: workspaceMembers.invitedBy,
          joinedAt: workspaceMembers.joinedAt,
          isDefault: workspaceMembers.isDefault,
          createdAt: workspaceMembers.createdAt,
          updatedAt: workspaceMembers.updatedAt,
          workspace: {
            id: workspaces.id,
            displayName: workspaces.displayName,
            slug: workspaces.slug,
          },
        })
        .from(workspaceMembers)
        .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
        .where(
          and(
            eq(workspaceMembers.userId, userId),
            eq(workspaceMembers.isDefault, true),
            isNull(workspaces.deletedAt)
          )
        )
        .limit(1);

      return membership || null;
    } catch (error) {
      throw new DatabaseError("Failed to find default workspace", "findDefaultForUser");
    }
  }

  /**
   * Get workspace owner
   */
  async getOwner(workspaceId: number): Promise<MemberWithUser | null> {
    try {
      const [owner] = await db
        .select({
          id: workspaceMembers.id,
          cuid: workspaceMembers.cuid,
          workspaceId: workspaceMembers.workspaceId,
          userId: workspaceMembers.userId,
          role: workspaceMembers.role,
          invitedBy: workspaceMembers.invitedBy,
          joinedAt: workspaceMembers.joinedAt,
          isDefault: workspaceMembers.isDefault,
          createdAt: workspaceMembers.createdAt,
          updatedAt: workspaceMembers.updatedAt,
          user: {
            id: users.id,
            displayName: users.displayName,
            email: users.email,
            image: users.image,
          },
        })
        .from(workspaceMembers)
        .innerJoin(users, eq(workspaceMembers.userId, users.id))
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.role, "owner")
          )
        )
        .limit(1);

      return owner || null;
    } catch (error) {
      throw new DatabaseError("Failed to find workspace owner", "getOwner");
    }
  }

  /**
   * Count members in a workspace
   */
  async countMembers(workspaceId: number): Promise<number> {
    try {
      const members = await db
        .select()
        .from(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, workspaceId));

      return members.length;
    } catch (error) {
      throw new DatabaseError("Failed to count members", "countMembers");
    }
  }

  /**
   * Create a new membership
   */
  async create(data: CreateMemberInput): Promise<WorkspaceMember> {
    try {
      const [membership] = await db
        .insert(workspaceMembers)
        .values({
          workspaceId: data.workspaceId,
          userId: data.userId,
          role: data.role,
          invitedBy: data.invitedBy,
          isDefault: data.isDefault ?? false,
        })
        .returning();

      return membership;
    } catch (error: any) {
      // Handle unique constraint violation
      if (error?.code === "SQLITE_CONSTRAINT_UNIQUE" || error?.errno === 19) {
        throw new DatabaseError("User is already a member of this workspace", "create");
      }
      throw new DatabaseError("Failed to create membership", "create");
    }
  }

  /**
   * Update membership role
   */
  async updateRole(
    workspaceId: number,
    userId: string,
    role: WorkspaceRole
  ): Promise<WorkspaceMember> {
    try {
      const [membership] = await db
        .update(workspaceMembers)
        .set({ role })
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, userId)
          )
        )
        .returning();

      if (!membership) {
        throw new NotFoundError("Workspace membership");
      }

      return membership;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError("Failed to update membership role", "updateRole");
    }
  }

  /**
   * Set user's default workspace
   */
  async setDefaultWorkspace(userId: string, workspaceId: number): Promise<void> {
    try {
      // First, unset all other defaults for this user
      await db
        .update(workspaceMembers)
        .set({ isDefault: false })
        .where(eq(workspaceMembers.userId, userId));

      // Then set the new default
      const [updated] = await db
        .update(workspaceMembers)
        .set({ isDefault: true })
        .where(
          and(
            eq(workspaceMembers.userId, userId),
            eq(workspaceMembers.workspaceId, workspaceId)
          )
        )
        .returning();

      if (!updated) {
        throw new NotFoundError("Workspace membership");
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError("Failed to set default workspace", "setDefaultWorkspace");
    }
  }

  /**
   * Delete membership
   */
  async delete(workspaceId: number, userId: string): Promise<void> {
    try {
      // First verify membership exists
      await this.findMembershipOrThrow(workspaceId, userId);

      await db
        .delete(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, userId)
          )
        );
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError("Failed to delete membership", "delete");
    }
  }
}
