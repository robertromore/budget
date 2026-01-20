/**
 * Field Encryption Service
 *
 * Provides field-level encryption for database columns using AES-256-GCM.
 * Uses the Data Encryption Key (DEK) from the key management service.
 */

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "crypto";
import type { EncryptionLevel } from "$lib/types/encryption";
import { ENCRYPTED_FIELDS_BY_LEVEL } from "$lib/types/encryption";
import { normalize } from "$lib/utils/string-utilities";

// Constants
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const ENCRYPTED_PREFIX = "enc:v1:"; // Version prefix for future compatibility

/**
 * Encrypt a field value using the provided DEK
 */
export function encryptField(value: string, dek: Buffer): string {
  if (!value) return value;

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, dek, iv);

  let encrypted = cipher.update(value, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const authTag = cipher.getAuthTag();

  // Format: prefix:iv:authTag:encrypted (all base64)
  return `${ENCRYPTED_PREFIX}${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

/**
 * Decrypt a field value using the provided DEK
 */
export function decryptField(encryptedValue: string, dek: Buffer): string {
  if (!encryptedValue || !encryptedValue.startsWith(ENCRYPTED_PREFIX)) {
    // Not encrypted or wrong format, return as-is
    return encryptedValue;
  }

  const withoutPrefix = encryptedValue.slice(ENCRYPTED_PREFIX.length);
  const [ivBase64, authTagBase64, encryptedBase64] = withoutPrefix.split(":");

  if (!ivBase64 || !authTagBase64 || !encryptedBase64) {
    throw new Error("Invalid encrypted field format");
  }

  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  const encrypted = Buffer.from(encryptedBase64, "base64");

  const decipher = createDecipheriv(ALGORITHM, dek, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString("utf8");
}

/**
 * Check if a value is encrypted
 */
export function isEncrypted(value: string | null | undefined): boolean {
  return value?.startsWith(ENCRYPTED_PREFIX) ?? false;
}

/**
 * Create a blind index (HMAC) for searchable encrypted fields
 * This allows exact-match search on encrypted fields
 */
export function createBlindIndex(value: string, dek: Buffer): string {
  return createHmac("sha256", dek)
    .update(normalize(value))
    .digest("hex");
}

/**
 * Check if a field should be encrypted at the given level
 */
export function shouldEncryptField(
  tableName: string,
  fieldName: string,
  level: EncryptionLevel
): boolean {
  if (level === 0) return false;

  const fieldsToEncrypt = ENCRYPTED_FIELDS_BY_LEVEL[level];

  // Level 4 encrypts everything
  if (fieldsToEncrypt.includes("*")) return true;

  const fullFieldName = `${tableName}.${fieldName}`;
  return fieldsToEncrypt.includes(fullFieldName);
}

/**
 * Get the list of fields that should be encrypted at a given level
 */
export function getEncryptedFields(level: EncryptionLevel): string[] {
  return ENCRYPTED_FIELDS_BY_LEVEL[level];
}

/**
 * Field encryption context for processing records
 */
export interface FieldEncryptionContext {
  dek: Buffer;
  level: EncryptionLevel;
  tableName: string;
}

/**
 * Encrypt specified fields in a record
 */
export function encryptRecord<T extends Record<string, unknown>>(
  record: T,
  context: FieldEncryptionContext
): T {
  if (context.level === 0) return record;

  const encrypted = { ...record };

  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "string" && shouldEncryptField(context.tableName, key, context.level)) {
      (encrypted as Record<string, unknown>)[key] = encryptField(value, context.dek);
    }
  }

  return encrypted;
}

/**
 * Decrypt specified fields in a record
 */
export function decryptRecord<T extends Record<string, unknown>>(
  record: T,
  context: FieldEncryptionContext
): T {
  if (context.level === 0) return record;

  const decrypted = { ...record };

  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "string" && isEncrypted(value)) {
      try {
        (decrypted as Record<string, unknown>)[key] = decryptField(value, context.dek);
      } catch {
        // If decryption fails, leave the value as-is
        console.warn(`Failed to decrypt field ${context.tableName}.${key}`);
      }
    }
  }

  return decrypted;
}

/**
 * Encrypt multiple records
 */
export function encryptRecords<T extends Record<string, unknown>>(
  records: T[],
  context: FieldEncryptionContext
): T[] {
  return records.map((record) => encryptRecord(record, context));
}

/**
 * Decrypt multiple records
 */
export function decryptRecords<T extends Record<string, unknown>>(
  records: T[],
  context: FieldEncryptionContext
): T[] {
  return records.map((record) => decryptRecord(record, context));
}

/**
 * Create blind indexes for searchable fields in a record
 */
export function createRecordBlindIndexes<T extends Record<string, unknown>>(
  record: T,
  context: FieldEncryptionContext,
  indexFields: string[]
): Record<string, string> {
  const indexes: Record<string, string> = {};

  for (const field of indexFields) {
    const value = record[field];
    if (typeof value === "string" && value.trim()) {
      indexes[`${field}_idx`] = createBlindIndex(value, context.dek);
    }
  }

  return indexes;
}

/**
 * Wrapper class for managing encryption in a session
 */
export class FieldEncryptionService {
  private dek: Buffer;
  private level: EncryptionLevel;

  constructor(dek: Buffer, level: EncryptionLevel) {
    this.dek = dek;
    this.level = level;
  }

  encrypt(value: string): string {
    if (this.level === 0) return value;
    return encryptField(value, this.dek);
  }

  decrypt(value: string): string {
    if (this.level === 0 || !isEncrypted(value)) return value;
    return decryptField(value, this.dek);
  }

  createIndex(value: string): string {
    return createBlindIndex(value, this.dek);
  }

  encryptRecord<T extends Record<string, unknown>>(record: T, tableName: string): T {
    return encryptRecord(record, { dek: this.dek, level: this.level, tableName });
  }

  decryptRecord<T extends Record<string, unknown>>(record: T, tableName: string): T {
    return decryptRecord(record, { dek: this.dek, level: this.level, tableName });
  }

  shouldEncrypt(tableName: string, fieldName: string): boolean {
    return shouldEncryptField(tableName, fieldName, this.level);
  }

  getLevel(): EncryptionLevel {
    return this.level;
  }
}

/**
 * Create a null encryption service for level 0 (no encryption)
 */
export function createNullEncryptionService(): FieldEncryptionService {
  // Use empty buffer for level 0 - methods will return values unchanged
  return new FieldEncryptionService(Buffer.alloc(32), 0);
}
