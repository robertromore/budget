/**
 * Risk-Based Authentication Service
 *
 * Provides adaptive security scoring based on user access patterns.
 * Higher scores indicate more trusted access; lower scores may require
 * additional verification (challenges).
 */

import { and, eq, gte, desc, sql } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type * as schema from "$lib/schema";
import {
  userTrustedContexts,
  accessLog,
  type TrustedContextType,
  type NewAccessLogEntry,
  type NewTrustedContext,
} from "$lib/schema/security";
import type { RiskScore, RiskFactor, RiskFactorSettings } from "$lib/types/encryption";
import { nowISOString } from "$lib/utils/dates";
import { createHash } from "crypto";

/**
 * Login context information for risk assessment
 */
export interface LoginContext {
  ipAddress: string;
  userAgent: string;
  geoLocation?: string;
  localHour?: number;
  dayOfWeek?: number;
  deviceFingerprint?: string;
}

/**
 * Challenge types that can be required for verification
 */
export type ChallengeType = "email" | "security_question" | "2fa" | "reauth";

/**
 * Score thresholds for access decisions
 */
export const RISK_THRESHOLDS = {
  ALLOW: 80, // 80-100: Full access, no challenges
  ELEVATED: 60, // 60-79: Access granted, log as elevated risk
  CHALLENGE: 40, // 40-59: Challenge required
  DENY: 0, // 0-39: Deny access, require full re-authentication
} as const;

/**
 * Risk factor weights (must sum to 100)
 */
export const RISK_WEIGHTS = {
  password: 40, // Correct password is the baseline
  ip: 15, // Known IP address
  location: 10, // Known geographic location
  device: 15, // Known browser/device fingerprint
  timePattern: 10, // Usual time of day
  sessionAge: 5, // Age of current session
  recentActivity: 5, // Recent activity patterns
} as const;

/**
 * Hash a value for privacy-preserving storage
 */
function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Get trust score for a context based on historical data
 */
async function getContextTrustScore(
  db: LibSQLDatabase<typeof schema>,
  userId: string,
  contextType: TrustedContextType,
  contextValue: string
): Promise<{ score: number; isKnown: boolean; seenCount: number }> {
  const hashedValue = hashValue(contextValue);

  const context = await db
    .select()
    .from(userTrustedContexts)
    .where(
      and(
        eq(userTrustedContexts.userId, userId),
        eq(userTrustedContexts.contextType, contextType),
        eq(userTrustedContexts.contextValue, hashedValue),
        sql`${userTrustedContexts.revokedAt} IS NULL`
      )
    )
    .get();

  if (!context) {
    return { score: 0, isKnown: false, seenCount: 0 };
  }

  // Base score from trust score (0-1) normalized to 0-100
  let score = context.trustScore * 100;

  // Bonus for explicitly trusted devices
  if (context.explicitlyTrusted) {
    score = Math.min(100, score + 20);
  }

  // Boost for frequently seen contexts
  if (context.seenCount > 10) {
    score = Math.min(100, score + 10);
  } else if (context.seenCount > 5) {
    score = Math.min(100, score + 5);
  }

  return {
    score,
    isKnown: true,
    seenCount: context.seenCount,
  };
}

/**
 * Calculate time pattern score based on usual access times
 */
async function getTimePatternScore(
  db: LibSQLDatabase<typeof schema>,
  userId: string,
  currentHour: number,
  currentDayOfWeek: number
): Promise<{ score: number; isUsualTime: boolean }> {
  // Get recent access logs for this user's time patterns
  const recentAccess = await db
    .select({
      localHour: accessLog.localHour,
      dayOfWeek: accessLog.dayOfWeek,
    })
    .from(accessLog)
    .where(
      and(
        eq(accessLog.userId, userId),
        eq(accessLog.eventType, "login"),
        gte(accessLog.timestamp, sql`datetime('now', '-30 days')`)
      )
    )
    .limit(100);

  if (recentAccess.length < 5) {
    // Not enough data to establish patterns, give neutral score
    return { score: 50, isUsualTime: true };
  }

  // Count access at similar times (within 2 hours)
  let similarTimeCount = 0;
  let similarDayCount = 0;

  for (const access of recentAccess) {
    if (access.localHour !== null) {
      const hourDiff = Math.abs(access.localHour - currentHour);
      const wrappedDiff = Math.min(hourDiff, 24 - hourDiff);
      if (wrappedDiff <= 2) {
        similarTimeCount++;
      }
    }
    if (access.dayOfWeek === currentDayOfWeek) {
      similarDayCount++;
    }
  }

  const timeScore = (similarTimeCount / recentAccess.length) * 100;
  const dayScore = (similarDayCount / recentAccess.length) * 100;
  const combinedScore = (timeScore * 0.7 + dayScore * 0.3);

  return {
    score: Math.min(100, combinedScore),
    isUsualTime: combinedScore >= 40,
  };
}

/**
 * Calculate overall risk score for a login attempt
 */
export async function calculateRiskScore(
  db: LibSQLDatabase<typeof schema>,
  userId: string,
  context: LoginContext,
  riskFactorSettings?: RiskFactorSettings
): Promise<RiskScore> {
  const factors: RiskFactor[] = [];
  let totalScore = 0;
  let totalWeight = 0;

  // Password is assumed correct if we got this far
  factors.push({
    name: "password",
    score: RISK_WEIGHTS.password,
    weight: RISK_WEIGHTS.password,
    details: "Password verified",
  });
  totalScore += RISK_WEIGHTS.password;
  totalWeight += RISK_WEIGHTS.password;

  // Check IP address (if enabled)
  if (!riskFactorSettings || riskFactorSettings.ip) {
    const ipResult = await getContextTrustScore(db, userId, "ip", context.ipAddress);
    const ipScore = ipResult.isKnown
      ? (ipResult.score / 100) * RISK_WEIGHTS.ip
      : RISK_WEIGHTS.ip * 0.3; // Unknown IP gets 30% of weight

    factors.push({
      name: "ip",
      score: ipScore,
      weight: RISK_WEIGHTS.ip,
      details: ipResult.isKnown
        ? `Known IP (seen ${ipResult.seenCount} times)`
        : "New IP address",
    });
    totalScore += ipScore;
    totalWeight += RISK_WEIGHTS.ip;
  }

  // Check geographic location (if available and enabled)
  if (context.geoLocation && (!riskFactorSettings || riskFactorSettings.location)) {
    const locationResult = await getContextTrustScore(db, userId, "location", context.geoLocation);
    const locationScore = locationResult.isKnown
      ? (locationResult.score / 100) * RISK_WEIGHTS.location
      : RISK_WEIGHTS.location * 0.3;

    factors.push({
      name: "location",
      score: locationScore,
      weight: RISK_WEIGHTS.location,
      details: locationResult.isKnown
        ? `Known location: ${context.geoLocation}`
        : `New location: ${context.geoLocation}`,
    });
    totalScore += locationScore;
    totalWeight += RISK_WEIGHTS.location;
  }

  // Check device fingerprint (if available and enabled)
  if (context.deviceFingerprint && (!riskFactorSettings || riskFactorSettings.device)) {
    const deviceResult = await getContextTrustScore(db, userId, "device", context.deviceFingerprint);
    const deviceScore = deviceResult.isKnown
      ? (deviceResult.score / 100) * RISK_WEIGHTS.device
      : RISK_WEIGHTS.device * 0.2; // New devices get less benefit

    factors.push({
      name: "device",
      score: deviceScore,
      weight: RISK_WEIGHTS.device,
      details: deviceResult.isKnown
        ? `Known device (seen ${deviceResult.seenCount} times)`
        : "New device",
    });
    totalScore += deviceScore;
    totalWeight += RISK_WEIGHTS.device;
  }

  // Check time patterns (if enabled)
  if (
    context.localHour !== undefined &&
    context.dayOfWeek !== undefined &&
    (!riskFactorSettings || riskFactorSettings.timePattern)
  ) {
    const timeResult = await getTimePatternScore(db, userId, context.localHour, context.dayOfWeek);
    const timeScore = (timeResult.score / 100) * RISK_WEIGHTS.timePattern;

    factors.push({
      name: "timePattern",
      score: timeScore,
      weight: RISK_WEIGHTS.timePattern,
      details: timeResult.isUsualTime
        ? "Access during usual time"
        : "Access during unusual time",
    });
    totalScore += timeScore;
    totalWeight += RISK_WEIGHTS.timePattern;
  }

  // Normalize score to 0-100 based on enabled factors
  const normalizedScore = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;

  // Determine action based on score
  let action: RiskScore["action"];
  if (normalizedScore >= RISK_THRESHOLDS.ALLOW) {
    action = "allow";
  } else if (normalizedScore >= RISK_THRESHOLDS.CHALLENGE) {
    action = "challenge";
  } else {
    action = "deny";
  }

  return {
    total: Math.round(normalizedScore),
    factors,
    action,
  };
}

/**
 * Determine what challenge type is needed based on score
 */
export function getRequiredChallenge(score: number): ChallengeType | null {
  if (score >= RISK_THRESHOLDS.ALLOW) {
    return null;
  }
  if (score >= RISK_THRESHOLDS.CHALLENGE) {
    // Low-friction challenge for moderate risk
    return "email";
  }
  // High friction challenge for high risk
  return "reauth";
}

/**
 * Update trusted context after successful authentication
 */
export async function updateTrustedContext(
  db: LibSQLDatabase<typeof schema>,
  userId: string,
  contextType: TrustedContextType,
  contextValue: string,
  label?: string
): Promise<void> {
  const hashedValue = hashValue(contextValue);
  const now = nowISOString();

  // Check if context exists
  const existing = await db
    .select()
    .from(userTrustedContexts)
    .where(
      and(
        eq(userTrustedContexts.userId, userId),
        eq(userTrustedContexts.contextType, contextType),
        eq(userTrustedContexts.contextValue, hashedValue)
      )
    )
    .get();

  if (existing) {
    // Update existing context
    const newSeenCount = existing.seenCount + 1;
    // Trust score increases with each successful login, up to 0.95
    const newTrustScore = Math.min(0.95, existing.trustScore + 0.02);

    await db
      .update(userTrustedContexts)
      .set({
        seenCount: newSeenCount,
        trustScore: newTrustScore,
        lastSeenAt: now,
        label: label || existing.label,
      })
      .where(eq(userTrustedContexts.id, existing.id));
  } else {
    // Create new context with initial trust score
    const newContext: NewTrustedContext = {
      userId,
      contextType,
      contextValue: hashedValue,
      label,
      trustScore: 0.5, // Start at neutral
      seenCount: 1,
      firstSeenAt: now,
      lastSeenAt: now,
    };

    await db.insert(userTrustedContexts).values(newContext);
  }
}

/**
 * Mark a device as explicitly trusted by the user
 */
export async function trustDevice(
  db: LibSQLDatabase<typeof schema>,
  userId: string,
  deviceFingerprint: string,
  label?: string
): Promise<void> {
  const hashedValue = hashValue(deviceFingerprint);
  const now = nowISOString();

  // Check if device exists
  const existing = await db
    .select()
    .from(userTrustedContexts)
    .where(
      and(
        eq(userTrustedContexts.userId, userId),
        eq(userTrustedContexts.contextType, "device"),
        eq(userTrustedContexts.contextValue, hashedValue)
      )
    )
    .get();

  if (existing) {
    await db
      .update(userTrustedContexts)
      .set({
        explicitlyTrusted: true,
        trustScore: 0.95, // High trust for explicitly trusted devices
        label: label || existing.label,
        lastSeenAt: now,
      })
      .where(eq(userTrustedContexts.id, existing.id));
  } else {
    const newContext: NewTrustedContext = {
      userId,
      contextType: "device",
      contextValue: hashedValue,
      label: label || "Trusted Device",
      trustScore: 0.95,
      seenCount: 1,
      explicitlyTrusted: true,
      firstSeenAt: now,
      lastSeenAt: now,
    };

    await db.insert(userTrustedContexts).values(newContext);
  }
}

/**
 * Revoke trust for a device
 */
export async function revokeDeviceTrust(
  db: LibSQLDatabase<typeof schema>,
  userId: string,
  contextId: number
): Promise<boolean> {
  const result = await db
    .update(userTrustedContexts)
    .set({
      revokedAt: nowISOString(),
      explicitlyTrusted: false,
      trustScore: 0,
    })
    .where(
      and(
        eq(userTrustedContexts.id, contextId),
        eq(userTrustedContexts.userId, userId)
      )
    );

  return result.rowsAffected > 0;
}

/**
 * Get all trusted devices for a user
 */
export async function getTrustedDevices(
  db: LibSQLDatabase<typeof schema>,
  userId: string
): Promise<
  Array<{
    id: number;
    label: string | null;
    trustScore: number;
    lastSeenAt: string;
    explicitlyTrusted: boolean;
  }>
> {
  const devices = await db
    .select({
      id: userTrustedContexts.id,
      label: userTrustedContexts.label,
      trustScore: userTrustedContexts.trustScore,
      lastSeenAt: userTrustedContexts.lastSeenAt,
      explicitlyTrusted: userTrustedContexts.explicitlyTrusted,
    })
    .from(userTrustedContexts)
    .where(
      and(
        eq(userTrustedContexts.userId, userId),
        eq(userTrustedContexts.contextType, "device"),
        sql`${userTrustedContexts.revokedAt} IS NULL`
      )
    )
    .orderBy(desc(userTrustedContexts.lastSeenAt));

  return devices.map((d) => ({
    ...d,
    explicitlyTrusted: d.explicitlyTrusted ?? false,
  }));
}

/**
 * Log an access event for audit and pattern learning
 */
export async function logAccessEvent(
  db: LibSQLDatabase<typeof schema>,
  userId: string | null,
  sessionId: string | null,
  eventType: string,
  context: LoginContext,
  riskScore?: number,
  challengeRequired?: boolean,
  challengeType?: string,
  challengePassed?: boolean,
  keyUnlocked?: boolean
): Promise<void> {
  const entry: NewAccessLogEntry = {
    userId,
    sessionId,
    eventType,
    ipAddressHash: hashValue(context.ipAddress),
    geoLocation: context.geoLocation,
    deviceHash: context.deviceFingerprint ? hashValue(context.deviceFingerprint) : undefined,
    userAgent: context.userAgent,
    localHour: context.localHour,
    dayOfWeek: context.dayOfWeek,
    riskScore,
    challengeRequired,
    challengeType,
    challengePassed,
    keyUnlocked,
    timestamp: nowISOString(),
  };

  await db.insert(accessLog).values(entry);
}

/**
 * After successful login, update all trusted contexts
 */
export async function onSuccessfulLogin(
  db: LibSQLDatabase<typeof schema>,
  userId: string,
  sessionId: string,
  context: LoginContext,
  riskScore: RiskScore
): Promise<void> {
  // Update IP context
  await updateTrustedContext(db, userId, "ip", context.ipAddress);

  // Update location context if available
  if (context.geoLocation) {
    await updateTrustedContext(db, userId, "location", context.geoLocation);
  }

  // Update device context if available
  if (context.deviceFingerprint) {
    await updateTrustedContext(db, userId, "device", context.deviceFingerprint);
  }

  // Log the successful login
  await logAccessEvent(
    db,
    userId,
    sessionId,
    "login",
    context,
    riskScore.total,
    riskScore.action === "challenge",
    undefined,
    true
  );
}
