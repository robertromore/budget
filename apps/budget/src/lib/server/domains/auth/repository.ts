import { verifications, sessions } from "$lib/schema/auth";
import { db } from "$lib/server/shared/database";
import { eq, lt, and } from "drizzle-orm";
import { randomBytes } from "crypto";

/**
 * Verification token types
 */
export type VerificationType = "password_reset" | "email_verification";

/**
 * Auth repository for verification tokens and session management
 */
export class AuthRepository {
  /**
   * Generate a secure random token
   */
  generateToken(): string {
    return randomBytes(32).toString("hex");
  }

  /**
   * Create a verification token
   */
  async createVerification(
    identifier: string,
    type: VerificationType,
    expiresInMinutes: number = 60
  ): Promise<{ id: string; token: string; expiresAt: Date }> {
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    // Store type in the value field as: type:token
    const value = `${type}:${token}`;

    const [verification] = await db
      .insert(verifications)
      .values({
        identifier: identifier.toLowerCase(),
        value,
        expiresAt, // Pass Date object directly - Drizzle handles conversion
      })
      .returning();

    return {
      id: verification.id,
      token,
      expiresAt,
    };
  }

  /**
   * Find a verification by token
   */
  async findVerification(
    token: string,
    type: VerificationType
  ): Promise<{
    id: string;
    identifier: string;
    expiresAt: Date;
  } | null> {
    const value = `${type}:${token}`;

    const [verification] = await db
      .select()
      .from(verifications)
      .where(eq(verifications.value, value))
      .limit(1);

    if (!verification) {
      return null;
    }

    return {
      id: verification.id,
      identifier: verification.identifier,
      expiresAt: verification.expiresAt, // Already a Date from Drizzle
    };
  }

  /**
   * Find a valid (non-expired) verification
   */
  async findValidVerification(
    token: string,
    type: VerificationType
  ): Promise<{
    id: string;
    identifier: string;
    expiresAt: Date;
  } | null> {
    const verification = await this.findVerification(token, type);

    if (!verification) {
      return null;
    }

    // Check if expired
    if (verification.expiresAt < new Date()) {
      // Delete expired token
      await this.deleteVerification(verification.id);
      return null;
    }

    return verification;
  }

  /**
   * Delete a verification by ID
   */
  async deleteVerification(id: string): Promise<void> {
    await db.delete(verifications).where(eq(verifications.id, id));
  }

  /**
   * Delete all verifications for an identifier
   */
  async deleteVerificationsByIdentifier(identifier: string): Promise<void> {
    await db
      .delete(verifications)
      .where(eq(verifications.identifier, identifier.toLowerCase()));
  }

  /**
   * Delete expired verifications (cleanup job)
   */
  async deleteExpiredVerifications(): Promise<number> {
    const now = new Date();
    const result = await db
      .delete(verifications)
      .where(lt(verifications.expiresAt, now))
      .returning();

    return result.length;
  }

  /**
   * Delete all sessions for a user
   */
  async deleteUserSessions(userId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }

  /**
   * Delete all sessions for a user except the current one
   */
  async deleteOtherUserSessions(
    userId: string,
    currentSessionToken: string
  ): Promise<void> {
    await db
      .delete(sessions)
      .where(
        and(
          eq(sessions.userId, userId),
          lt(sessions.token, currentSessionToken) // Not equal hack for SQLite
        )
      );
  }
}

// Export singleton instance
export const authRepository = new AuthRepository();
