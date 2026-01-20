import type { WorkspaceInvitation } from "$lib/schema/workspace-invitations";
import type { WorkspaceRole } from "$lib/schema/workspace-members";
import { users } from "$lib/schema/users";
import { workspaces } from "$lib/schema/workspaces";
import { db } from "$lib/server/shared/database";
import {
  ConflictError,
  ForbiddenError,
  ValidationError,
} from "$lib/server/shared/types/errors";
import { getCurrentTimestamp } from "$lib/utils/dates";
import { normalize } from "$lib/utils/string-utilities";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import {
  WorkspaceInvitationRepository,
  type InvitationWithDetails,
} from "./repository";
import { WorkspaceMemberRepository } from "../workspace-members/repository";
import { logger } from "$lib/server/shared/logging";
import { sendEmail } from "$lib/server/email";
import { workspaceInvitationEmail } from "$lib/server/email/templates";
import { env } from "$env/dynamic/private";

// Invitation expiry in days
const INVITATION_EXPIRY_DAYS = 7;

/**
 * Generate a secure random token for invitations
 */
function generateInvitationToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Calculate expiration date
 */
function calculateExpiryDate(days: number = INVITATION_EXPIRY_DAYS): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

/**
 * Workspace Invitations service containing business logic
 */
export class WorkspaceInvitationService {
  constructor(
    private invitationRepository: WorkspaceInvitationRepository,
    private memberRepository: WorkspaceMemberRepository
  ) {}

  /**
   * Create and send a workspace invitation
   */
  async createInvitation(
    workspaceId: number,
    email: string,
    role: "admin" | "editor" | "viewer",
    invitedBy: string,
    message?: string
  ): Promise<WorkspaceInvitation> {
    // Validate email
    const normalizedEmail = normalize(email);
    if (!this.isValidEmail(normalizedEmail)) {
      throw new ValidationError("Invalid email address");
    }

    // Validate role
    if (!["admin", "editor", "viewer"].includes(role)) {
      throw new ValidationError(`Invalid role: ${role}. Cannot invite as owner.`);
    }

    // Check if inviter has permission (must be owner or admin)
    const inviterMembership = await this.memberRepository.findMembership(
      workspaceId,
      invitedBy
    );
    if (!inviterMembership || !["owner", "admin"].includes(inviterMembership.role)) {
      throw new ForbiddenError("Only owners and admins can invite members");
    }

    // Check if email is already a member
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser) {
      const existingMembership = await this.memberRepository.findMembership(
        workspaceId,
        existingUser.id
      );
      if (existingMembership) {
        throw new ConflictError("User is already a member of this workspace");
      }
    }

    // Check if pending invitation already exists
    const pendingExists =
      await this.invitationRepository.existsPendingForEmailAndWorkspace(
        normalizedEmail,
        workspaceId
      );
    if (pendingExists) {
      throw new ConflictError(
        "A pending invitation already exists for this email"
      );
    }

    // Create invitation
    const token = generateInvitationToken();
    const expiresAt = calculateExpiryDate();

    const invitation = await this.invitationRepository.create({
      workspaceId,
      email: normalizedEmail,
      role,
      invitedBy,
      token,
      expiresAt,
      message,
    });

    // Send invitation email
    await this.sendInvitationEmail(invitation, token, invitedBy);

    return invitation;
  }

  /**
   * Accept an invitation
   */
  async acceptInvitation(
    token: string,
    userId: string
  ): Promise<{ membership: any; invitation: WorkspaceInvitation }> {
    const invitation = await this.invitationRepository.findByTokenOrThrow(token);

    // Validate invitation status
    if (invitation.status !== "pending") {
      throw new ValidationError(`Invitation has already been ${invitation.status}`);
    }

    // Check if expired
    if (new Date(invitation.expiresAt) < new Date()) {
      await this.invitationRepository.updateStatus(invitation.id, "expired");
      throw new ValidationError("Invitation has expired");
    }

    // Get accepting user's email
    const [acceptingUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!acceptingUser) {
      throw new ValidationError("User not found");
    }

    // Verify email matches (case insensitive)
    if (!acceptingUser.email || acceptingUser.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ForbiddenError(
        "This invitation was sent to a different email address"
      );
    }

    // Check if already a member
    const existingMembership = await this.memberRepository.findMembership(
      invitation.workspaceId,
      userId
    );
    if (existingMembership) {
      // Update invitation status and return existing membership
      await this.invitationRepository.updateStatus(
        invitation.id,
        "accepted",
        userId
      );
      throw new ConflictError("You are already a member of this workspace");
    }

    // Create membership
    const membership = await this.memberRepository.create({
      workspaceId: invitation.workspaceId,
      userId,
      role: invitation.role as WorkspaceRole,
      invitedBy: invitation.invitedBy,
      isDefault: false,
    });

    // Update invitation status
    const updatedInvitation = await this.invitationRepository.updateStatus(
      invitation.id,
      "accepted",
      userId
    );

    return { membership, invitation: updatedInvitation };
  }

  /**
   * Decline an invitation
   */
  async declineInvitation(token: string): Promise<WorkspaceInvitation> {
    const invitation = await this.invitationRepository.findByTokenOrThrow(token);

    // Validate invitation status
    if (invitation.status !== "pending") {
      throw new ValidationError(`Invitation has already been ${invitation.status}`);
    }

    return await this.invitationRepository.updateStatus(
      invitation.id,
      "declined"
    );
  }

  /**
   * Revoke an invitation (by workspace admin/owner)
   */
  async revokeInvitation(
    invitationId: number,
    requesterId: string,
    workspaceId: number
  ): Promise<WorkspaceInvitation> {
    // Check requester has permission
    const requesterMembership = await this.memberRepository.findMembership(
      workspaceId,
      requesterId
    );
    if (
      !requesterMembership ||
      !["owner", "admin"].includes(requesterMembership.role)
    ) {
      throw new ForbiddenError("Only owners and admins can revoke invitations");
    }

    return await this.invitationRepository.updateStatus(
      invitationId,
      "revoked"
    );
  }

  /**
   * Get invitation by token
   */
  async getInvitationByToken(token: string): Promise<InvitationWithDetails> {
    return await this.invitationRepository.findByTokenOrThrow(token);
  }

  /**
   * Get pending invitations for a workspace
   */
  async getWorkspaceInvitations(
    workspaceId: number
  ): Promise<InvitationWithDetails[]> {
    return await this.invitationRepository.findPendingByWorkspace(workspaceId);
  }

  /**
   * Get pending invitations for a user's email
   */
  async getUserPendingInvitations(
    userEmail: string
  ): Promise<InvitationWithDetails[]> {
    return await this.invitationRepository.findPendingByEmail(userEmail);
  }

  /**
   * Resend an invitation
   */
  async resendInvitation(
    invitationId: number,
    requesterId: string,
    workspaceId: number
  ): Promise<WorkspaceInvitation> {
    // Check requester has permission
    const requesterMembership = await this.memberRepository.findMembership(
      workspaceId,
      requesterId
    );
    if (
      !requesterMembership ||
      !["owner", "admin"].includes(requesterMembership.role)
    ) {
      throw new ForbiddenError("Only owners and admins can resend invitations");
    }

    // Get current invitation to get details
    const pending = await this.invitationRepository.findPendingByWorkspace(
      workspaceId
    );
    const invitation = pending.find((inv) => inv.id === invitationId);

    if (!invitation) {
      throw new ValidationError("Invitation not found or no longer pending");
    }

    // Delete old invitation
    await this.invitationRepository.delete(invitationId);

    // Create new invitation with fresh token and expiry
    const newInvitation = await this.invitationRepository.create({
      workspaceId: invitation.workspaceId,
      email: invitation.email,
      role: invitation.role as "admin" | "editor" | "viewer",
      invitedBy: requesterId,
      token: generateInvitationToken(),
      expiresAt: calculateExpiryDate(),
      message: invitation.message || undefined,
    });

    // Send email
    await this.sendInvitationEmail(newInvitation, newInvitation.token, requesterId);

    return newInvitation;
  }

  /**
   * Expire old invitations (run periodically)
   */
  async expireOldInvitations(): Promise<number> {
    return await this.invitationRepository.expireOldInvitations();
  }

  /**
   * Send invitation email
   */
  private async sendInvitationEmail(
    invitation: WorkspaceInvitation,
    token: string,
    inviterUserId: string
  ): Promise<void> {
    const baseUrl = env.BETTER_AUTH_URL || "http://localhost:5173";
    const inviteUrl = `${baseUrl}/invite/${token}`;

    // Get workspace and inviter details for the email
    const [workspace] = await db
      .select({ displayName: workspaces.displayName })
      .from(workspaces)
      .where(eq(workspaces.id, invitation.workspaceId))
      .limit(1);

    const [inviter] = await db
      .select({ displayName: users.displayName })
      .from(users)
      .where(eq(users.id, inviterUserId))
      .limit(1);

    const workspaceName = workspace?.displayName || "a workspace";
    const inviterName = inviter?.displayName || "Someone";

    // Generate email content
    const emailContent = workspaceInvitationEmail({
      workspaceName,
      inviterName,
      role: invitation.role,
      acceptUrl: inviteUrl,
      message: invitation.message || undefined,
    });

    // Send the email
    const result = await sendEmail({
      to: invitation.email,
      ...emailContent,
    });

    if (result.success) {
      logger.info("Workspace invitation email sent:", {
        email: invitation.email,
        workspaceId: invitation.workspaceId,
        role: invitation.role,
        inviteUrl,
        messageId: result.messageId,
      });
    } else {
      logger.error("Failed to send workspace invitation email:", {
        email: invitation.email,
        error: result.error,
      });
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
