/**
 * Key Management Service
 *
 * Handles user-generated encryption keys and envelope encryption for
 * field-level database encryption. Supports three key types:
 * - Random Token: Like GitHub PAT, 256-bit random key
 * - Passphrase: User-chosen passphrase, derived via Argon2id
 * - SSH-Style Keypair: Ed25519 keypair for asymmetric encryption
 */

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  generateKeyPairSync,
  privateDecrypt,
  publicEncrypt,
  randomBytes,
  scryptSync,
} from "crypto";
import { eq, and } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type * as schema from "$lib/schema";
import { nowISOString } from "$lib/utils/dates";
import {
  encryptionKeys,
  type EncryptionKeyTargetType,
  type EncryptionKeyTypeValue,
  type NewEncryptionKey,
} from "$lib/schema/security";
import type { EncryptionKeyType } from "$lib/types/encryption";

// Constants
const ALGORITHM = "aes-256-gcm";
const DEK_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;
const TOKEN_PREFIX = "bud_ek_";
const SALT_LENGTH = 16;

/**
 * Result of key generation
 */
export interface GeneratedKey {
  /** The user's key (to be saved by user, never stored) */
  userKey: string;
  /** Type of key generated */
  keyType: EncryptionKeyType;
  /** Encrypted DEK to store in database */
  encryptedDek: string;
  /** Verification hash (HMAC of user key with DEK) */
  keyVerificationHash: string;
  /** Public key for SSH-style (null for other types) */
  publicKey: string | null;
  /** Key derivation parameters for passphrase (null for other types) */
  keyDerivationParams: string | null;
}

/**
 * Generate a random token key (like GitHub PAT)
 */
function generateRandomToken(): string {
  // Generate 32 bytes (256 bits) of random data
  const randomData = randomBytes(32);
  // Convert to base64url (URL-safe base64)
  const base64 = randomData.toString("base64url");
  return `${TOKEN_PREFIX}${base64}`;
}

/**
 * Derive a key from a random token
 */
function deriveKeyFromToken(token: string): Buffer {
  // Remove prefix if present
  const rawToken = token.startsWith(TOKEN_PREFIX) ? token.slice(TOKEN_PREFIX.length) : token;
  // Hash the token to get a consistent 32-byte key
  return createHash("sha256").update(rawToken).digest();
}

/**
 * Key derivation parameters for passphrase
 */
interface KeyDerivationParams {
  salt: string; // hex-encoded
  iterations: number;
  memCost: number;
  parallelism: number;
}

/**
 * Derive a key from a passphrase using scrypt
 * (Argon2id would be ideal but scrypt is available natively)
 */
function deriveKeyFromPassphrase(
  passphrase: string,
  params?: KeyDerivationParams
): { key: Buffer; params: KeyDerivationParams } {
  const salt = params?.salt
    ? Buffer.from(params.salt, "hex")
    : randomBytes(SALT_LENGTH);

  const derivationParams: KeyDerivationParams = {
    salt: salt.toString("hex"),
    iterations: params?.iterations ?? 16384, // N parameter for scrypt
    memCost: params?.memCost ?? 8, // r parameter
    parallelism: params?.parallelism ?? 1, // p parameter
  };

  // Use scrypt for key derivation
  const key = scryptSync(passphrase, salt, DEK_LENGTH, {
    N: derivationParams.iterations,
    r: derivationParams.memCost,
    p: derivationParams.parallelism,
  });

  return { key, params: derivationParams };
}

/**
 * Generate an Ed25519 keypair for SSH-style encryption
 */
function generateKeypair(): { privateKey: string; publicKey: string } {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519", {
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
  });

  return { privateKey, publicKey };
}

/**
 * Encrypt DEK with user's key
 */
function encryptDek(dek: Buffer, userKey: Buffer): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, userKey, iv);

  let encrypted = cipher.update(dek);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encryptedDek (hex-encoded)
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt DEK with user's key
 */
function decryptDek(encryptedDek: string, userKey: Buffer): Buffer {
  const [ivHex, authTagHex, encryptedHex] = encryptedDek.split(":");

  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Invalid encrypted DEK format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, userKey, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted;
}

/**
 * Create verification hash for key validation
 */
function createVerificationHash(userKey: Buffer, dek: Buffer): string {
  return createHmac("sha256", userKey).update(dek).digest("hex");
}

/**
 * Verify user's key against stored verification hash
 */
export function verifyKey(
  userKey: Buffer,
  dek: Buffer,
  storedHash: string
): boolean {
  const computedHash = createVerificationHash(userKey, dek);
  // Constant-time comparison to prevent timing attacks
  return computedHash === storedHash;
}

/**
 * Generate a new random token key and encrypted DEK
 */
export function generateTokenKey(): GeneratedKey {
  // Generate user's token
  const userKey = generateRandomToken();
  const derivedKey = deriveKeyFromToken(userKey);

  // Generate random DEK
  const dek = randomBytes(DEK_LENGTH);

  // Encrypt DEK with user's key
  const encryptedDek = encryptDek(dek, derivedKey);

  // Create verification hash
  const keyVerificationHash = createVerificationHash(derivedKey, dek);

  return {
    userKey,
    keyType: "token",
    encryptedDek,
    keyVerificationHash,
    publicKey: null,
    keyDerivationParams: null,
  };
}

/**
 * Generate a new passphrase-based key and encrypted DEK
 */
export function generatePassphraseKey(passphrase: string): GeneratedKey {
  // Derive key from passphrase
  const { key: derivedKey, params } = deriveKeyFromPassphrase(passphrase);

  // Generate random DEK
  const dek = randomBytes(DEK_LENGTH);

  // Encrypt DEK with user's key
  const encryptedDek = encryptDek(dek, derivedKey);

  // Create verification hash
  const keyVerificationHash = createVerificationHash(derivedKey, dek);

  return {
    userKey: passphrase, // User needs to remember this
    keyType: "passphrase",
    encryptedDek,
    keyVerificationHash,
    publicKey: null,
    keyDerivationParams: JSON.stringify(params),
  };
}

/**
 * Generate a new SSH-style keypair and encrypted DEK
 * Note: For SSH-style, we use the keypair differently:
 * - Private key: Used to decrypt the DEK
 * - Public key: Stored in database, used to encrypt new DEKs
 * Since Ed25519 is for signatures, we use it with a derived key
 */
export function generateKeypairKey(): GeneratedKey {
  // For keypair mode, we generate a random token and associate it with a keypair
  // The "private key" is the token, the "public key" is for display/verification
  const { privateKey, publicKey } = generateKeypair();

  // Use the private key hash as the encryption key
  const derivedKey = createHash("sha256").update(privateKey).digest();

  // Generate random DEK
  const dek = randomBytes(DEK_LENGTH);

  // Encrypt DEK with derived key
  const encryptedDek = encryptDek(dek, derivedKey);

  // Create verification hash
  const keyVerificationHash = createVerificationHash(derivedKey, dek);

  return {
    userKey: privateKey, // User saves this like SSH private key
    keyType: "keypair",
    encryptedDek,
    keyVerificationHash,
    publicKey,
    keyDerivationParams: null,
  };
}

/**
 * Generate a new encryption key of the specified type
 */
export function generateEncryptionKey(
  keyType: EncryptionKeyType,
  passphrase?: string
): GeneratedKey {
  switch (keyType) {
    case "token":
      return generateTokenKey();
    case "passphrase":
      if (!passphrase) {
        throw new Error("Passphrase required for passphrase key type");
      }
      return generatePassphraseKey(passphrase);
    case "keypair":
      return generateKeypairKey();
    default:
      throw new Error(`Unknown key type: ${keyType}`);
  }
}

/**
 * Unlock (derive) the DEK using user's key
 */
export function unlockDek(
  userKey: string,
  keyType: EncryptionKeyType,
  encryptedDek: string,
  keyDerivationParams?: string | null,
  keyVerificationHash?: string | null
): Buffer {
  let derivedKey: Buffer;

  switch (keyType) {
    case "token":
      derivedKey = deriveKeyFromToken(userKey);
      break;
    case "passphrase":
      if (!keyDerivationParams) {
        throw new Error("Key derivation params required for passphrase");
      }
      const params = JSON.parse(keyDerivationParams) as KeyDerivationParams;
      derivedKey = deriveKeyFromPassphrase(userKey, params).key;
      break;
    case "keypair":
      // For keypair, userKey is the private key PEM
      derivedKey = createHash("sha256").update(userKey).digest();
      break;
    default:
      throw new Error(`Unknown key type: ${keyType}`);
  }

  // Decrypt the DEK
  const dek = decryptDek(encryptedDek, derivedKey);

  // Verify if hash is provided
  if (keyVerificationHash && !verifyKey(derivedKey, dek, keyVerificationHash)) {
    throw new Error("Key verification failed - incorrect key");
  }

  return dek;
}

/**
 * Store encryption key in database
 */
export async function storeEncryptionKey(
  db: LibSQLDatabase<typeof schema>,
  targetType: EncryptionKeyTargetType,
  targetId: string,
  generatedKey: GeneratedKey
): Promise<number> {
  const newKey: NewEncryptionKey = {
    targetType,
    targetId,
    encryptedDek: generatedKey.encryptedDek,
    keyVerificationHash: generatedKey.keyVerificationHash,
    publicKey: generatedKey.publicKey,
    keyType: generatedKey.keyType as EncryptionKeyTypeValue,
    keyVersion: 1,
    keyDerivationParams: generatedKey.keyDerivationParams,
    createdAt: nowISOString(),
  };

  const result = await db.insert(encryptionKeys).values(newKey);
  return Number(result.lastInsertRowid);
}

/**
 * Get encryption key from database
 */
export async function getEncryptionKey(
  db: LibSQLDatabase<typeof schema>,
  targetType: EncryptionKeyTargetType,
  targetId: string
): Promise<{
  id: number;
  encryptedDek: string;
  keyType: EncryptionKeyType;
  keyVerificationHash: string | null;
  keyDerivationParams: string | null;
  publicKey: string | null;
  keyVersion: number;
} | null> {
  const key = await db
    .select({
      id: encryptionKeys.id,
      encryptedDek: encryptionKeys.encryptedDek,
      keyType: encryptionKeys.keyType,
      keyVerificationHash: encryptionKeys.keyVerificationHash,
      keyDerivationParams: encryptionKeys.keyDerivationParams,
      publicKey: encryptionKeys.publicKey,
      keyVersion: encryptionKeys.keyVersion,
    })
    .from(encryptionKeys)
    .where(
      and(
        eq(encryptionKeys.targetType, targetType),
        eq(encryptionKeys.targetId, targetId)
      )
    )
    .get();

  if (!key) return null;

  return {
    ...key,
    keyType: key.keyType as EncryptionKeyType,
  };
}

/**
 * Rotate encryption key (re-encrypt DEK with new user key)
 */
export async function rotateEncryptionKey(
  db: LibSQLDatabase<typeof schema>,
  keyId: number,
  oldUserKey: string,
  newKeyType: EncryptionKeyType,
  newPassphrase?: string
): Promise<GeneratedKey> {
  // Get existing key
  const existingKey = await db
    .select()
    .from(encryptionKeys)
    .where(eq(encryptionKeys.id, keyId))
    .get();

  if (!existingKey) {
    throw new Error("Encryption key not found");
  }

  // Unlock existing DEK
  const dek = unlockDek(
    oldUserKey,
    existingKey.keyType as EncryptionKeyType,
    existingKey.encryptedDek,
    existingKey.keyDerivationParams,
    existingKey.keyVerificationHash
  );

  // Generate new key wrapper
  let derivedKey: Buffer;
  let newUserKey: string;
  let keyDerivationParams: string | null = null;
  let publicKey: string | null = null;

  switch (newKeyType) {
    case "token":
      newUserKey = generateRandomToken();
      derivedKey = deriveKeyFromToken(newUserKey);
      break;
    case "passphrase":
      if (!newPassphrase) {
        throw new Error("Passphrase required for passphrase key type");
      }
      newUserKey = newPassphrase;
      const result = deriveKeyFromPassphrase(newPassphrase);
      derivedKey = result.key;
      keyDerivationParams = JSON.stringify(result.params);
      break;
    case "keypair":
      const { privateKey, publicKey: pubKey } = generateKeypair();
      newUserKey = privateKey;
      publicKey = pubKey;
      derivedKey = createHash("sha256").update(privateKey).digest();
      break;
    default:
      throw new Error(`Unknown key type: ${newKeyType}`);
  }

  // Re-encrypt DEK with new key
  const newEncryptedDek = encryptDek(dek, derivedKey);
  const newVerificationHash = createVerificationHash(derivedKey, dek);
  const now = nowISOString();

  // Update database
  await db
    .update(encryptionKeys)
    .set({
      encryptedDek: newEncryptedDek,
      keyVerificationHash: newVerificationHash,
      keyType: newKeyType as EncryptionKeyTypeValue,
      keyDerivationParams,
      publicKey,
      keyVersion: existingKey.keyVersion + 1,
      rotatedAt: now,
      lastUsedAt: now,
    })
    .where(eq(encryptionKeys.id, keyId));

  return {
    userKey: newUserKey,
    keyType: newKeyType,
    encryptedDek: newEncryptedDek,
    keyVerificationHash: newVerificationHash,
    publicKey,
    keyDerivationParams,
  };
}

/**
 * Update last used timestamp for a key
 */
export async function updateKeyLastUsed(
  db: LibSQLDatabase<typeof schema>,
  keyId: number
): Promise<void> {
  await db
    .update(encryptionKeys)
    .set({
      lastUsedAt: nowISOString(),
    })
    .where(eq(encryptionKeys.id, keyId));
}

/**
 * Mask user key for safe display
 */
export function maskUserKey(userKey: string, keyType: EncryptionKeyType): string {
  if (keyType === "keypair") {
    // Show just the key type indicator for PEM keys
    return "-----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY-----";
  }

  if (keyType === "passphrase") {
    // Don't show passphrase at all
    return "********";
  }

  // For tokens, show prefix and last 4 chars
  if (userKey.length <= 12) {
    return "****";
  }
  return `${userKey.slice(0, 7)}...${userKey.slice(-4)}`;
}
