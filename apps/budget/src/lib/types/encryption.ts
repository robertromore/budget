/**
 * Database Encryption Types
 *
 * Type definitions for the optional encryption system supporting
 * user-generated keys (token, passphrase, keypair) with field-level
 * encryption at user, workspace, and financial account levels.
 */

/**
 * Encryption levels from 0 (none) to 4 (zero-knowledge)
 * Higher levels provide more protection but disable more features
 */
export type EncryptionLevel = 0 | 1 | 2 | 3 | 4;

export const ENCRYPTION_LEVELS = {
	/** No encryption - all features available */
	NONE: 0,
	/** Basic field encryption with user key - all features available */
	BASIC: 1,
	/** Enhanced PII encryption - limited search/ML */
	ENHANCED_PII: 2,
	/** Full field encryption - no text search/ML */
	FULL_FIELD: 3,
	/** Zero-knowledge client-side - most features disabled */
	ZERO_KNOWLEDGE: 4
} as const;

export const ENCRYPTION_LEVEL_NAMES: Record<EncryptionLevel, string> = {
	0: "None",
	1: "Basic Encrypted",
	2: "Enhanced PII",
	3: "Maximum Field",
	4: "Zero-Knowledge"
};

export const ENCRYPTION_LEVEL_DESCRIPTIONS: Record<EncryptionLevel, string> = {
	0: "Data stored in plaintext. All features available.",
	1: "Sensitive fields encrypted with your personal key. All features available.",
	2: "Additional encryption for PII (names, addresses, medical data). Limited search/ML.",
	3: "All text fields encrypted. No text search or ML features.",
	4: "Client-side encryption. Server cannot read your data. Most features disabled."
};

/**
 * Type of user encryption key
 */
export type EncryptionKeyType = "token" | "passphrase" | "keypair";

/**
 * Feature availability status
 */
export type FeatureStatus = "available" | "limited" | "disabled";

/**
 * Feature availability for a given encryption level
 */
export interface FeatureAvailability {
	fullTextSearch: FeatureStatus;
	mlCategorization: FeatureStatus;
	analytics: FeatureStatus;
	budgets: FeatureStatus;
	payeeLearning: FeatureStatus;
	workspaceSharing: FeatureStatus;
	transactionFiltering: FeatureStatus;
	dataExport: FeatureStatus;
}

/**
 * Get feature availability for a given encryption level
 */
export function getFeatureAvailability(level: EncryptionLevel): FeatureAvailability {
	switch (level) {
		case 0:
		case 1:
			return {
				fullTextSearch: "available",
				mlCategorization: "available",
				analytics: "available",
				budgets: "available",
				payeeLearning: "available",
				workspaceSharing: "available",
				transactionFiltering: "available",
				dataExport: "available"
			};
		case 2:
			return {
				fullTextSearch: "limited",
				mlCategorization: "limited",
				analytics: "available",
				budgets: "available",
				payeeLearning: "limited",
				workspaceSharing: "available",
				transactionFiltering: "available",
				dataExport: "available"
			};
		case 3:
			return {
				fullTextSearch: "disabled",
				mlCategorization: "disabled",
				analytics: "limited",
				budgets: "available",
				payeeLearning: "disabled",
				workspaceSharing: "available",
				transactionFiltering: "limited",
				dataExport: "available"
			};
		case 4:
			return {
				fullTextSearch: "disabled",
				mlCategorization: "disabled",
				analytics: "disabled",
				budgets: "disabled",
				payeeLearning: "disabled",
				workspaceSharing: "disabled",
				transactionFiltering: "limited",
				dataExport: "limited"
			};
	}
}

/**
 * Get warning messages for a given encryption level
 */
export function getEncryptionWarnings(level: EncryptionLevel): string[] {
	switch (level) {
		case 0:
			return [];
		case 1:
			return [
				"Your data is encrypted with your personal key.",
				"Save this key securely - if you lose it, your data cannot be recovered."
			];
		case 2:
			return [
				"Enhanced encryption enabled.",
				"Search in transaction notes and payee names is limited to exact match only.",
				"ML-based categorization from text patterns is limited.",
				"If you lose your encryption key, your data cannot be recovered."
			];
		case 3:
			return [
				"Full field encryption enabled.",
				"All text search (notes, payees, descriptions) is DISABLED.",
				"Smart categorization and ML features are DISABLED.",
				"Payee pattern learning and suggestions are DISABLED.",
				"If you lose your encryption key, your data cannot be recovered."
			];
		case 4:
			return [
				"MAXIMUM SECURITY MODE",
				"Your data is encrypted before leaving your browser.",
				"The server cannot read your data.",
				"Search (all types) is DISABLED.",
				"Smart categorization & ML is DISABLED.",
				"Server-side analytics & reports are DISABLED.",
				"Budget calculations are DISABLED.",
				"Workspace sharing is DISABLED.",
				"You MUST remember your encryption key.",
				"If you lose your key, ALL DATA IS PERMANENTLY LOST.",
				"No recovery is possible."
			];
	}
}

/**
 * Check if a feature is available at the given encryption level
 */
export function isFeatureAvailable(
	level: EncryptionLevel,
	feature: keyof FeatureAvailability
): boolean {
	const availability = getFeatureAvailability(level);
	return availability[feature] === "available";
}

/**
 * User account encryption preferences
 */
export interface UserEncryptionPreferences {
	/** Default encryption level for new workspaces */
	defaultLevel: EncryptionLevel;
	/** Type of encryption key */
	keyType: EncryptionKeyType;
	/** Reference to stored encryption key */
	keyId?: string;
	/** Whether risk-based authentication is enabled */
	riskFactorsEnabled: boolean;
}

/**
 * Workspace encryption settings
 */
export interface WorkspaceEncryptionSettings {
	/** Encryption level - "inherit" uses user's default */
	level: EncryptionLevel | "inherit";
	/** Separate workspace key ID if different from user's */
	keyId?: string;
	/** Custom list of fields to encrypt (advanced) */
	fieldsEncrypted?: string[];
}

/**
 * Financial account encryption settings
 */
export interface AccountEncryptionSettings {
	/** Encryption level - "inherit" uses workspace's setting */
	level: EncryptionLevel | "inherit";
	/** Separate account key ID for extra-sensitive accounts */
	keyId?: string;
}

/**
 * Risk factors for adaptive authentication
 */
export interface RiskFactorSettings {
	/** Check IP address against known IPs */
	ip: boolean;
	/** Check geographic location */
	location: boolean;
	/** Check browser/device fingerprint */
	device: boolean;
	/** Check time of day patterns */
	timePattern: boolean;
}

/**
 * Risk assessment result
 */
export interface RiskScore {
	/** Total score 0-100, higher = more trusted */
	total: number;
	/** Individual factor scores */
	factors: RiskFactor[];
	/** Recommended action based on score */
	action: "allow" | "challenge" | "deny";
}

/**
 * Individual risk factor score
 */
export interface RiskFactor {
	/** Factor name */
	name: string;
	/** Score contribution */
	score: number;
	/** Weight/importance */
	weight: number;
	/** Additional details */
	details: string;
}

/**
 * Encryption key metadata stored in database
 */
export interface EncryptionKeyMetadata {
	id: number;
	/** Target type: user, workspace, or account */
	targetType: "user" | "workspace" | "account";
	/** ID of the target (userId, workspaceId, or accountId) */
	targetId: string | number;
	/** Encrypted DEK (Data Encryption Key) */
	encryptedDek: string;
	/** Verification hash of user's key (optional) */
	keyVerificationHash?: string;
	/** Public key for SSH-style keypairs */
	publicKey?: string;
	/** Type of key */
	keyType: EncryptionKeyType;
	/** Key version for rotation */
	keyVersion: number;
	createdAt: string;
	rotatedAt?: string;
}

/**
 * Fields that can be encrypted at each level
 */
export const ENCRYPTED_FIELDS_BY_LEVEL: Record<EncryptionLevel, string[]> = {
	0: [],
	1: ["transactions.notes", "payees.name"],
	2: [
		"transactions.notes",
		"payees.name",
		"payees.email",
		"payees.phone",
		"payees.address",
		"accounts.name",
		"accounts.notes",
		"medicalExpenses.diagnosis",
		"medicalExpenses.patientName"
	],
	3: [
		"transactions.notes",
		"transactions.description",
		"payees.name",
		"payees.email",
		"payees.phone",
		"payees.address",
		"accounts.name",
		"accounts.notes",
		"categories.name",
		"medicalExpenses.diagnosis",
		"medicalExpenses.patientName"
	],
	4: ["*"] // All fields - client-side encryption
};

/**
 * Validate that a level change is allowed
 * Financial accounts can only INCREASE encryption level from workspace
 */
export function validateLevelChange(
	currentLevel: EncryptionLevel,
	newLevel: EncryptionLevel,
	scope: "user" | "workspace" | "account"
): { valid: boolean; reason?: string } {
	// Account level can only increase, not decrease
	if (scope === "account" && newLevel < currentLevel) {
		return {
			valid: false,
			reason: "Financial accounts can only increase encryption level, not decrease it."
		};
	}

	return { valid: true };
}

/**
 * Resolve effective encryption level considering inheritance
 */
export function resolveEffectiveLevel(
	userLevel: EncryptionLevel,
	workspaceLevel: EncryptionLevel | "inherit",
	accountLevel: EncryptionLevel | "inherit"
): EncryptionLevel {
	// Start with user's default
	let effective = userLevel;

	// Apply workspace override if not inheriting
	if (workspaceLevel !== "inherit") {
		effective = workspaceLevel;
	}

	// Apply account override if not inheriting (can only increase)
	if (accountLevel !== "inherit" && accountLevel > effective) {
		effective = accountLevel;
	}

	return effective;
}
