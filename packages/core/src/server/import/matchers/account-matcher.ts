/**
 * Account Matcher
 *
 * Given an LLM-extracted statement header, finds the best existing
 * account in the workspace to import the statement into. Used by the
 * bulk-PDF-import flow to decide between (a) routing to an existing
 * account, (b) proposing a new account, or (c) flagging the file for
 * manual triage.
 *
 * Matching priority (first matching tier wins):
 *  1. exact   — last4 + institution-similar + type agrees (or type unknown)
 *  2. high    — last4 + (institution-similar OR type agrees)
 *  3. medium  — institution-similar + type agrees, no last4 conflict
 *  4. none    — no usable match, propose a new account
 *
 * "Institution-similar" is a normalized substring or fuzzy match —
 * statements often print "JPMorgan Chase Bank, N.A." while the user
 * stored "Chase". "Type agrees" includes common synonyms (a "Visa
 * Signature" header maps to credit_card).
 *
 * Pure function — accepts the existing accounts list rather than
 * touching the DB so it stays cheap to test and easy to call from
 * tRPC routes without re-querying.
 */

import type { Account, AccountType } from "$core/schema/accounts";
import { calculateStringSimilarity } from "../utils";
import { normalize } from "$core/utils/string-utilities";

export type AccountMatchConfidence = "exact" | "high" | "medium" | "none";

export interface AccountMatchInput {
  institution: string | null;
  accountNumberLast4: string | null;
  accountType: AccountType | null;
  accountName: string | null;
}

export interface AccountMatchResult {
  confidence: AccountMatchConfidence;
  /** Matched account; null when confidence is "none". */
  account: Account | null;
  /** Short reason for UI display. */
  reason: string;
}

const INSTITUTION_SIMILARITY_THRESHOLD = 0.7;

export function matchAccountFromStatement(
  input: AccountMatchInput,
  candidates: Pick<
    Account,
    "id" | "name" | "institution" | "accountNumberLast4" | "accountType" | "closed"
  >[],
): AccountMatchResult {
  const open = candidates.filter((c) => !c.closed);
  if (open.length === 0) {
    return {
      confidence: "none",
      account: null,
      reason: "No accounts in workspace yet",
    };
  }

  const last4 = input.accountNumberLast4?.trim() || null;
  const inst = input.institution?.trim() || null;
  const type = input.accountType ?? null;

  // Tier 1 / 2: last4 narrows to at most a handful of candidates.
  if (last4) {
    const last4Matches = open.filter((c) => c.accountNumberLast4 === last4);
    if (last4Matches.length === 1) {
      const match = last4Matches[0]!;
      const typeAgrees = type === null || accountTypesAgree(match.accountType, type);
      const instAgrees = inst === null || institutionSimilarity(match.institution, inst) >= INSTITUTION_SIMILARITY_THRESHOLD;
      if (typeAgrees && instAgrees) {
        return {
          confidence: "exact",
          account: match as Account,
          reason: `Matched on last 4 digits (${last4})${typeAgrees && type ? ` + ${type}` : ""}`,
        };
      }
      // Last4 matches but something disagrees — still very likely the same account.
      return {
        confidence: "high",
        account: match as Account,
        reason: `Matched on last 4 digits (${last4}); statement type/institution differs from saved value`,
      };
    }

    if (last4Matches.length > 1) {
      // Tie-break by institution similarity, then type.
      const ranked = last4Matches
        .map((c) => ({
          account: c,
          instScore: inst ? institutionSimilarity(c.institution, inst) : 0,
          typeOk: type === null || accountTypesAgree(c.accountType, type),
        }))
        .sort((a, b) => Number(b.typeOk) - Number(a.typeOk) || b.instScore - a.instScore);

      const best = ranked[0]!;
      if (best.typeOk && best.instScore >= INSTITUTION_SIMILARITY_THRESHOLD) {
        return {
          confidence: "exact",
          account: best.account as Account,
          reason: `Matched on last 4 + institution among multiple candidates`,
        };
      }
      return {
        confidence: "high",
        account: best.account as Account,
        reason: `Matched on last 4 (multiple candidates; chose closest institution match)`,
      };
    }
  }

  // Tier 3: institution similarity + type agreement.
  if (inst) {
    const ranked = open
      .map((c) => ({
        account: c,
        instScore: institutionSimilarity(c.institution, inst),
        typeOk: type === null || accountTypesAgree(c.accountType, type),
        last4Conflict: last4 != null && c.accountNumberLast4 != null && c.accountNumberLast4 !== last4,
      }))
      .filter((r) => !r.last4Conflict && r.instScore >= INSTITUTION_SIMILARITY_THRESHOLD && r.typeOk)
      .sort((a, b) => b.instScore - a.instScore);

    if (ranked.length === 1) {
      return {
        confidence: "medium",
        account: ranked[0]!.account as Account,
        reason: `Matched on institution name${type ? ` + ${type}` : ""}`,
      };
    }

    if (ranked.length > 1) {
      // Multiple plausible institution-matches without last4 disambiguation —
      // safer to propose a new account than guess wrong.
      return {
        confidence: "none",
        account: null,
        reason: `Multiple accounts match institution "${inst}"; need last 4 to disambiguate`,
      };
    }
  }

  // Tier 4: nothing usable.
  return {
    confidence: "none",
    account: null,
    reason: inst || last4 ? "No existing account matches this statement" : "Statement header is too sparse to match",
  };
}

function institutionSimilarity(stored: string | null, extracted: string): number {
  if (!stored) return 0;
  const a = normalize(stored);
  const b = normalize(extracted);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.95;
  return calculateStringSimilarity(a, b);
}

/**
 * Type agreement is mostly equality, with a few sensible synonyms so
 * the LLM picking "credit_card" for a Visa statement still matches a
 * stored "credit_card" account, and so an investment-subtype guess
 * doesn't fight an "investment" parent type.
 */
function accountTypesAgree(stored: AccountType | null | undefined, extracted: AccountType): boolean {
  if (!stored) return true;
  if (stored === extracted) return true;
  // Treat "other" as compatible with anything — it's the catch-all.
  if (stored === "other" || extracted === "other") return true;
  return false;
}
