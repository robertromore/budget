/**
 * Reactive Encryption Helper
 *
 * Provides reactive utilities for components that need to display or edit
 * encrypted data. Integrates with workspace encryption settings and the
 * encryption unlock flow.
 */

import { currentWorkspace } from "$lib/states/current-workspace.svelte";
import {
  encryptionUnlock,
  requestEncryptionUnlock,
  type UnlockContext,
} from "$lib/states/ui/encryption-unlock.svelte";
import {
  ENCRYPTED_FIELDS_BY_LEVEL,
  ENCRYPTION_LEVELS,
  type EncryptionLevel,
} from "$lib/types/encryption";
import {
  decryptField,
  encryptField,
  isEncryptedValue,
  safeDecryptField,
} from "./field-encryption";

// =============================================================================
// Reactive Getters
// =============================================================================

/**
 * Get the current workspace encryption level.
 * Returns 0 if no encryption is configured.
 */
export function getEncryptionLevel(): EncryptionLevel {
  const workspace = currentWorkspace.get();
  if (!workspace?.preferences?.encryption) {
    return ENCRYPTION_LEVELS.NONE;
  }

  const level = workspace.preferences.encryption.level;

  // Handle "inherit" - for now, default to 0 (no encryption)
  // In a full implementation, we'd look up the user's default level
  if (level === "inherit") {
    return ENCRYPTION_LEVELS.NONE;
  }

  return level;
}

/**
 * Check if encryption is enabled for the current workspace
 */
export function isEncryptionEnabled(): boolean {
  return getEncryptionLevel() > 0;
}

/**
 * Check if a specific field should be encrypted at the current level
 *
 * @param fieldPath - Full field path like "transactions.notes" or "payees.name"
 */
export function isFieldEncrypted(fieldPath: string): boolean {
  const level = getEncryptionLevel();
  if (level === 0) return false;

  const encryptedFields = ENCRYPTED_FIELDS_BY_LEVEL[level];

  // Level 4 encrypts everything
  if (encryptedFields.includes("*")) return true;

  return encryptedFields.includes(fieldPath);
}

/**
 * Check if a value is currently encrypted (has the enc: prefix)
 */
export { isEncryptedValue };

// =============================================================================
// Decryption Helpers
// =============================================================================

/**
 * Get the cached DEK if available, or null if unlock is needed
 */
export function getCachedDek(): string | null {
  return encryptionUnlock.getCachedDek();
}

/**
 * Check if we have a cached DEK available
 */
export function hasCachedDek(): boolean {
  return encryptionUnlock.hasCachedKey();
}

/**
 * Request unlock if needed and get the DEK.
 * Shows the unlock dialog if no DEK is cached.
 *
 * @param context - Optional context describing the operation
 * @returns The DEK hex string
 */
export async function requestUnlock(context?: UnlockContext): Promise<string> {
  return requestEncryptionUnlock(context);
}

/**
 * Decrypt a field value. Requests unlock if needed.
 *
 * @param value - The encrypted value
 * @param context - Optional context for the unlock dialog
 * @returns The decrypted value, or the original if not encrypted
 */
export async function decryptFieldValue(
  value: string | null | undefined,
  context?: UnlockContext
): Promise<string | null> {
  if (!value) return null;
  if (!isEncryptedValue(value)) return value;

  const dek = await requestUnlock(context);
  return decryptField(value, dek);
}

/**
 * Decrypt a field value silently (no unlock prompt).
 * Returns the original value if no DEK is available.
 */
export async function decryptFieldSilent(
  value: string | null | undefined
): Promise<string | null> {
  const dek = getCachedDek();
  return safeDecryptField(value, dek);
}

/**
 * Encrypt a field value for storage.
 *
 * @param value - The plaintext value
 * @param context - Optional context for the unlock dialog
 * @returns The encrypted value
 */
export async function encryptFieldValue(
  value: string,
  context?: UnlockContext
): Promise<string> {
  // Check if encryption is enabled
  if (!isEncryptionEnabled()) {
    return value;
  }

  const dek = await requestUnlock(context);
  return encryptField(value, dek);
}

// =============================================================================
// Svelte 5 Reactive State for Components
// =============================================================================

/**
 * Creates reactive encryption state for a component.
 * Use this to create $derived values for encrypted fields.
 *
 * @example
 * ```svelte
 * <script>
 *   import { createEncryptedFieldState } from '$lib/utils/use-encryption.svelte';
 *
 *   let { transaction } = $props();
 *
 *   const notesState = createEncryptedFieldState(
 *     () => transaction.notes,
 *     { operation: 'View transaction notes' }
 *   );
 * </script>
 *
 * {#if notesState.isLoading}
 *   <span>Decrypting...</span>
 * {:else if notesState.error}
 *   <span class="text-red-500">{notesState.error}</span>
 * {:else}
 *   <span>{notesState.value ?? ''}</span>
 * {/if}
 * ```
 */
export function createEncryptedFieldState(
  getValue: () => string | null | undefined,
  context?: UnlockContext
) {
  let decryptedValue = $state<string | null>(null);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let lastRawValue: string | null | undefined = undefined;

  // Effect to handle decryption when value changes
  $effect(() => {
    const rawValue = getValue();

    // Skip if value hasn't changed
    if (rawValue === lastRawValue) return;
    lastRawValue = rawValue;

    // Not encrypted or null
    if (!rawValue || !isEncryptedValue(rawValue)) {
      decryptedValue = rawValue ?? null;
      isLoading = false;
      error = null;
      return;
    }

    // Check for cached DEK first (synchronous)
    const cachedDek = getCachedDek();
    if (cachedDek) {
      // Decrypt asynchronously but we have the key
      isLoading = true;
      decryptField(rawValue, cachedDek)
        .then((result) => {
          decryptedValue = result;
          error = null;
        })
        .catch((e) => {
          error = e.message;
          decryptedValue = null;
        })
        .finally(() => {
          isLoading = false;
        });
      return;
    }

    // No cached DEK - show placeholder, don't auto-prompt
    // User must click to decrypt
    decryptedValue = null;
    isLoading = false;
    error = "Unlock required";
  });

  return {
    get value() {
      return decryptedValue;
    },
    get isLoading() {
      return isLoading;
    },
    get error() {
      return error;
    },
    get needsUnlock() {
      const rawValue = getValue();
      return isEncryptedValue(rawValue) && !getCachedDek();
    },
    get isEncrypted() {
      return isEncryptedValue(getValue());
    },
    async unlock() {
      const rawValue = getValue();
      if (!rawValue || !isEncryptedValue(rawValue)) {
        return rawValue ?? null;
      }

      isLoading = true;
      error = null;

      try {
        const dek = await requestUnlock(context);
        const result = await decryptField(rawValue, dek);
        decryptedValue = result;
        return result;
      } catch (e) {
        if (e instanceof Error && e.message === "USER_CANCELLED") {
          error = null;
        } else {
          error = e instanceof Error ? e.message : "Decryption failed";
        }
        return null;
      } finally {
        isLoading = false;
      }
    },
  };
}

/**
 * Simple helper for displaying encrypted fields.
 * Returns placeholder text if encrypted and not unlocked.
 *
 * @param value - The field value (possibly encrypted)
 * @param placeholder - Placeholder to show if encrypted but not unlocked
 */
export function displayEncryptedField(
  value: string | null | undefined,
  placeholder = "🔒 Encrypted"
): string {
  if (!value) return "";
  if (!isEncryptedValue(value)) return value;

  const dek = getCachedDek();
  if (!dek) return placeholder;

  // If we have a DEK, the component should use createEncryptedFieldState
  // for proper async handling. This is just for quick display.
  return placeholder;
}
