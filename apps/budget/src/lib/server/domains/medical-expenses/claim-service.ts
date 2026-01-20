import type { ClaimStatus, HsaClaim } from "$lib/schema/hsa-claims";
import { NotFoundError, ValidationError } from "$lib/server/shared/types/errors";
import { InputSanitizer } from "$lib/server/shared/validation";
import { nowISOString } from "$lib/utils/dates";
import { ClaimRepository } from "./claim-repository";
import { MedicalExpenseRepository } from "./repository";

// Service input types
export interface CreateClaimData {
  medicalExpenseId: number;
  claimNumber?: string;
  claimedAmount: number;
  administratorName?: string;
  notes?: string;
  internalNotes?: string;
}

export interface UpdateClaimData {
  claimNumber?: string;
  status?: ClaimStatus;
  claimedAmount?: number;
  approvedAmount?: number;
  deniedAmount?: number;
  paidAmount?: number;
  denialReason?: string;
  denialCode?: string;
  administratorName?: string;
  notes?: string;
  internalNotes?: string;
}

export interface SubmitClaimData {
  claimNumber?: string;
  submittedDate?: string;
}

export interface ApproveClaimData {
  approvedAmount: number;
  deniedAmount?: number;
  approvalDate?: string;
}

export interface PayClaimData {
  paidAmount: number;
  paymentDate?: string;
}

export interface DenyClaimData {
  denialReason: string;
  denialCode?: string;
}

/**
 * HSA Claim service for managing claim lifecycle
 *
 * Dependencies are injected via constructor for testability.
 * Use ServiceFactory to instantiate in production code.
 */
export class ClaimService {
  constructor(
    private claimRepository: ClaimRepository,
    private medicalExpenseRepository: MedicalExpenseRepository
  ) {}

  /**
   * Create a new claim
   */
  async createClaim(data: CreateClaimData): Promise<HsaClaim> {
    // Validate medical expense exists
    const expense = await this.medicalExpenseRepository.findById(data.medicalExpenseId);
    if (!expense) {
      throw new NotFoundError("MedicalExpense", data.medicalExpenseId.toString());
    }

    // Sanitize text inputs
    const sanitizedClaimNumber = data.claimNumber
      ? InputSanitizer.sanitizeText(data.claimNumber)
      : undefined;
    const sanitizedAdministrator = data.administratorName
      ? InputSanitizer.sanitizeText(data.administratorName)
      : undefined;
    const sanitizedNotes = data.notes ? InputSanitizer.sanitizeDescription(data.notes) : undefined;
    const sanitizedInternalNotes = data.internalNotes
      ? InputSanitizer.sanitizeDescription(data.internalNotes)
      : undefined;

    // Validate claimed amount
    const claimedAmount = InputSanitizer.validateAmount(data.claimedAmount, "Claimed amount");

    // Create claim with "not_submitted" status
    const claimData: any = {
      medicalExpenseId: data.medicalExpenseId,
      status: "not_submitted",
      claimedAmount,
    };

    if (sanitizedClaimNumber) claimData.claimNumber = sanitizedClaimNumber;
    if (sanitizedAdministrator) claimData.administratorName = sanitizedAdministrator;
    if (sanitizedNotes) claimData.notes = sanitizedNotes;
    if (sanitizedInternalNotes) claimData.internalNotes = sanitizedInternalNotes;

    const claim = await this.claimRepository.create(claimData);

    return claim;
  }

  /**
   * Submit a claim
   */
  async submitClaim(id: number, data: SubmitClaimData): Promise<HsaClaim> {
    const claim = await this.claimRepository.findById(id);
    if (!claim) {
      throw new NotFoundError("HsaClaim", id.toString());
    }

    // Validate current status allows submission
    if (!["not_submitted", "resubmission_required"].includes(claim.status)) {
      throw new ValidationError(`Cannot submit claim with status: ${claim.status}`);
    }

    const sanitizedClaimNumber = data.claimNumber
      ? InputSanitizer.sanitizeText(data.claimNumber)
      : undefined;

    const submittedDate = data.submittedDate || nowISOString();

    // Build update object conditionally to satisfy exactOptionalPropertyTypes
    const updateData: any = {
      status: "submitted" as const,
      submittedDate,
    };

    const finalClaimNumber = sanitizedClaimNumber || claim.claimNumber;
    if (finalClaimNumber) {
      updateData.claimNumber = finalClaimNumber;
    }

    const updated = await this.claimRepository.update(id, updateData);

    return updated;
  }

  /**
   * Mark claim as in review
   */
  async markInReview(id: number, reviewDate?: string): Promise<HsaClaim> {
    const claim = await this.claimRepository.findById(id);
    if (!claim) {
      throw new NotFoundError("HsaClaim", id.toString());
    }

    if (claim.status !== "submitted") {
      throw new ValidationError(`Cannot mark claim as in review. Current status: ${claim.status}`);
    }

    const updated = await this.claimRepository.update(id, {
      status: "in_review",
      reviewDate: reviewDate || nowISOString(),
    });

    return updated;
  }

  /**
   * Approve a claim
   */
  async approveClaim(id: number, data: ApproveClaimData): Promise<HsaClaim> {
    const claim = await this.claimRepository.findById(id);
    if (!claim) {
      throw new NotFoundError("HsaClaim", id.toString());
    }

    if (!["in_review", "submitted"].includes(claim.status)) {
      throw new ValidationError(`Cannot approve claim with status: ${claim.status}`);
    }

    const approvedAmount = InputSanitizer.validateAmount(data.approvedAmount, "Approved amount");
    const deniedAmount =
      data.deniedAmount !== undefined
        ? InputSanitizer.validateAmount(data.deniedAmount, "Denied amount")
        : 0;

    // Validate amounts
    if (approvedAmount + deniedAmount > claim.claimedAmount) {
      throw new ValidationError("Approved + denied amounts cannot exceed claimed amount");
    }

    const status: ClaimStatus = deniedAmount > 0 ? "partially_approved" : "approved";
    const approvalDate = data.approvalDate || nowISOString();

    const updated = await this.claimRepository.update(id, {
      status,
      approvedAmount,
      deniedAmount,
      approvalDate,
    });

    return updated;
  }

  /**
   * Deny a claim
   */
  async denyClaim(id: number, data: DenyClaimData): Promise<HsaClaim> {
    const claim = await this.claimRepository.findById(id);
    if (!claim) {
      throw new NotFoundError("HsaClaim", id.toString());
    }

    if (!["in_review", "submitted"].includes(claim.status)) {
      throw new ValidationError(`Cannot deny claim with status: ${claim.status}`);
    }

    const sanitizedReason = InputSanitizer.sanitizeDescription(data.denialReason);
    const sanitizedCode = data.denialCode
      ? InputSanitizer.sanitizeText(data.denialCode)
      : undefined;

    // Build update object conditionally to satisfy exactOptionalPropertyTypes
    const updateData: any = {
      status: "denied" as const,
      deniedAmount: claim.claimedAmount,
      denialReason: sanitizedReason,
    };

    if (sanitizedCode) {
      updateData.denialCode = sanitizedCode;
    }

    const updated = await this.claimRepository.update(id, updateData);

    return updated;
  }

  /**
   * Mark claim as paid
   */
  async markPaid(id: number, data: PayClaimData): Promise<HsaClaim> {
    const claim = await this.claimRepository.findById(id);
    if (!claim) {
      throw new NotFoundError("HsaClaim", id.toString());
    }

    if (!["approved", "partially_approved"].includes(claim.status)) {
      throw new ValidationError(`Cannot mark claim as paid. Current status: ${claim.status}`);
    }

    const paidAmount = InputSanitizer.validateAmount(data.paidAmount, "Paid amount");

    // Validate paid amount doesn't exceed approved amount
    if (paidAmount > (claim.approvedAmount || 0)) {
      throw new ValidationError("Paid amount cannot exceed approved amount");
    }

    const paymentDate = data.paymentDate || nowISOString();

    const updated = await this.claimRepository.update(id, {
      status: "paid",
      paidAmount,
      paymentDate,
    });

    return updated;
  }

  /**
   * Request resubmission
   */
  async requestResubmission(id: number, reason: string): Promise<HsaClaim> {
    const claim = await this.claimRepository.findById(id);
    if (!claim) {
      throw new NotFoundError("HsaClaim", id.toString());
    }

    const sanitizedReason = InputSanitizer.sanitizeDescription(reason);

    const updated = await this.claimRepository.update(id, {
      status: "resubmission_required",
      internalNotes: sanitizedReason,
    });

    return updated;
  }

  /**
   * Withdraw a claim
   */
  async withdrawClaim(id: number): Promise<HsaClaim> {
    const claim = await this.claimRepository.findById(id);
    if (!claim) {
      throw new NotFoundError("HsaClaim", id.toString());
    }

    // Can't withdraw paid claims
    if (claim.status === "paid") {
      throw new ValidationError("Cannot withdraw a paid claim");
    }

    const updated = await this.claimRepository.update(id, {
      status: "withdrawn",
    });

    return updated;
  }

  /**
   * Update claim
   */
  async updateClaim(id: number, data: UpdateClaimData): Promise<HsaClaim> {
    const claim = await this.claimRepository.findById(id);
    if (!claim) {
      throw new NotFoundError("HsaClaim", id.toString());
    }

    // Sanitize inputs
    const sanitizedClaimNumber = data.claimNumber
      ? InputSanitizer.sanitizeText(data.claimNumber)
      : undefined;
    const sanitizedAdministrator = data.administratorName
      ? InputSanitizer.sanitizeText(data.administratorName)
      : undefined;
    const sanitizedNotes = data.notes ? InputSanitizer.sanitizeDescription(data.notes) : undefined;
    const sanitizedInternalNotes = data.internalNotes
      ? InputSanitizer.sanitizeDescription(data.internalNotes)
      : undefined;
    const sanitizedDenialReason = data.denialReason
      ? InputSanitizer.sanitizeDescription(data.denialReason)
      : undefined;
    const sanitizedDenialCode = data.denialCode
      ? InputSanitizer.sanitizeText(data.denialCode)
      : undefined;

    // Validate amounts if provided
    const claimedAmount =
      data.claimedAmount !== undefined
        ? InputSanitizer.validateAmount(data.claimedAmount, "Claimed amount")
        : undefined;
    const approvedAmount =
      data.approvedAmount !== undefined
        ? InputSanitizer.validateAmount(data.approvedAmount, "Approved amount")
        : undefined;
    const deniedAmount =
      data.deniedAmount !== undefined
        ? InputSanitizer.validateAmount(data.deniedAmount, "Denied amount")
        : undefined;
    const paidAmount =
      data.paidAmount !== undefined
        ? InputSanitizer.validateAmount(data.paidAmount, "Paid amount")
        : undefined;

    // Build update object conditionally to satisfy exactOptionalPropertyTypes
    const updateData: any = {};

    if (sanitizedClaimNumber) updateData.claimNumber = sanitizedClaimNumber;
    if (data.status) updateData.status = data.status;
    if (claimedAmount !== undefined) updateData.claimedAmount = claimedAmount;
    if (approvedAmount !== undefined) updateData.approvedAmount = approvedAmount;
    if (deniedAmount !== undefined) updateData.deniedAmount = deniedAmount;
    if (paidAmount !== undefined) updateData.paidAmount = paidAmount;
    if (sanitizedDenialReason) updateData.denialReason = sanitizedDenialReason;
    if (sanitizedDenialCode) updateData.denialCode = sanitizedDenialCode;
    if (sanitizedAdministrator) updateData.administratorName = sanitizedAdministrator;
    if (sanitizedNotes) updateData.notes = sanitizedNotes;
    if (sanitizedInternalNotes) updateData.internalNotes = sanitizedInternalNotes;

    const updated = await this.claimRepository.update(id, updateData);

    return updated;
  }

  /**
   * Get all claims for a medical expense
   */
  async getClaimsByExpense(medicalExpenseId: number): Promise<HsaClaim[]> {
    return await this.claimRepository.findByMedicalExpenseId(medicalExpenseId);
  }

  /**
   * Get pending claims
   */
  async getPendingClaims(): Promise<HsaClaim[]> {
    return await this.claimRepository.findPending();
  }

  /**
   * Delete claim (soft delete)
   */
  async deleteClaim(id: number): Promise<void> {
    const claim = await this.claimRepository.findById(id);
    if (!claim) {
      throw new NotFoundError("HsaClaim", id.toString());
    }
    await this.claimRepository.delete(id);
  }
}
