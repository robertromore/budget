/**
 * API Key Encryption Utilities
 *
 * Provides secure encryption/decryption for storing API keys in the database.
 * Uses AES-256-GCM with authenticated encryption to prevent tampering.
 */

import { env } from "$env/dynamic/private";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

/**
 * Get encryption key from environment or generate fallback for development.
 * In production, LLM_ENCRYPTION_KEY MUST be set.
 */
function getEncryptionKey(): Buffer {
  const envKey = env.LLM_ENCRYPTION_KEY;

  if (!envKey) {
    console.warn("LLM_ENCRYPTION_KEY not set. Using fallback key. NOT SECURE FOR PRODUCTION.");
    // Fallback for development only
    return scryptSync("development-fallback-key", "dev-salt", KEY_LENGTH);
  }

  // Derive key from environment variable using scrypt
  const salt = env.LLM_ENCRYPTION_SALT || "budget-app-salt";
  return scryptSync(envKey, salt, KEY_LENGTH);
}

/**
 * Encrypt an API key for database storage.
 *
 * @param apiKey - The plaintext API key to encrypt
 * @returns Encrypted string in format: iv:authTag:encryptedData (hex encoded)
 */
export function encryptApiKey(apiKey: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(apiKey, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encryptedData (all hex encoded)
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt an API key from database storage.
 *
 * @param encryptedData - The encrypted string from encryptApiKey
 * @returns The original plaintext API key
 * @throws Error if decryption fails or data is tampered
 */
export function decryptApiKey(encryptedData: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, encrypted] = encryptedData.split(":");

  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error("Invalid encrypted data format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Mask an API key for safe display (show first 4 and last 4 chars).
 *
 * @param apiKey - The API key to mask
 * @returns Masked version like "sk-a...xyz"
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) {
    return "****";
  }
  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
}

/**
 * Validate API key format for different providers.
 *
 * @param provider - The LLM provider name
 * @param apiKey - The API key to validate
 * @returns true if the format is valid for the provider
 */
export function validateApiKeyFormat(provider: string, apiKey: string): boolean {
  if (!apiKey || apiKey.trim().length === 0) {
    return false;
  }

  switch (provider) {
    case "openai":
      return apiKey.startsWith("sk-") && apiKey.length > 20;
    case "anthropic":
      return apiKey.startsWith("sk-ant-") && apiKey.length > 20;
    case "google":
      return apiKey.length > 20; // Google API keys have variable format
    case "ollama":
      return true; // Ollama doesn't require API key
    default:
      return false;
  }
}
