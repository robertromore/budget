/**
 * Security Query Layer
 *
 * Query and mutation factories for security settings,
 * encryption keys, and trusted devices.
 */

import { trpc } from "$lib/trpc/client";
import type { EncryptionLevel, EncryptionKeyType } from "$lib/types/encryption";
import { cachePatterns } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

// ============================================================================
// Query Keys
// ============================================================================

export const securityKeys = createQueryKeys("security", {
  encryptionLevelOptions: () => ["security", "encryptionLevelOptions"] as const,
  userPreferences: () => ["security", "userPreferences"] as const,
  workspaceEncryption: (workspaceId: number) =>
    ["security", "workspaceEncryption", workspaceId] as const,
  accountEncryption: (accountId: number) =>
    ["security", "accountEncryption", accountId] as const,
  trustedDevices: () => ["security", "trustedDevices"] as const,
  riskScore: () => ["security", "riskScore"] as const,
  effectiveLevel: (workspaceId?: number, accountId?: number) =>
    ["security", "effectiveLevel", workspaceId ?? null, accountId ?? null] as const,
});

// ============================================================================
// Types
// ============================================================================

interface EncryptionLevelOption {
  value: EncryptionLevel;
  label: string;
  description: string;
  warnings: string[];
  features: Record<string, "available" | "limited" | "disabled">;
  recommended?: boolean;
  dangerous?: boolean;
}

interface UserEncryptionPreferences {
  encryption: {
    defaultLevel?: EncryptionLevel;
    keyType?: EncryptionKeyType;
    riskFactorsEnabled?: boolean;
    riskFactors?: {
      ip: boolean;
      location: boolean;
      device: boolean;
      timePattern: boolean;
    };
    challengeThreshold?: number;
    keyStoragePreference?: "never" | "session" | "device";
  };
  hasEncryptionKey: boolean;
}

interface TrustedDevice {
  id: number;
  label: string | null;
  trustScore: number;
  lastSeenAt: string;
  explicitlyTrusted: boolean;
}

interface RiskScore {
  total: number;
  action: "allow" | "challenge" | "deny";
  factors: Array<{
    name: string;
    score: number;
    weight: number;
    details: string;
  }>;
}

// ============================================================================
// Encryption Level Options
// ============================================================================

export const getEncryptionLevelOptions = () =>
  defineQuery<EncryptionLevelOption[]>({
    queryKey: securityKeys.encryptionLevelOptions(),
    queryFn: () => trpc().securityRoutes.getEncryptionLevelOptions.query(),
    options: {
      staleTime: Infinity, // Static data
    },
  });

// ============================================================================
// User Encryption Preferences
// ============================================================================

export const getUserEncryptionPreferences = () =>
  defineQuery<UserEncryptionPreferences>({
    queryKey: securityKeys.userPreferences(),
    queryFn: () => trpc().securityRoutes.getUserEncryptionPreferences.query(),
  });

export const updateUserEncryptionPreferences = defineMutation<
  {
    defaultLevel: EncryptionLevel;
    riskFactorsEnabled: boolean;
    riskFactors?: {
      ip: boolean;
      location: boolean;
      device: boolean;
      timePattern: boolean;
    };
    challengeThreshold?: number;
    keyStoragePreference?: "never" | "session" | "device";
  },
  { success: boolean }
>({
  mutationFn: (input) =>
    trpc().securityRoutes.updateUserEncryptionPreferences.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(securityKeys.userPreferences());
  },
  successMessage: "Security preferences updated",
  errorMessage: "Failed to update security preferences",
});

// ============================================================================
// Encryption Key Management
// ============================================================================

export const generateUserEncryptionKey = defineMutation<
  {
    keyType: EncryptionKeyType;
    passphrase?: string;
  },
  {
    success: boolean;
    userKey: string;
    keyType: EncryptionKeyType;
    maskedKey: string;
    message: string;
  }
>({
  mutationFn: (input) =>
    trpc().securityRoutes.generateUserEncryptionKey.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(securityKeys.userPreferences());
  },
  errorMessage: "Failed to generate encryption key",
});

export const verifyEncryptionKey = defineMutation<
  { userKey: string },
  { success: boolean; keyType: EncryptionKeyType; keyVersion: number }
>({
  mutationFn: (input) => trpc().securityRoutes.verifyEncryptionKey.mutate(input),
  errorMessage: "Invalid encryption key",
});

export const unlockEncryptionKey = defineMutation<
  {
    userKey: string;
    targetType?: "user" | "workspace" | "account";
    targetId?: string;
  },
  { success: boolean; dek: string; keyType: string; keyVersion: number }
>({
  mutationFn: (input) => trpc().securityRoutes.unlockEncryptionKey.mutate(input),
  errorMessage: "Invalid encryption key",
});

export const rotateUserEncryptionKey = defineMutation<
  {
    oldUserKey: string;
    newKeyType: EncryptionKeyType;
    newPassphrase?: string;
  },
  {
    success: boolean;
    userKey: string;
    keyType: EncryptionKeyType;
    maskedKey: string;
    message: string;
  }
>({
  mutationFn: (input) =>
    trpc().securityRoutes.rotateUserEncryptionKey.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(securityKeys.userPreferences());
  },
  successMessage: "Encryption key rotated successfully",
  errorMessage: "Failed to rotate encryption key",
});

// ============================================================================
// Workspace Encryption Settings
// ============================================================================

export const getWorkspaceEncryptionSettings = (workspaceId: number) =>
  defineQuery<{
    encryption: {
      level: EncryptionLevel | "inherit";
      riskFactors?: {
        ip: boolean;
        location: boolean;
        device: boolean;
        timePattern: boolean;
      };
      challengeThreshold?: number;
    };
    hasEncryptionKey: boolean;
  }>({
    queryKey: securityKeys.workspaceEncryption(workspaceId),
    queryFn: () =>
      trpc().securityRoutes.getWorkspaceEncryptionSettings.query({ workspaceId }),
  });

export const updateWorkspaceEncryptionSettings = defineMutation<
  {
    workspaceId: number;
    level: EncryptionLevel | "inherit";
    riskFactors?: {
      ip: boolean;
      location: boolean;
      device: boolean;
      timePattern: boolean;
    };
    challengeThreshold?: number;
  },
  { success: boolean }
>({
  mutationFn: (input) =>
    trpc().securityRoutes.updateWorkspaceEncryptionSettings.mutate(input),
  onSuccess: (_data, variables) => {
    cachePatterns.invalidatePrefix(
      securityKeys.workspaceEncryption(variables.workspaceId)
    );
  },
  successMessage: "Workspace encryption settings updated",
  errorMessage: "Failed to update workspace encryption settings",
});

// ============================================================================
// Account Encryption Settings
// ============================================================================

export const getAccountEncryptionSettings = (accountId: number) =>
  defineQuery<{
    encryptionLevel: string;
    hasEncryptionKey: boolean;
  }>({
    queryKey: securityKeys.accountEncryption(accountId),
    queryFn: () =>
      trpc().securityRoutes.getAccountEncryptionSettings.query({ accountId }),
  });

export const updateAccountEncryptionSettings = defineMutation<
  {
    accountId: number;
    encryptionLevel: "inherit" | "0" | "1" | "2" | "3" | "4";
  },
  { success: boolean }
>({
  mutationFn: (input) =>
    trpc().securityRoutes.updateAccountEncryptionSettings.mutate(input),
  onSuccess: (_data, variables) => {
    cachePatterns.invalidatePrefix(
      securityKeys.accountEncryption(variables.accountId)
    );
  },
  successMessage: "Account encryption settings updated",
  errorMessage: "Failed to update account encryption settings",
});

// ============================================================================
// Trusted Devices
// ============================================================================

export const getTrustedDevices = () =>
  defineQuery<TrustedDevice[]>({
    queryKey: securityKeys.trustedDevices(),
    queryFn: () => trpc().securityRoutes.getTrustedDevices.query(),
  });

export const trustCurrentDevice = defineMutation<
  { deviceFingerprint: string; label?: string },
  { success: boolean }
>({
  mutationFn: (input) => trpc().securityRoutes.trustCurrentDevice.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(securityKeys.trustedDevices());
  },
  successMessage: "Device trusted successfully",
  errorMessage: "Failed to trust device",
});

export const revokeDeviceTrust = defineMutation<
  { deviceId: number },
  { success: boolean }
>({
  mutationFn: (input) => trpc().securityRoutes.revokeDeviceTrust.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(securityKeys.trustedDevices());
  },
  successMessage: "Device trust revoked",
  errorMessage: "Failed to revoke device trust",
});

// ============================================================================
// Risk Assessment
// ============================================================================

export const getCurrentRiskScore = (input: {
  ipAddress: string;
  userAgent: string;
  geoLocation?: string;
  deviceFingerprint?: string;
  localHour?: number;
  dayOfWeek?: number;
}) =>
  defineQuery<RiskScore>({
    queryKey: securityKeys.riskScore(),
    queryFn: () => trpc().securityRoutes.getCurrentRiskScore.query(input),
    options: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  });

// ============================================================================
// Effective Encryption Level
// ============================================================================

export const getEffectiveEncryptionLevel = (input: {
  workspaceId?: number;
  accountId?: number;
}) =>
  defineQuery<{
    level: EncryptionLevel;
    levelName: string;
    source: "user" | "workspace" | "account";
    features: Record<string, "available" | "limited" | "disabled">;
    warnings: string[];
    requiresKey: boolean;
  }>({
    queryKey: securityKeys.effectiveLevel(input.workspaceId, input.accountId),
    queryFn: () =>
      trpc().securityRoutes.getEffectiveEncryptionLevel.query(input),
  });
