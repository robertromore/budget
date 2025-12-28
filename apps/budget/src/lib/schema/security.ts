/**
 * Security Schema
 *
 * Tables for encryption key storage, risk-based authentication,
 * and access logging.
 */

import { relations, sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { accounts } from "./accounts";
import { users } from "./users";
import { workspaces } from "./workspaces";

/**
 * Encryption key target types
 */
export const encryptionKeyTargetTypes = ["user", "workspace", "account"] as const;
export type EncryptionKeyTargetType = (typeof encryptionKeyTargetTypes)[number];

/**
 * Encryption key types
 */
export const encryptionKeyTypes = ["token", "passphrase", "keypair"] as const;
export type EncryptionKeyTypeValue = (typeof encryptionKeyTypes)[number];

/**
 * Encryption Keys Table
 *
 * Stores encrypted DEKs (Data Encryption Keys) wrapped with user keys.
 * The server stores the encrypted DEK but cannot decrypt it without
 * the user's personal encryption key.
 */
export const encryptionKeys = sqliteTable(
	"encryption_keys",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),

		/** Target type: user, workspace, or account */
		targetType: text("target_type", { enum: encryptionKeyTargetTypes }).notNull(),

		/** ID of the target - userId (text), workspaceId (int), or accountId (int) */
		targetId: text("target_id").notNull(),

		/** Encrypted DEK - AES-256-GCM encrypted with user's key */
		encryptedDek: text("encrypted_dek").notNull(),

		/** HMAC verification hash of user's key (for validation without decryption) */
		keyVerificationHash: text("key_verification_hash"),

		/** Public key for SSH-style keypairs (allows encrypting new data without private key) */
		publicKey: text("public_key"),

		/** Type of encryption key used */
		keyType: text("key_type", { enum: encryptionKeyTypes }).notNull(),

		/** Key version for rotation (increment on each rotation) */
		keyVersion: integer("key_version").notNull().default(1),

		/** Key derivation parameters for passphrase-based keys (JSON) */
		keyDerivationParams: text("key_derivation_params"),

		// Timestamps
		createdAt: text("created_at")
			.notNull()
			.default(sql`CURRENT_TIMESTAMP`),
		rotatedAt: text("rotated_at"),
		lastUsedAt: text("last_used_at"),
	},
	(table) => [
		index("encryption_keys_target_type_idx").on(table.targetType),
		index("encryption_keys_target_id_idx").on(table.targetId),
		index("encryption_keys_target_composite_idx").on(table.targetType, table.targetId)
	]
);

export const encryptionKeysRelations = relations(encryptionKeys, ({ one }) => ({
	// Note: Can't directly reference since targetId can be different types
	// Relations are handled at the application level
}));

/**
 * Trusted context types for risk assessment
 */
export const trustedContextTypes = ["ip", "location", "device", "time_pattern"] as const;
export type TrustedContextType = (typeof trustedContextTypes)[number];

/**
 * User Trusted Contexts Table
 *
 * Stores learned patterns about user's normal access patterns.
 * Used for risk-based authentication to determine if a login
 * is from a trusted context.
 */
export const userTrustedContexts = sqliteTable(
	"user_trusted_contexts",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),

		/** User this context belongs to */
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),

		/** Type of context: ip, location, device, time_pattern */
		contextType: text("context_type", { enum: trustedContextTypes }).notNull(),

		/** Hashed context value (for privacy) - e.g., SHA256 of IP or device fingerprint */
		contextValue: text("context_value").notNull(),

		/** Human-readable label (optional) - e.g., "Home", "Office", "iPhone" */
		label: text("label"),

		/** Trust score for this context (0-1), increases with repeated use */
		trustScore: real("trust_score").notNull().default(0.5),

		/** Number of times this context has been seen */
		seenCount: integer("seen_count").notNull().default(1),

		/** Whether user explicitly trusted this device */
		explicitlyTrusted: integer("explicitly_trusted", { mode: "boolean" }).default(false),

		// Timestamps
		firstSeenAt: text("first_seen_at")
			.notNull()
			.default(sql`CURRENT_TIMESTAMP`),
		lastSeenAt: text("last_seen_at")
			.notNull()
			.default(sql`CURRENT_TIMESTAMP`),
		revokedAt: text("revoked_at"), // If user revokes trust
	},
	(table) => [
		index("trusted_contexts_user_idx").on(table.userId),
		index("trusted_contexts_type_idx").on(table.contextType),
		index("trusted_contexts_value_idx").on(table.contextValue),
		index("trusted_contexts_user_type_idx").on(table.userId, table.contextType),
		index("trusted_contexts_revoked_idx").on(table.revokedAt)
	]
);

export const userTrustedContextsRelations = relations(userTrustedContexts, ({ one }) => ({
	user: one(users, {
		fields: [userTrustedContexts.userId],
		references: [users.id]
	})
}));

/**
 * Access Log Table
 *
 * Logs all authentication events for audit and pattern learning.
 * Used to learn normal access patterns and detect anomalies.
 */
export const accessLog = sqliteTable(
	"access_log",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),

		/** User who accessed */
		userId: text("user_id").references(() => users.id, { onDelete: "set null" }),

		/** Session ID (from auth) */
		sessionId: text("session_id"),

		/** Event type */
		eventType: text("event_type").notNull(), // "login", "logout", "challenge_required", "challenge_passed", "challenge_failed", "key_unlock"

		/** IP address (hashed for privacy) */
		ipAddressHash: text("ip_address_hash"),

		/** Country/region from geo lookup */
		geoLocation: text("geo_location"),

		/** Device fingerprint hash */
		deviceHash: text("device_hash"),

		/** User agent string */
		userAgent: text("user_agent"),

		/** Hour of day (0-23) in user's timezone */
		localHour: integer("local_hour"),

		/** Day of week (0-6, Sunday = 0) */
		dayOfWeek: integer("day_of_week"),

		/** Calculated risk score at time of access */
		riskScore: real("risk_score"),

		/** Whether a challenge was required */
		challengeRequired: integer("challenge_required", { mode: "boolean" }),

		/** Type of challenge if required */
		challengeType: text("challenge_type"), // "email", "security_question", "2fa"

		/** Whether challenge was passed */
		challengePassed: integer("challenge_passed", { mode: "boolean" }),

		/** Whether encryption key was unlocked in this session */
		keyUnlocked: integer("key_unlocked", { mode: "boolean" }),

		/** Additional metadata (JSON) */
		metadata: text("metadata"),

		// Timestamp
		timestamp: text("timestamp")
			.notNull()
			.default(sql`CURRENT_TIMESTAMP`)
	},
	(table) => [
		index("access_log_user_idx").on(table.userId),
		index("access_log_session_idx").on(table.sessionId),
		index("access_log_event_type_idx").on(table.eventType),
		index("access_log_timestamp_idx").on(table.timestamp),
		index("access_log_user_timestamp_idx").on(table.userId, table.timestamp),
		index("access_log_ip_hash_idx").on(table.ipAddressHash)
	]
);

export const accessLogRelations = relations(accessLog, ({ one }) => ({
	user: one(users, {
		fields: [accessLog.userId],
		references: [users.id]
	})
}));

// Zod schemas for validation
export const selectEncryptionKeySchema = createSelectSchema(encryptionKeys);
export const insertEncryptionKeySchema = createInsertSchema(encryptionKeys);

export const selectTrustedContextSchema = createSelectSchema(userTrustedContexts);
export const insertTrustedContextSchema = createInsertSchema(userTrustedContexts);

export const selectAccessLogSchema = createSelectSchema(accessLog);
export const insertAccessLogSchema = createInsertSchema(accessLog);

// API schemas
export const createEncryptionKeySchema = z.object({
	targetType: z.enum(encryptionKeyTargetTypes),
	targetId: z.string(),
	encryptedDek: z.string(),
	keyVerificationHash: z.string().optional(),
	publicKey: z.string().optional(),
	keyType: z.enum(encryptionKeyTypes),
	keyDerivationParams: z.string().optional()
});

export const trustDeviceSchema = z.object({
	contextType: z.enum(trustedContextTypes),
	contextValue: z.string(),
	label: z.string().optional()
});

export const logAccessSchema = z.object({
	eventType: z.string(),
	ipAddressHash: z.string().optional(),
	geoLocation: z.string().optional(),
	deviceHash: z.string().optional(),
	userAgent: z.string().optional(),
	localHour: z.number().min(0).max(23).optional(),
	dayOfWeek: z.number().min(0).max(6).optional(),
	riskScore: z.number().min(0).max(100).optional(),
	challengeRequired: z.boolean().optional(),
	challengeType: z.string().optional(),
	challengePassed: z.boolean().optional(),
	keyUnlocked: z.boolean().optional(),
	metadata: z.string().optional()
});

// Type exports
export type EncryptionKey = typeof encryptionKeys.$inferSelect;
export type NewEncryptionKey = typeof encryptionKeys.$inferInsert;

export type TrustedContext = typeof userTrustedContexts.$inferSelect;
export type NewTrustedContext = typeof userTrustedContexts.$inferInsert;

export type AccessLogEntry = typeof accessLog.$inferSelect;
export type NewAccessLogEntry = typeof accessLog.$inferInsert;

export type CreateEncryptionKeyInput = z.infer<typeof createEncryptionKeySchema>;
export type TrustDeviceInput = z.infer<typeof trustDeviceSchema>;
export type LogAccessInput = z.infer<typeof logAccessSchema>;
