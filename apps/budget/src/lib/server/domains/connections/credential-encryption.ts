import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { env } from "$env/dynamic/private";

/**
 * Credential Encryption Utility
 *
 * Provides encryption/decryption for sensitive credentials stored in the database.
 * Uses AES-256-GCM for authenticated encryption.
 *
 * The encryption key is derived from:
 * 1. The application's secret key (from environment)
 * 2. A workspace-specific salt (for isolation between workspaces)
 */

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Get the base secret key from environment
 */
function getBaseSecret(): string {
  const secret = env.ENCRYPTION_SECRET || env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "ENCRYPTION_SECRET or AUTH_SECRET must be set in environment for credential encryption"
    );
  }
  return secret;
}

/**
 * Derive a workspace-specific encryption key
 */
function deriveKey(workspaceSalt: string): Buffer {
  const baseSecret = getBaseSecret();
  // Use scrypt to derive a key from the base secret + workspace salt
  return scryptSync(baseSecret, workspaceSalt, KEY_LENGTH);
}

/**
 * Encrypt credentials for storage
 *
 * @param data - The credentials object to encrypt
 * @param workspaceId - Workspace ID for key derivation
 * @returns Encrypted string in format: iv:authTag:ciphertext (all base64)
 */
export function encryptCredentials(data: object, workspaceId: number): string {
  const workspaceSalt = `workspace-${workspaceId}-credentials`;
  const key = deriveKey(workspaceSalt);

  // Generate random IV
  const iv = randomBytes(IV_LENGTH);

  // Create cipher
  const cipher = createCipheriv(ALGORITHM, key, iv);

  // Encrypt the JSON data
  const jsonData = JSON.stringify(data);
  const encrypted = Buffer.concat([cipher.update(jsonData, "utf8"), cipher.final()]);

  // Get auth tag for GCM
  const authTag = cipher.getAuthTag();

  // Combine: iv:authTag:ciphertext (all base64 encoded)
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

/**
 * Decrypt credentials from storage
 *
 * @param encryptedData - The encrypted string from database
 * @param workspaceId - Workspace ID for key derivation
 * @returns The decrypted credentials object
 */
export function decryptCredentials<T = object>(encryptedData: string, workspaceId: number): T {
  const workspaceSalt = `workspace-${workspaceId}-credentials`;
  const key = deriveKey(workspaceSalt);

  // Parse the encrypted data
  const parts = encryptedData.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const iv = Buffer.from(parts[0], "base64");
  const authTag = Buffer.from(parts[1], "base64");
  const ciphertext = Buffer.from(parts[2], "base64");

  // Validate lengths
  if (iv.length !== IV_LENGTH) {
    throw new Error("Invalid IV length");
  }
  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error("Invalid auth tag length");
  }

  // Create decipher
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  // Decrypt
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  // Parse JSON
  return JSON.parse(decrypted.toString("utf8")) as T;
}

/**
 * Test if encrypted data can be decrypted
 * Useful for validation without exposing the actual credentials
 */
export function canDecrypt(encryptedData: string, workspaceId: number): boolean {
  try {
    decryptCredentials(encryptedData, workspaceId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Re-encrypt credentials with a new workspace ID
 * Used when migrating data between workspaces
 */
export function reEncryptCredentials(
  encryptedData: string,
  oldWorkspaceId: number,
  newWorkspaceId: number
): string {
  const decrypted = decryptCredentials(encryptedData, oldWorkspaceId);
  return encryptCredentials(decrypted, newWorkspaceId);
}
