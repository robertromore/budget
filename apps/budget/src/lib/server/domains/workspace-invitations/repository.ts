import type {
  WorkspaceInvitation,
  InvitationStatus,
} from "$lib/schema/workspace-invitations";
import { workspaceInvitations } from "$lib/schema/workspace-invitations";
import { workspaces } from "$lib/schema/workspaces";
import { users } from "$lib/schema/users";
import { db } from "$lib/server/shared/database";
import { DatabaseError, NotFoundError } from "$lib/server/shared/types/errors";
import { getCurrentTimestamp } from "$lib/utils/dates";
import { and, eq, lt } from "drizzle-orm";

export interface CreateInvitationInput {
  workspaceId: number;
  email: string;
  role: "admin" | "editor" | "viewer";
  invitedBy: string;
  token: string;
  expiresAt: string;
  message?: string;
}

export interface InvitationWithDetails extends WorkspaceInvitation {
  workspace: {
    id: number;
    displayName: string | null;
    slug: string | null;
  };
  inviter: {
    id: string;
    displayName: string | null;
    email: string | null;
  };
}

/**
 * Workspace Invitations repository for managing invitation records
 */
export class WorkspaceInvitationRepository {
  /**
   * Find invitation by token
   */
  async findByToken(token: string): Promise<InvitationWithDetails | null> {
    try {
      const [invitation] = await db
        .select({
          id: workspaceInvitations.id,
          cuid: workspaceInvitations.cuid,
          workspaceId: workspaceInvitations.workspaceId,
          email: workspaceInvitations.email,
          role: workspaceInvitations.role,
          invitedBy: workspaceInvitations.invitedBy,
          token: workspaceInvitations.token,
          status: workspaceInvitations.status,
          expiresAt: workspaceInvitations.expiresAt,
          respondedAt: workspaceInvitations.respondedAt,
          acceptedUserId: workspaceInvitations.acceptedUserId,
          message: workspaceInvitations.message,
          createdAt: workspaceInvitations.createdAt,
          updatedAt: workspaceInvitations.updatedAt,
          workspace: {
            id: workspaces.id,
            displayName: workspaces.displayName,
            slug: workspaces.slug,
          },
          inviter: {
            id: users.id,
            displayName: users.displayName,
            email: users.email,
          },
        })
        .from(workspaceInvitations)
        .innerJoin(workspaces, eq(workspaceInvitations.workspaceId, workspaces.id))
        .innerJoin(users, eq(workspaceInvitations.invitedBy, users.id))
        .where(eq(workspaceInvitations.token, token))
        .limit(1);

      return invitation || null;
    } catch (error) {
      throw new DatabaseError("Failed to find invitation by token", "findByToken");
    }
  }

  /**
   * Find invitation by token or throw
   */
  async findByTokenOrThrow(token: string): Promise<InvitationWithDetails> {
    const invitation = await this.findByToken(token);
    if (!invitation) {
      throw new NotFoundError("Invitation");
    }
    return invitation;
  }

  /**
   * Find pending invitations for a workspace
   */
  async findPendingByWorkspace(
    workspaceId: number
  ): Promise<InvitationWithDetails[]> {
    try {
      const invitations = await db
        .select({
          id: workspaceInvitations.id,
          cuid: workspaceInvitations.cuid,
          workspaceId: workspaceInvitations.workspaceId,
          email: workspaceInvitations.email,
          role: workspaceInvitations.role,
          invitedBy: workspaceInvitations.invitedBy,
          token: workspaceInvitations.token,
          status: workspaceInvitations.status,
          expiresAt: workspaceInvitations.expiresAt,
          respondedAt: workspaceInvitations.respondedAt,
          acceptedUserId: workspaceInvitations.acceptedUserId,
          message: workspaceInvitations.message,
          createdAt: workspaceInvitations.createdAt,
          updatedAt: workspaceInvitations.updatedAt,
          workspace: {
            id: workspaces.id,
            displayName: workspaces.displayName,
            slug: workspaces.slug,
          },
          inviter: {
            id: users.id,
            displayName: users.displayName,
            email: users.email,
          },
        })
        .from(workspaceInvitations)
        .innerJoin(workspaces, eq(workspaceInvitations.workspaceId, workspaces.id))
        .innerJoin(users, eq(workspaceInvitations.invitedBy, users.id))
        .where(
          and(
            eq(workspaceInvitations.workspaceId, workspaceId),
            eq(workspaceInvitations.status, "pending")
          )
        );

      return invitations;
    } catch (error) {
      throw new DatabaseError(
        "Failed to find pending invitations",
        "findPendingByWorkspace"
      );
    }
  }

  /**
   * Find pending invitations for an email
   */
  async findPendingByEmail(email: string): Promise<InvitationWithDetails[]> {
    try {
      const invitations = await db
        .select({
          id: workspaceInvitations.id,
          cuid: workspaceInvitations.cuid,
          workspaceId: workspaceInvitations.workspaceId,
          email: workspaceInvitations.email,
          role: workspaceInvitations.role,
          invitedBy: workspaceInvitations.invitedBy,
          token: workspaceInvitations.token,
          status: workspaceInvitations.status,
          expiresAt: workspaceInvitations.expiresAt,
          respondedAt: workspaceInvitations.respondedAt,
          acceptedUserId: workspaceInvitations.acceptedUserId,
          message: workspaceInvitations.message,
          createdAt: workspaceInvitations.createdAt,
          updatedAt: workspaceInvitations.updatedAt,
          workspace: {
            id: workspaces.id,
            displayName: workspaces.displayName,
            slug: workspaces.slug,
          },
          inviter: {
            id: users.id,
            displayName: users.displayName,
            email: users.email,
          },
        })
        .from(workspaceInvitations)
        .innerJoin(workspaces, eq(workspaceInvitations.workspaceId, workspaces.id))
        .innerJoin(users, eq(workspaceInvitations.invitedBy, users.id))
        .where(
          and(
            eq(workspaceInvitations.email, email.toLowerCase()),
            eq(workspaceInvitations.status, "pending")
          )
        );

      return invitations;
    } catch (error) {
      throw new DatabaseError(
        "Failed to find pending invitations for email",
        "findPendingByEmail"
      );
    }
  }

  /**
   * Check if a pending invitation exists for email and workspace
   */
  async existsPendingForEmailAndWorkspace(
    email: string,
    workspaceId: number
  ): Promise<boolean> {
    try {
      const [invitation] = await db
        .select()
        .from(workspaceInvitations)
        .where(
          and(
            eq(workspaceInvitations.email, email.toLowerCase()),
            eq(workspaceInvitations.workspaceId, workspaceId),
            eq(workspaceInvitations.status, "pending")
          )
        )
        .limit(1);

      return !!invitation;
    } catch (error) {
      throw new DatabaseError(
        "Failed to check existing invitation",
        "existsPendingForEmailAndWorkspace"
      );
    }
  }

  /**
   * Create a new invitation
   */
  async create(data: CreateInvitationInput): Promise<WorkspaceInvitation> {
    try {
      const [invitation] = await db
        .insert(workspaceInvitations)
        .values({
          workspaceId: data.workspaceId,
          email: data.email.toLowerCase(),
          role: data.role,
          invitedBy: data.invitedBy,
          token: data.token,
          expiresAt: data.expiresAt,
          message: data.message,
          status: "pending",
        })
        .returning();

      return invitation;
    } catch (error) {
      throw new DatabaseError("Failed to create invitation", "create");
    }
  }

  /**
   * Update invitation status
   */
  async updateStatus(
    id: number,
    status: InvitationStatus,
    acceptedUserId?: number
  ): Promise<WorkspaceInvitation> {
    try {
      const [invitation] = await db
        .update(workspaceInvitations)
        .set({
          status,
          respondedAt: getCurrentTimestamp(),
          acceptedUserId,
        })
        .where(eq(workspaceInvitations.id, id))
        .returning();

      if (!invitation) {
        throw new NotFoundError("Invitation");
      }

      return invitation;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError("Failed to update invitation status", "updateStatus");
    }
  }

  /**
   * Expire old pending invitations
   */
  async expireOldInvitations(): Promise<number> {
    try {
      const now = getCurrentTimestamp();

      const expired = await db
        .update(workspaceInvitations)
        .set({ status: "expired" })
        .where(
          and(
            eq(workspaceInvitations.status, "pending"),
            lt(workspaceInvitations.expiresAt, now)
          )
        )
        .returning();

      return expired.length;
    } catch (error) {
      throw new DatabaseError("Failed to expire old invitations", "expireOldInvitations");
    }
  }

  /**
   * Delete invitation by ID
   */
  async delete(id: number): Promise<void> {
    try {
      // First verify invitation exists
      const [existing] = await db
        .select()
        .from(workspaceInvitations)
        .where(eq(workspaceInvitations.id, id))
        .limit(1);

      if (!existing) {
        throw new NotFoundError("Invitation");
      }

      await db.delete(workspaceInvitations).where(eq(workspaceInvitations.id, id));
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError("Failed to delete invitation", "delete");
    }
  }
}
