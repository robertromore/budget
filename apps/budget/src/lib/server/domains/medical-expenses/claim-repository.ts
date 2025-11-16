import { BaseRepository } from "$lib/server/shared/database/base-repository";
import { db } from "$lib/server/shared/database";
import { hsaClaims, type HsaClaim, type ClaimStatus } from "$lib/schema/hsa-claims";
import { eq, and, isNull, desc, inArray } from "drizzle-orm";

// Types for claim operations
export interface CreateClaimInput {
  medicalExpenseId: number;
  claimNumber?: string;
  status?: ClaimStatus;
  claimedAmount: number;
  approvedAmount?: number;
  deniedAmount?: number;
  paidAmount?: number;
  submittedDate?: string;
  reviewDate?: string;
  approvalDate?: string;
  paymentDate?: string;
  denialReason?: string;
  denialCode?: string;
  administratorName?: string;
  notes?: string;
  internalNotes?: string;
}

export interface UpdateClaimInput {
  claimNumber?: string;
  status?: ClaimStatus;
  claimedAmount?: number;
  approvedAmount?: number;
  deniedAmount?: number;
  paidAmount?: number;
  submittedDate?: string;
  reviewDate?: string;
  approvalDate?: string;
  paymentDate?: string;
  denialReason?: string;
  denialCode?: string;
  administratorName?: string;
  notes?: string;
  internalNotes?: string;
}

/**
 * HSA Claim repository with domain-specific operations
 */
export class ClaimRepository extends BaseRepository<
  typeof hsaClaims,
  HsaClaim,
  CreateClaimInput,
  UpdateClaimInput
> {
  constructor() {
    super(db, hsaClaims, "HsaClaim");
  }

  /**
   * Find all claims for a medical expense
   */
  async findByMedicalExpenseId(medicalExpenseId: number): Promise<HsaClaim[]> {
    return await db
      .select()
      .from(hsaClaims)
      .where(and(eq(hsaClaims.medicalExpenseId, medicalExpenseId), isNull(hsaClaims.deletedAt)))
      .orderBy(desc(hsaClaims.createdAt))
      .execute();
  }

  /**
   * Find claims by status
   */
  async findByStatus(status: ClaimStatus): Promise<HsaClaim[]> {
    return await db
      .select()
      .from(hsaClaims)
      .where(and(eq(hsaClaims.status, status), isNull(hsaClaims.deletedAt)))
      .orderBy(desc(hsaClaims.submittedDate))
      .execute();
  }

  /**
   * Find claims by multiple statuses
   */
  async findByStatuses(statuses: ClaimStatus[]): Promise<HsaClaim[]> {
    return await db
      .select()
      .from(hsaClaims)
      .where(and(inArray(hsaClaims.status, statuses), isNull(hsaClaims.deletedAt)))
      .orderBy(desc(hsaClaims.submittedDate))
      .execute();
  }

  /**
   * Find pending claims (submitted or in review)
   */
  async findPending(): Promise<HsaClaim[]> {
    return await this.findByStatuses(["submitted", "in_review", "pending_submission"]);
  }

  /**
   * Count claims by status
   */
  async countByStatus(status: ClaimStatus): Promise<number> {
    const result = await db
      .select({ count: db.$count(hsaClaims.id) })
      .from(hsaClaims)
      .where(and(eq(hsaClaims.status, status), isNull(hsaClaims.deletedAt)))
      .execute();

    return result[0]?.count || 0;
  }
}
