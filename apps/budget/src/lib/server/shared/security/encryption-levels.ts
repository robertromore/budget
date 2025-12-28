/**
 * Encryption Level Utilities
 *
 * Provides utilities for managing encryption levels, resolving effective levels
 * from the three-tier hierarchy (User → Workspace → Account), and checking
 * feature availability.
 */

import type { EncryptionLevel, FeatureAvailability } from "$lib/types/encryption";
import {
  getFeatureAvailability,
  getEncryptionWarnings,
  resolveEffectiveLevel,
  ENCRYPTION_LEVELS,
  ENCRYPTION_LEVEL_NAMES,
  ENCRYPTION_LEVEL_DESCRIPTIONS,
} from "$lib/types/encryption";
import type { UserPreferences } from "$lib/schema/users";
import type { WorkspacePreferences } from "$lib/schema/workspaces";
import { parseAccountEncryptionLevel } from "$lib/schema/accounts";

/**
 * Context for resolving encryption level
 */
export interface EncryptionContext {
  userPreferences?: UserPreferences | null;
  workspacePreferences?: WorkspacePreferences | null;
  accountEncryptionLevel?: string | null;
}

/**
 * Result of encryption level resolution
 */
export interface ResolvedEncryptionLevel {
  level: EncryptionLevel;
  source: "user" | "workspace" | "account";
  features: FeatureAvailability;
  warnings: string[];
  requiresKey: boolean;
}

/**
 * Get the user's default encryption level from preferences
 */
export function getUserEncryptionLevel(preferences?: UserPreferences | null): EncryptionLevel {
  return preferences?.encryption?.defaultLevel ?? ENCRYPTION_LEVELS.NONE;
}

/**
 * Get the workspace encryption level, resolving "inherit" to user's level
 */
export function getWorkspaceEncryptionLevel(
  workspacePreferences?: WorkspacePreferences | null,
  userLevel: EncryptionLevel = ENCRYPTION_LEVELS.NONE
): EncryptionLevel {
  const workspaceLevel = workspacePreferences?.encryption?.level;
  if (!workspaceLevel || workspaceLevel === "inherit") {
    return userLevel;
  }
  return workspaceLevel;
}

/**
 * Get the account encryption level, resolving "inherit" to workspace's level
 * Account level can only INCREASE from workspace level (never decrease)
 */
export function getAccountEncryptionLevel(
  accountLevel?: string | null,
  workspaceLevel: EncryptionLevel = ENCRYPTION_LEVELS.NONE
): EncryptionLevel {
  const parsed = parseAccountEncryptionLevel(accountLevel);
  if (parsed === "inherit") {
    return workspaceLevel;
  }
  // Account can only increase encryption level
  return Math.max(parsed, workspaceLevel) as EncryptionLevel;
}

/**
 * Resolve the effective encryption level for an account within a workspace for a user
 * Follows the three-tier inheritance: User → Workspace → Account
 */
export function resolveEncryptionContext(context: EncryptionContext): ResolvedEncryptionLevel {
  // Get user's default level
  const userLevel = getUserEncryptionLevel(context.userPreferences);

  // Resolve workspace level (inherits from user if not set)
  const workspaceLevel = getWorkspaceEncryptionLevel(context.workspacePreferences, userLevel);

  // Resolve account level (inherits from workspace if not set, can only increase)
  const accountLevel = getAccountEncryptionLevel(context.accountEncryptionLevel, workspaceLevel);

  // Determine the source of the final level
  let source: "user" | "workspace" | "account" = "user";
  if (accountLevel > workspaceLevel) {
    source = "account";
  } else if (workspaceLevel > userLevel) {
    source = "workspace";
  }

  // Use the type-level function for final resolution
  const effectiveLevel = resolveEffectiveLevel(
    userLevel,
    context.workspacePreferences?.encryption?.level ?? "inherit",
    parseAccountEncryptionLevel(context.accountEncryptionLevel)
  );

  return {
    level: effectiveLevel,
    source,
    features: getFeatureAvailability(effectiveLevel),
    warnings: getEncryptionWarnings(effectiveLevel),
    requiresKey: effectiveLevel > ENCRYPTION_LEVELS.NONE,
  };
}

/**
 * Check if a specific feature is available at the given encryption level
 */
export function isFeatureEnabled(
  feature: keyof FeatureAvailability,
  level: EncryptionLevel
): boolean {
  const availability = getFeatureAvailability(level);
  return availability[feature] === "available";
}

/**
 * Check if a specific feature is limited (not fully available but not disabled)
 */
export function isFeatureLimited(
  feature: keyof FeatureAvailability,
  level: EncryptionLevel
): boolean {
  const availability = getFeatureAvailability(level);
  return availability[feature] === "limited";
}

/**
 * Check if a specific feature is completely disabled
 */
export function isFeatureDisabled(
  feature: keyof FeatureAvailability,
  level: EncryptionLevel
): boolean {
  const availability = getFeatureAvailability(level);
  return availability[feature] === "disabled";
}

/**
 * Get human-readable name for an encryption level
 */
export function getEncryptionLevelName(level: EncryptionLevel): string {
  return ENCRYPTION_LEVEL_NAMES[level];
}

/**
 * Get description for an encryption level
 */
export function getEncryptionLevelDescription(level: EncryptionLevel): string {
  return ENCRYPTION_LEVEL_DESCRIPTIONS[level];
}

/**
 * Validate that a level change is allowed
 * - Workspace level can go up or down
 * - Account level can only INCREASE from workspace (security constraint)
 */
export function validateLevelChange(
  currentLevel: EncryptionLevel,
  newLevel: EncryptionLevel,
  scope: "user" | "workspace" | "account",
  parentLevel?: EncryptionLevel
): { valid: boolean; reason?: string } {
  // Account level can only increase, not decrease
  if (scope === "account") {
    if (parentLevel !== undefined && newLevel < parentLevel) {
      return {
        valid: false,
        reason: `Account encryption level cannot be lower than workspace level (${getEncryptionLevelName(parentLevel)})`,
      };
    }
  }

  // Downgrading from level 4 (zero-knowledge) requires special confirmation
  if (currentLevel === ENCRYPTION_LEVELS.ZERO_KNOWLEDGE && newLevel < currentLevel) {
    return {
      valid: true,
      reason: "Downgrading from zero-knowledge mode. You will need to re-enter your encryption key to decrypt existing data.",
    };
  }

  return { valid: true };
}

/**
 * Get encryption level suitable for display in UI
 */
export interface EncryptionLevelOption {
  value: EncryptionLevel;
  label: string;
  description: string;
  features: FeatureAvailability;
  warnings: string[];
  recommended?: boolean;
  dangerous?: boolean;
}

/**
 * Get all encryption level options for UI selection
 */
export function getEncryptionLevelOptions(): EncryptionLevelOption[] {
  return [
    {
      value: ENCRYPTION_LEVELS.NONE,
      label: ENCRYPTION_LEVEL_NAMES[0],
      description: ENCRYPTION_LEVEL_DESCRIPTIONS[0],
      features: getFeatureAvailability(0),
      warnings: getEncryptionWarnings(0),
    },
    {
      value: ENCRYPTION_LEVELS.BASIC,
      label: ENCRYPTION_LEVEL_NAMES[1],
      description: ENCRYPTION_LEVEL_DESCRIPTIONS[1],
      features: getFeatureAvailability(1),
      warnings: getEncryptionWarnings(1),
      recommended: true,
    },
    {
      value: ENCRYPTION_LEVELS.ENHANCED_PII,
      label: ENCRYPTION_LEVEL_NAMES[2],
      description: ENCRYPTION_LEVEL_DESCRIPTIONS[2],
      features: getFeatureAvailability(2),
      warnings: getEncryptionWarnings(2),
    },
    {
      value: ENCRYPTION_LEVELS.FULL_FIELD,
      label: ENCRYPTION_LEVEL_NAMES[3],
      description: ENCRYPTION_LEVEL_DESCRIPTIONS[3],
      features: getFeatureAvailability(3),
      warnings: getEncryptionWarnings(3),
    },
    {
      value: ENCRYPTION_LEVELS.ZERO_KNOWLEDGE,
      label: ENCRYPTION_LEVEL_NAMES[4],
      description: ENCRYPTION_LEVEL_DESCRIPTIONS[4],
      features: getFeatureAvailability(4),
      warnings: getEncryptionWarnings(4),
      dangerous: true,
    },
  ];
}

// Re-export the types and constants for convenience
export {
  ENCRYPTION_LEVELS,
  ENCRYPTION_LEVEL_NAMES,
  ENCRYPTION_LEVEL_DESCRIPTIONS,
};
export type { EncryptionLevel, FeatureAvailability };
