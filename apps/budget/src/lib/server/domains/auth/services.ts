import { users, type UserPreferences } from "$lib/schema/users";
import { sessions, authAccounts } from "$lib/schema/auth";
import { db } from "$lib/server/shared/database";
import { AUTH_CONFIG } from "$lib/server/config/auth";
import { ValidationError, NotFoundError } from "$lib/server/shared/types/errors";
import { eq, and } from "drizzle-orm";
import { logger } from "$lib/server/shared/logging";
import { authRepository } from "./repository";
import { hashPassword } from "$lib/server/auth/password";

/**
 * Default user preferences
 */
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  dateFormat: "MM/DD/YYYY",
  currencySymbol: "$",
  numberFormat: "en-US",
  showCents: true,
  tableDisplayMode: "popover",
  theme: "zinc",
  customThemeColor: undefined,
  fontSize: "normal",
};

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: "weak" | "fair" | "strong";
}

/**
 * Password reset result
 */
export interface PasswordResetResult {
  token: string;
  expiresAt: Date;
  resetUrl: string;
}

/**
 * Auth domain service for authentication-related business logic
 */
export class AuthService {
  /**
   * Validate password strength
   */
  validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];

    // Check minimum length
    if (password.length < AUTH_CONFIG.PASSWORD.MIN_LENGTH) {
      errors.push(
        `Password must be at least ${AUTH_CONFIG.PASSWORD.MIN_LENGTH} characters`
      );
    }

    // Check maximum length
    if (password.length > AUTH_CONFIG.PASSWORD.MAX_LENGTH) {
      errors.push(
        `Password must be at most ${AUTH_CONFIG.PASSWORD.MAX_LENGTH} characters`
      );
    }

    // Check for lowercase letter
    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    // Check for uppercase letter
    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    // Check for number
    if (!/[0-9]/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    // Calculate strength
    let strength: "weak" | "fair" | "strong" = "weak";
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (errors.length === 0) {
      if (password.length >= 12 && hasSpecial) {
        strength = "strong";
      } else if (password.length >= 10 || hasSpecial) {
        strength = "fair";
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      strength,
    };
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<{
    id: string;
    displayName: string | null;
    email: string | null;
  } | null> {
    const [user] = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
      })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    return user || null;
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<{
    id: string;
    displayName: string | null;
    email: string | null;
    emailVerified: boolean | null;
    image: string | null;
    role: string | null;
  } | null> {
    const [user] = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
        emailVerified: users.emailVerified,
        image: users.image,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return user || null;
  }

  /**
   * Initiate password reset
   * Creates a verification token and returns the reset URL
   */
  async initiatePasswordReset(email: string): Promise<PasswordResetResult | null> {
    const user = await this.getUserByEmail(email);

    // Always log but don't reveal if user exists
    if (!user) {
      logger.info("Password reset requested for unknown email:", { email });
      return null;
    }

    // Delete any existing reset tokens for this user
    await authRepository.deleteVerificationsByIdentifier(email);

    // Create new verification token (expires in 1 hour)
    const verification = await authRepository.createVerification(
      email,
      "password_reset",
      60 // 60 minutes
    );

    const baseUrl = process.env.PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:5173";
    const resetUrl = `${baseUrl}/reset-password?token=${verification.token}`;

    logger.info("Password reset initiated:", {
      userId: user.id,
      email: user.email,
      expiresAt: verification.expiresAt,
    });

    return {
      token: verification.token,
      expiresAt: verification.expiresAt,
      resetUrl,
    };
  }

  /**
   * Reset password with token
   * Validates the token, updates the password, and invalidates sessions
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Validate new password
    const validation = this.validatePassword(newPassword);
    if (!validation.valid) {
      throw new ValidationError(validation.errors.join(". "));
    }

    // Find and validate the token
    const verification = await authRepository.findValidVerification(
      token,
      "password_reset"
    );

    if (!verification) {
      throw new ValidationError("Invalid or expired reset token");
    }

    // Get the user by email (identifier)
    const user = await this.getUserByEmail(verification.identifier);
    if (!user) {
      // This shouldn't happen, but handle it gracefully
      await authRepository.deleteVerification(verification.id);
      throw new ValidationError("User not found");
    }

    // Hash the new password
    const passwordHash = await hashPassword(newPassword);

    // Update the password in auth_account (where Better Auth stores credentials)
    await db
      .update(authAccounts)
      .set({
        password: passwordHash,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(authAccounts.userId, user.id),
          eq(authAccounts.providerId, "credential")
        )
      );

    // Delete the used verification token
    await authRepository.deleteVerification(verification.id);

    // Invalidate all user sessions for security
    await authRepository.deleteUserSessions(user.id);

    logger.info("Password reset completed:", {
      userId: user.id,
      email: user.email,
    });
  }

  /**
   * Check if email is already registered
   */
  async isEmailRegistered(email: string): Promise<boolean> {
    const user = await this.getUserByEmail(email);
    return user !== null;
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    userId: string,
    data: { displayName?: string; image?: string }
  ): Promise<void> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundError("User", userId);
    }

    await db
      .update(users)
      .set({
        displayName: data.displayName !== undefined ? data.displayName : user.displayName,
        image: data.image !== undefined ? data.image : user.image,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  /**
   * Clean up expired verification tokens
   */
  async cleanupExpiredVerifications(): Promise<number> {
    return authRepository.deleteExpiredVerifications();
  }

  /**
   * Get user preferences
   * Returns only explicitly saved preferences (not merged with defaults)
   * This allows the client to only override localStorage when backend has actual values
   */
  async getUserPreferences(userId: string): Promise<Partial<UserPreferences>> {
    const [user] = await db
      .select({ preferences: users.preferences })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundError("User", userId);
    }

    // Return only what's explicitly stored - don't merge with defaults
    // This allows client-side localStorage to take precedence for unset values
    if (!user.preferences) {
      return {};
    }

    try {
      return JSON.parse(user.preferences);
    } catch {
      logger.warn("Failed to parse user preferences:", { userId });
      return {};
    }
  }

  /**
   * Update user preferences (partial update)
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    const [user] = await db
      .select({ preferences: users.preferences })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundError("User", userId);
    }

    // Parse existing preferences
    let existingPrefs: Partial<UserPreferences> = {};
    if (user.preferences) {
      try {
        existingPrefs = JSON.parse(user.preferences);
      } catch {
        logger.warn("Failed to parse existing user preferences:", { userId });
      }
    }

    // Merge with new preferences
    const mergedPrefs = { ...existingPrefs, ...preferences };

    // Save to database
    await db
      .update(users)
      .set({
        preferences: JSON.stringify(mergedPrefs),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    logger.info("User preferences updated:", { userId });

    return { ...DEFAULT_USER_PREFERENCES, ...mergedPrefs };
  }
}
