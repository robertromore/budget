/**
 * External Agent API Key Service
 *
 * Generate, verify, list, and revoke bearer tokens for external AI
 * assistants. The plaintext key is shown to the user exactly once at
 * generation time — we keep a sha256 hash for incoming-request lookup,
 * never the plaintext.
 *
 * Format: `bgt_` + 32 url-safe base64 characters (24 random bytes).
 * Prefix lets us namespace and identify our keys; the 24-byte entropy
 * is well above what's needed to resist brute force.
 */

import { createHash, randomBytes } from "crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import {
  externalApiKeys,
  type ExternalApiKey,
  type ExternalApiKeyScope,
} from "$core/schema/external-api-keys";
import { db } from "$core/server/db";

const KEY_PREFIX = "bgt_";
/** Characters in the random portion of the key — url-safe, no padding. */
const KEY_RANDOM_LENGTH = 32;

export interface GenerateApiKeyInput {
  workspaceId: number;
  userId: string;
  name: string;
  scope: ExternalApiKeyScope;
  /** ISO-8601 timestamp. Optional; null = never expires. */
  expiresAt?: string | null;
}

export interface GenerateApiKeyResult {
  /** The plaintext key. Shown to the user exactly once; never stored. */
  plaintextKey: string;
  record: ExternalApiKey;
}

export interface VerifiedApiKey {
  apiKeyId: number;
  workspaceId: number;
  userId: string;
  scope: ExternalApiKeyScope;
}

function hashKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

function generatePlaintextKey(): { plaintext: string; prefix: string } {
  // 24 random bytes → 32 url-safe base64 chars (no padding).
  const raw = randomBytes(24).toString("base64url");
  const plaintext = `${KEY_PREFIX}${raw.slice(0, KEY_RANDOM_LENGTH)}`;
  // Prefix shown in the UI: e.g. "bgt_abcd1234" — first 12 chars.
  const prefix = plaintext.slice(0, KEY_PREFIX.length + 8);
  return { plaintext, prefix };
}

export async function generateApiKey(
  input: GenerateApiKeyInput
): Promise<GenerateApiKeyResult> {
  const { plaintext, prefix } = generatePlaintextKey();
  const [record] = await db
    .insert(externalApiKeys)
    .values({
      workspaceId: input.workspaceId,
      userId: input.userId,
      name: input.name.trim(),
      keyHash: hashKey(plaintext),
      keyPrefix: prefix,
      scope: input.scope,
      expiresAt: input.expiresAt ?? null,
    })
    .returning();
  if (!record) throw new Error("Failed to insert API key");
  return { plaintextKey: plaintext, record };
}

/**
 * Look up an incoming bearer token. Returns null when the token doesn't
 * match any non-revoked, non-expired key in any workspace. Updates
 * `lastUsedAt` on hit so the settings UI can show recency.
 */
export async function verifyApiKey(plaintext: string): Promise<VerifiedApiKey | null> {
  if (!plaintext || !plaintext.startsWith(KEY_PREFIX)) return null;
  const keyHash = hashKey(plaintext);

  const [row] = await db
    .select()
    .from(externalApiKeys)
    .where(eq(externalApiKeys.keyHash, keyHash))
    .limit(1);
  if (!row) return null;
  if (row.revokedAt) return null;
  if (row.expiresAt) {
    const expired = new Date(row.expiresAt).getTime() <= Date.now();
    if (expired) return null;
  }

  // Stamp last-used. Fire-and-forget — the verification result doesn't
  // depend on this write succeeding.
  void db
    .update(externalApiKeys)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(externalApiKeys.id, row.id))
    .catch((error) => {
      console.error("[ExternalApiKey] failed to stamp lastUsedAt:", error);
    });

  return {
    apiKeyId: row.id,
    workspaceId: row.workspaceId,
    userId: row.userId,
    scope: row.scope,
  };
}

export async function listApiKeys(workspaceId: number): Promise<ExternalApiKey[]> {
  return db
    .select()
    .from(externalApiKeys)
    .where(eq(externalApiKeys.workspaceId, workspaceId))
    .orderBy(desc(externalApiKeys.createdAt));
}

/** Returns true if the key was newly revoked; false if not found or already revoked. */
export async function revokeApiKey(id: number, workspaceId: number): Promise<boolean> {
  const result = await db
    .update(externalApiKeys)
    .set({ revokedAt: new Date().toISOString() })
    .where(
      and(
        eq(externalApiKeys.id, id),
        eq(externalApiKeys.workspaceId, workspaceId),
        isNull(externalApiKeys.revokedAt)
      )
    )
    .returning({ id: externalApiKeys.id });
  return result.length > 0;
}
