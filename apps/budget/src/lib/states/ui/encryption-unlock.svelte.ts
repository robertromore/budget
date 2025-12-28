/**
 * Encryption Unlock State
 *
 * Manages the global encryption key unlock flow for accessing encrypted data.
 * Prompts users for their encryption key when needed and caches the DEK
 * based on user preference (never/session/device).
 */

import { browser } from "$app/environment";
import { trpc } from "$lib/trpc/client";
import type { EncryptionKeyType } from "$lib/types/encryption";

// =============================================================================
// Types
// =============================================================================

export interface UnlockContext {
  operation?: string;
  targetType?: "user" | "workspace" | "account";
  targetId?: string;
}

export type CachePreference = "never" | "session" | "device";

interface PendingRequest {
  resolve: (dek: string) => void;
  reject: (error: Error) => void;
  context?: UnlockContext;
}

// =============================================================================
// Cache Helpers
// =============================================================================

const STORAGE_KEY = "budget-encryption-session";

interface CachedKeyData {
  dek: string;
  keyType: EncryptionKeyType;
  targetType: string;
  targetId: string;
  cachedAt: string;
}

function cacheEncryptedKey(
  preference: "session" | "device",
  data: CachedKeyData
): void {
  if (!browser) return;

  const storage = preference === "session" ? sessionStorage : localStorage;
  storage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getCachedEncryptedKey(): CachedKeyData | null {
  if (!browser) return null;

  // Check sessionStorage first, then localStorage
  const sessionData = sessionStorage.getItem(STORAGE_KEY);
  if (sessionData) {
    try {
      return JSON.parse(sessionData);
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }

  const localData = localStorage.getItem(STORAGE_KEY);
  if (localData) {
    try {
      return JSON.parse(localData);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  return null;
}

function clearEncryptedKeyCache(): void {
  if (!browser) return;

  sessionStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_KEY);
}

// =============================================================================
// Core State
// =============================================================================

class EncryptionUnlockState {
  // Dialog visibility
  #isDialogOpen = $state(false);

  // Key state
  #isUnlocked = $state(false);
  #cachedDek = $state<string | null>(null);
  #keyType = $state<EncryptionKeyType | null>(null);

  // Pending unlock request (promise-based)
  #pendingRequest = $state<PendingRequest | null>(null);

  // UI state
  #errorMessage = $state<string | null>(null);
  #isVerifying = $state(false);

  // Context for the unlock request
  #unlockContext = $state<UnlockContext | null>(null);

  // ==========================================================================
  // Getters
  // ==========================================================================

  get isDialogOpen() {
    return this.#isDialogOpen;
  }

  get isUnlocked() {
    return this.#isUnlocked;
  }

  get errorMessage() {
    return this.#errorMessage;
  }

  get isVerifying() {
    return this.#isVerifying;
  }

  get keyType() {
    return this.#keyType;
  }

  get unlockContext() {
    return this.#unlockContext;
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize state from cached storage on app load
   */
  initialize(): void {
    if (!browser) return;

    const cached = getCachedEncryptedKey();
    if (cached) {
      this.#cachedDek = cached.dek;
      this.#keyType = cached.keyType;
      this.#isUnlocked = true;
    }
  }

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Request encryption key unlock. Returns a promise that resolves with the DEK.
   * If the DEK is already cached, returns immediately.
   * Otherwise, opens the unlock dialog and waits for user input.
   */
  async requestUnlock(context?: UnlockContext): Promise<string> {
    // Check memory cache first
    if (this.#cachedDek) {
      return this.#cachedDek;
    }

    // Check storage cache
    const cached = getCachedEncryptedKey();
    if (cached) {
      this.#cachedDek = cached.dek;
      this.#keyType = cached.keyType;
      this.#isUnlocked = true;
      return cached.dek;
    }

    // Open dialog and wait for user
    return new Promise((resolve, reject) => {
      this.#pendingRequest = { resolve, reject, context };
      this.#unlockContext = context ?? null;
      this.#errorMessage = null;
      this.#isDialogOpen = true;
    });
  }

  /**
   * Submit the encryption key for verification.
   * Called from the unlock dialog when user enters their key.
   */
  async submitKey(
    userKey: string,
    cachePreference: CachePreference
  ): Promise<void> {
    this.#isVerifying = true;
    this.#errorMessage = null;

    const targetType = this.#unlockContext?.targetType ?? "user";
    const targetId = this.#unlockContext?.targetId;

    try {
      const result = await trpc().securityRoutes.unlockEncryptionKey.mutate({
        userKey,
        targetType,
        targetId,
      });

      // Cache in memory
      this.#cachedDek = result.dek;
      this.#keyType = result.keyType as EncryptionKeyType;
      this.#isUnlocked = true;

      // Cache in storage if preference allows
      if (cachePreference !== "never") {
        cacheEncryptedKey(cachePreference, {
          dek: result.dek,
          keyType: result.keyType as EncryptionKeyType,
          targetType,
          targetId: targetId ?? "",
          cachedAt: new Date().toISOString(),
        });
      }

      // Resolve pending request
      this.#pendingRequest?.resolve(result.dek);
      this.#pendingRequest = null;

      // Close dialog
      this.#isDialogOpen = false;
      this.#unlockContext = null;
    } catch (error) {
      this.#errorMessage =
        error instanceof Error ? error.message : "Invalid encryption key";
    } finally {
      this.#isVerifying = false;
    }
  }

  /**
   * Close the unlock dialog without unlocking.
   * Rejects any pending unlock request.
   */
  closeDialog(): void {
    this.#isDialogOpen = false;

    if (this.#pendingRequest) {
      this.#pendingRequest.reject(new Error("USER_CANCELLED"));
      this.#pendingRequest = null;
    }

    this.#unlockContext = null;
    this.#errorMessage = null;
  }

  /**
   * Clear cached encryption key.
   * Call this on logout or when user wants to lock their data.
   */
  clearCachedKey(): void {
    this.#cachedDek = null;
    this.#keyType = null;
    this.#isUnlocked = false;
    clearEncryptedKeyCache();
  }

  /**
   * Check if there's a cached DEK available without prompting.
   */
  hasCachedKey(): boolean {
    if (this.#cachedDek) return true;

    const cached = getCachedEncryptedKey();
    return cached !== null;
  }

  /**
   * Get the cached DEK without prompting.
   * Returns null if not cached.
   */
  getCachedDek(): string | null {
    if (this.#cachedDek) return this.#cachedDek;

    const cached = getCachedEncryptedKey();
    if (cached) {
      this.#cachedDek = cached.dek;
      this.#keyType = cached.keyType;
      this.#isUnlocked = true;
      return cached.dek;
    }

    return null;
  }

  /**
   * Clear any error message
   */
  clearError(): void {
    this.#errorMessage = null;
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const encryptionUnlock = new EncryptionUnlockState();

/**
 * Convenience function to request encryption unlock from anywhere in the app.
 * Returns a promise that resolves with the DEK when unlocked.
 *
 * @example
 * ```typescript
 * const dek = await requestEncryptionUnlock({
 *   operation: 'View transaction notes'
 * });
 * const decrypted = decryptField(encryptedData, dek);
 * ```
 */
export function requestEncryptionUnlock(
  context?: UnlockContext
): Promise<string> {
  return encryptionUnlock.requestUnlock(context);
}

/**
 * Clear the encryption key cache.
 * Call this on logout.
 */
export function clearEncryptionCache(): void {
  encryptionUnlock.clearCachedKey();
}
