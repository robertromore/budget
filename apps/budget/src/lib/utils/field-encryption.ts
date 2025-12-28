/**
 * Client-Side Field Encryption Utilities
 *
 * Uses Web Crypto API to decrypt field data that was encrypted on the server.
 * The DEK (Data Encryption Key) is obtained via the encryption unlock flow.
 *
 * Encryption format: iv:authTag:encryptedData (hex encoded)
 * Algorithm: AES-256-GCM
 */

import { browser } from "$app/environment";

// =============================================================================
// Types
// =============================================================================

export interface EncryptedField {
  /** Whether this field is encrypted */
  isEncrypted: boolean;
  /** The encrypted or plaintext value */
  value: string;
}

// =============================================================================
// Constants
// =============================================================================

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;

// Prefix to identify encrypted fields
export const ENCRYPTED_PREFIX = "enc:";

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a string value is encrypted (has the encrypted prefix)
 */
export function isEncryptedValue(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.startsWith(ENCRYPTED_PREFIX);
}

/**
 * Convert a hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// =============================================================================
// Decryption
// =============================================================================

/**
 * Import a DEK (hex string) as a CryptoKey for AES-GCM
 */
async function importDek(dekHex: string): Promise<CryptoKey> {
  if (!browser) {
    throw new Error("Field decryption is only available in the browser");
  }

  const keyBytes = hexToBytes(dekHex);

  return crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: ALGORITHM, length: KEY_LENGTH },
    false, // not extractable
    ["decrypt"]
  );
}

/**
 * Decrypt a single encrypted field value using the DEK.
 *
 * @param encryptedValue - The encrypted value in format: enc:iv:authTag:encryptedData
 * @param dek - The Data Encryption Key (hex string from unlock flow)
 * @returns The decrypted plaintext value
 * @throws Error if decryption fails
 */
export async function decryptField(
  encryptedValue: string,
  dek: string
): Promise<string> {
  if (!browser) {
    throw new Error("Field decryption is only available in the browser");
  }

  // Remove the encrypted prefix
  if (!encryptedValue.startsWith(ENCRYPTED_PREFIX)) {
    // Not encrypted, return as-is
    return encryptedValue;
  }

  const encrypted = encryptedValue.slice(ENCRYPTED_PREFIX.length);
  const [ivHex, authTagHex, ciphertextHex] = encrypted.split(":");

  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error("Invalid encrypted field format");
  }

  const iv = hexToBytes(ivHex);
  const authTag = hexToBytes(authTagHex);
  const ciphertext = hexToBytes(ciphertextHex);

  // AES-GCM expects the auth tag appended to the ciphertext
  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext);
  combined.set(authTag, ciphertext.length);

  const key = await importDek(dek);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: iv.buffer as ArrayBuffer },
    key,
    combined.buffer as ArrayBuffer
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Decrypt multiple fields at once
 *
 * @param fields - Object with field names as keys and encrypted values as values
 * @param dek - The Data Encryption Key (hex string)
 * @returns Object with same keys but decrypted values
 */
export async function decryptFields<T extends Record<string, string | null>>(
  fields: T,
  dek: string
): Promise<T> {
  const result: Record<string, string | null> = {};

  for (const [key, value] of Object.entries(fields)) {
    if (value && isEncryptedValue(value)) {
      result[key] = await decryptField(value, dek);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

// =============================================================================
// Encryption (for client-side encryption before sending to server)
// =============================================================================

/**
 * Import a DEK for encryption
 */
async function importDekForEncryption(dekHex: string): Promise<CryptoKey> {
  if (!browser) {
    throw new Error("Field encryption is only available in the browser");
  }

  const keyBytes = hexToBytes(dekHex);

  return crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt"]
  );
}

/**
 * Encrypt a field value using the DEK.
 *
 * @param plaintext - The plaintext value to encrypt
 * @param dek - The Data Encryption Key (hex string)
 * @returns Encrypted value in format: enc:iv:authTag:encryptedData
 */
export async function encryptField(
  plaintext: string,
  dek: string
): Promise<string> {
  if (!browser) {
    throw new Error("Field encryption is only available in the browser");
  }

  const key = await importDekForEncryption(dek);

  // Generate random IV (12 bytes for AES-GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encoded = new TextEncoder().encode(plaintext);

  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv.buffer as ArrayBuffer },
    key,
    encoded.buffer as ArrayBuffer
  );

  // AES-GCM returns ciphertext + auth tag (16 bytes)
  const encryptedBytes = new Uint8Array(encrypted);
  const ciphertext = encryptedBytes.slice(0, -16);
  const authTag = encryptedBytes.slice(-16);

  return `${ENCRYPTED_PREFIX}${bytesToHex(iv)}:${bytesToHex(authTag)}:${bytesToHex(ciphertext)}`;
}

// =============================================================================
// Helpers for Components
// =============================================================================

/**
 * Safe decrypt that returns null on error instead of throwing.
 * Useful for optional fields that may or may not be encrypted.
 */
export async function safeDecryptField(
  value: string | null | undefined,
  dek: string | null
): Promise<string | null> {
  if (!value) return null;
  if (!dek) return value; // No DEK, return as-is (might be plaintext)
  if (!isEncryptedValue(value)) return value; // Not encrypted

  try {
    return await decryptField(value, dek);
  } catch (error) {
    console.error("Failed to decrypt field:", error);
    return null;
  }
}

/**
 * Get a display value for an encrypted field.
 * Returns placeholder text if the field is encrypted but no DEK is available.
 */
export function getEncryptedFieldDisplay(
  value: string | null | undefined,
  dek: string | null,
  placeholder = "🔒 Encrypted"
): string {
  if (!value) return "";
  if (!isEncryptedValue(value)) return value;
  if (!dek) return placeholder;

  // If we have a DEK but haven't decrypted yet, return placeholder
  // The component should handle async decryption
  return placeholder;
}
