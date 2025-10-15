import { z } from "zod";
import { publicProcedure, t } from "$lib/trpc";
import { TRPCError } from "@trpc/server";
import {
  medicalExpenseTypeEnum,
  medicalExpenseTypeKeys,
  receiptTypeEnum,
  receiptTypeKeys,
  claimStatusEnum,
  claimStatusKeys,
} from "$lib/schema";
import { serviceFactory } from "$lib/server/shared/container/service-factory";

// Initialize services
const medicalExpenseService = serviceFactory.getMedicalExpenseService();
const receiptService = serviceFactory.getReceiptService();
const claimService = serviceFactory.getClaimService();

// ============================================================================
// Input Schemas
// ============================================================================

const createMedicalExpenseSchema = z.object({
  transactionId: z.number().positive(),
  hsaAccountId: z.number().positive(),
  expenseType: z.enum(medicalExpenseTypeKeys),
  isQualified: z.boolean().optional().default(true),
  provider: z.string().max(200).optional(),
  patientName: z.string().max(100).optional(),
  diagnosis: z.string().max(500).optional(),
  treatmentDescription: z.string().max(1000).optional(),
  amount: z.number().positive().max(1000000),
  insuranceCovered: z.number().min(0).max(1000000).optional().default(0),
  outOfPocket: z.number().positive().max(1000000).optional(),
  serviceDate: z.string().datetime(),
  paidDate: z.string().datetime().optional(),
  taxYear: z.number().min(2000).max(2100).optional(),
  notes: z.string().max(1000).optional(),
});

const createMedicalExpenseWithTransactionSchema = z.object({
  accountId: z.number().positive(),
  hsaAccountId: z.number().positive(),
  expenseType: z.enum(medicalExpenseTypeKeys),
  isQualified: z.boolean().optional().default(true),
  provider: z.string().max(200).optional(),
  patientName: z.string().max(100).optional(),
  diagnosis: z.string().max(500).optional(),
  treatmentDescription: z.string().max(1000).optional(),
  amount: z.number().positive().max(1000000),
  insuranceCovered: z.number().min(0).max(1000000).optional().default(0),
  outOfPocket: z.number().positive().max(1000000).optional(),
  serviceDate: z.string().datetime(),
  paidDate: z.string().datetime().optional(),
  taxYear: z.number().min(2000).max(2100).optional(),
  notes: z.string().max(1000).optional(),
  transactionNotes: z.string().max(500).optional(),
});

const updateMedicalExpenseSchema = z.object({
  id: z.number().positive(),
  expenseType: z.enum(medicalExpenseTypeKeys).optional(),
  isQualified: z.boolean().optional(),
  provider: z.string().max(200).optional(),
  patientName: z.string().max(100).optional(),
  diagnosis: z.string().max(500).optional(),
  treatmentDescription: z.string().max(1000).optional(),
  amount: z.number().positive().max(1000000).optional(),
  insuranceCovered: z.number().min(0).max(1000000).optional(),
  outOfPocket: z.number().positive().max(1000000).optional(),
  serviceDate: z.string().datetime().optional(),
  paidDate: z.string().datetime().optional(),
  taxYear: z.number().min(2000).max(2100).optional(),
  notes: z.string().max(1000).optional(),
});

const createClaimSchema = z.object({
  medicalExpenseId: z.number().positive(),
  claimNumber: z.string().max(100).optional(),
  claimedAmount: z.number().positive().max(1000000),
  administratorName: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  internalNotes: z.string().max(1000).optional(),
});

const submitClaimSchema = z.object({
  id: z.number().positive(),
  claimNumber: z.string().max(100).optional(),
  submittedDate: z.string().datetime().optional(),
});

const approveClaimSchema = z.object({
  id: z.number().positive(),
  approvedAmount: z.number().positive().max(1000000),
  deniedAmount: z.number().min(0).max(1000000).optional(),
  approvalDate: z.string().datetime().optional(),
});

const denyClaimSchema = z.object({
  id: z.number().positive(),
  denialReason: z.string().min(1).max(1000),
  denialCode: z.string().max(50).optional(),
});

const markClaimPaidSchema = z.object({
  id: z.number().positive(),
  paidAmount: z.number().positive().max(1000000),
  paymentDate: z.string().datetime().optional(),
});

const updateClaimSchema = z.object({
  id: z.number().positive(),
  claimNumber: z.string().max(100).optional(),
  status: z.enum(claimStatusKeys).optional(),
  claimedAmount: z.number().positive().max(1000000).optional(),
  approvedAmount: z.number().min(0).max(1000000).optional(),
  deniedAmount: z.number().min(0).max(1000000).optional(),
  paidAmount: z.number().min(0).max(1000000).optional(),
  denialReason: z.string().max(1000).optional(),
  denialCode: z.string().max(50).optional(),
  administratorName: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  internalNotes: z.string().max(1000).optional(),
});

const updateReceiptSchema = z.object({
  id: z.number().positive(),
  receiptType: z.enum(receiptTypeKeys).optional(),
  description: z.string().max(500).optional(),
});

// ============================================================================
// Medical Expenses Routes
// ============================================================================

export const medicalExpensesRouter = t.router({
  // Create medical expense
  create: publicProcedure
    .input(createMedicalExpenseSchema)
    .mutation(async ({ input }) => {
      try {
        // Build data object conditionally for exactOptionalPropertyTypes
        const data: any = {
          transactionId: input.transactionId,
          hsaAccountId: input.hsaAccountId,
          expenseType: input.expenseType,
          amount: input.amount,
          serviceDate: input.serviceDate,
        };

        if (input.isQualified !== undefined) data.isQualified = input.isQualified;
        if (input.provider) data.provider = input.provider;
        if (input.patientName) data.patientName = input.patientName;
        if (input.diagnosis) data.diagnosis = input.diagnosis;
        if (input.treatmentDescription) data.treatmentDescription = input.treatmentDescription;
        if (input.insuranceCovered !== undefined) data.insuranceCovered = input.insuranceCovered;
        if (input.outOfPocket !== undefined) data.outOfPocket = input.outOfPocket;
        if (input.paidDate) data.paidDate = input.paidDate;
        if (input.taxYear) data.taxYear = input.taxYear;
        if (input.notes) data.notes = input.notes;

        const expense = await medicalExpenseService.createMedicalExpense(data);
        return expense;
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 409 ? "CONFLICT" : "BAD_REQUEST",
          message: error.message || "Failed to create medical expense",
        });
      }
    }),

  // Create medical expense with transaction (all-in-one)
  createWithTransaction: publicProcedure
    .input(createMedicalExpenseWithTransactionSchema)
    .mutation(async ({ input }) => {
      try {
        // Build data object conditionally for exactOptionalPropertyTypes
        const data: any = {
          accountId: input.accountId,
          hsaAccountId: input.hsaAccountId,
          expenseType: input.expenseType,
          amount: input.amount,
          serviceDate: input.serviceDate,
        };

        if (input.isQualified !== undefined) data.isQualified = input.isQualified;
        if (input.provider) data.provider = input.provider;
        if (input.patientName) data.patientName = input.patientName;
        if (input.diagnosis) data.diagnosis = input.diagnosis;
        if (input.treatmentDescription) data.treatmentDescription = input.treatmentDescription;
        if (input.insuranceCovered !== undefined) data.insuranceCovered = input.insuranceCovered;
        if (input.outOfPocket !== undefined) data.outOfPocket = input.outOfPocket;
        if (input.paidDate) data.paidDate = input.paidDate;
        if (input.taxYear) data.taxYear = input.taxYear;
        if (input.notes) data.notes = input.notes;
        if (input.transactionNotes) data.transactionNotes = input.transactionNotes;

        const expense = await medicalExpenseService.createMedicalExpenseWithTransaction(data);
        return expense;
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 409 ? "CONFLICT" : "BAD_REQUEST",
          message: error.message || "Failed to create medical expense with transaction",
        });
      }
    }),

  // Update medical expense
  update: publicProcedure
    .input(updateMedicalExpenseSchema)
    .mutation(async ({ input }) => {
      try {
        const { id, ...inputData } = input;

        // Build data object conditionally for exactOptionalPropertyTypes
        const data: any = {};
        if (inputData.expenseType) data.expenseType = inputData.expenseType;
        if (inputData.isQualified !== undefined) data.isQualified = inputData.isQualified;
        if (inputData.provider) data.provider = inputData.provider;
        if (inputData.patientName) data.patientName = inputData.patientName;
        if (inputData.diagnosis) data.diagnosis = inputData.diagnosis;
        if (inputData.treatmentDescription) data.treatmentDescription = inputData.treatmentDescription;
        if (inputData.amount !== undefined) data.amount = inputData.amount;
        if (inputData.insuranceCovered !== undefined) data.insuranceCovered = inputData.insuranceCovered;
        if (inputData.outOfPocket !== undefined) data.outOfPocket = inputData.outOfPocket;
        if (inputData.serviceDate) data.serviceDate = inputData.serviceDate;
        if (inputData.paidDate) data.paidDate = inputData.paidDate;
        if (inputData.taxYear) data.taxYear = inputData.taxYear;
        if (inputData.notes) data.notes = inputData.notes;

        const expense = await medicalExpenseService.updateMedicalExpense(id, data);
        return expense;
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" : "BAD_REQUEST",
          message: error.message || "Failed to update medical expense",
        });
      }
    }),

  // Get medical expense by ID with relations
  getById: publicProcedure
    .input(z.object({ id: z.number().positive() }))
    .query(async ({ input }) => {
      try {
        const expense = await medicalExpenseService.getMedicalExpenseWithRelations(input.id);
        if (!expense) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Medical expense not found",
          });
        }
        return expense;
      } catch (error: any) {
        throw new TRPCError({
          code: error.code || "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to fetch medical expense",
        });
      }
    }),

  // Get all medical expenses for an HSA account
  getByAccount: publicProcedure
    .input(z.object({ hsaAccountId: z.number().positive() }))
    .query(async ({ input }) => {
      try {
        const expenses = await medicalExpenseService.getMedicalExpensesByAccount(
          input.hsaAccountId
        );
        return expenses;
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message || "Failed to fetch medical expenses",
        });
      }
    }),

  // Get medical expenses by tax year
  getByTaxYear: publicProcedure
    .input(
      z.object({
        hsaAccountId: z.number().positive(),
        taxYear: z.number().min(2000).max(2100),
      })
    )
    .query(async ({ input }) => {
      try {
        const expenses = await medicalExpenseService.getMedicalExpensesByTaxYear(
          input.hsaAccountId,
          input.taxYear
        );
        return expenses;
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message || "Failed to fetch medical expenses",
        });
      }
    }),

  // Get all expenses with claims and receipts for data table
  getAllWithRelations: publicProcedure
    .input(z.object({ hsaAccountId: z.number().positive() }))
    .query(async ({ input }) => {
      try {
        const expenses = await medicalExpenseService.getAllExpensesWithRelations(
          input.hsaAccountId
        );
        return expenses;
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message || "Failed to fetch medical expenses",
        });
      }
    }),

  // Get tax year summary
  getTaxYearSummary: publicProcedure
    .input(
      z.object({
        hsaAccountId: z.number().positive(),
        taxYear: z.number().min(2000).max(2100),
      })
    )
    .query(async ({ input }) => {
      try {
        const summary = await medicalExpenseService.getTaxYearSummary(
          input.hsaAccountId,
          input.taxYear
        );
        return summary;
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message || "Failed to fetch tax year summary",
        });
      }
    }),

  // Delete medical expense
  delete: publicProcedure
    .input(z.object({ id: z.number().positive() }))
    .mutation(async ({ input }) => {
      try {
        await medicalExpenseService.deleteMedicalExpense(input.id);
        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" : "BAD_REQUEST",
          message: error.message || "Failed to delete medical expense",
        });
      }
    }),

  // ============================================================================
  // Receipt Routes
  // ============================================================================

  // Get receipts for a medical expense
  getReceipts: publicProcedure
    .input(z.object({ medicalExpenseId: z.number().positive() }))
    .query(async ({ input }) => {
      try {
        const receipts = await receiptService.getReceiptsByExpense(input.medicalExpenseId);
        return receipts;
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message || "Failed to fetch receipts",
        });
      }
    }),

  // Get receipt by ID
  getReceipt: publicProcedure
    .input(z.object({ id: z.number().positive() }))
    .query(async ({ input }) => {
      try {
        const receipt = await receiptService.getReceipt(input.id);
        return receipt;
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" : "BAD_REQUEST",
          message: error.message || "Failed to fetch receipt",
        });
      }
    }),

  // Update receipt
  updateReceipt: publicProcedure
    .input(updateReceiptSchema)
    .mutation(async ({ input }) => {
      try {
        const { id, ...inputData } = input;

        // Build data object conditionally for exactOptionalPropertyTypes
        const data: any = {};
        if (inputData.receiptType) data.receiptType = inputData.receiptType;
        if (inputData.description) data.description = inputData.description;

        const receipt = await receiptService.updateReceipt(id, data);
        return receipt;
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" : "BAD_REQUEST",
          message: error.message || "Failed to update receipt",
        });
      }
    }),

  // Delete receipt
  deleteReceipt: publicProcedure
    .input(z.object({ id: z.number().positive() }))
    .mutation(async ({ input }) => {
      try {
        await receiptService.deleteReceipt(input.id);
        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" : "BAD_REQUEST",
          message: error.message || "Failed to delete receipt",
        });
      }
    }),

  // Count receipts for an expense
  countReceipts: publicProcedure
    .input(z.object({ medicalExpenseId: z.number().positive() }))
    .query(async ({ input }) => {
      try {
        const count = await receiptService.countReceipts(input.medicalExpenseId);
        return { count };
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message || "Failed to count receipts",
        });
      }
    }),

  // ============================================================================
  // Claim Routes
  // ============================================================================

  // Create claim
  createClaim: publicProcedure
    .input(createClaimSchema)
    .mutation(async ({ input }) => {
      try {
        // Build data object conditionally for exactOptionalPropertyTypes
        const data: any = {
          medicalExpenseId: input.medicalExpenseId,
          claimedAmount: input.claimedAmount,
        };

        if (input.claimNumber) data.claimNumber = input.claimNumber;
        if (input.administratorName) data.administratorName = input.administratorName;
        if (input.notes) data.notes = input.notes;
        if (input.internalNotes) data.internalNotes = input.internalNotes;

        const claim = await claimService.createClaim(data);
        return claim;
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message || "Failed to create claim",
        });
      }
    }),

  // Submit claim
  submitClaim: publicProcedure
    .input(submitClaimSchema)
    .mutation(async ({ input }) => {
      try {
        const { id, ...inputData } = input;

        // Build data object conditionally for exactOptionalPropertyTypes
        const data: any = {};
        if (inputData.claimNumber) data.claimNumber = inputData.claimNumber;
        if (inputData.submittedDate) data.submittedDate = inputData.submittedDate;

        const claim = await claimService.submitClaim(id, data);
        return claim;
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" : "BAD_REQUEST",
          message: error.message || "Failed to submit claim",
        });
      }
    }),

  // Mark claim in review
  markClaimInReview: publicProcedure
    .input(
      z.object({
        id: z.number().positive(),
        reviewDate: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const claim = await claimService.markInReview(input.id, input.reviewDate);
        return claim;
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" : "BAD_REQUEST",
          message: error.message || "Failed to mark claim in review",
        });
      }
    }),

  // Approve claim
  approveClaim: publicProcedure
    .input(approveClaimSchema)
    .mutation(async ({ input }) => {
      try {
        const { id, ...inputData } = input;

        // Build data object conditionally for exactOptionalPropertyTypes
        const data: any = {
          approvedAmount: inputData.approvedAmount,
        };

        if (inputData.deniedAmount !== undefined) data.deniedAmount = inputData.deniedAmount;
        if (inputData.approvalDate) data.approvalDate = inputData.approvalDate;

        const claim = await claimService.approveClaim(id, data);
        return claim;
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" : "BAD_REQUEST",
          message: error.message || "Failed to approve claim",
        });
      }
    }),

  // Deny claim
  denyClaim: publicProcedure
    .input(denyClaimSchema)
    .mutation(async ({ input }) => {
      try {
        const { id, ...inputData } = input;

        // Build data object conditionally for exactOptionalPropertyTypes
        const data: any = {
          denialReason: inputData.denialReason,
        };

        if (inputData.denialCode) data.denialCode = inputData.denialCode;

        const claim = await claimService.denyClaim(id, data);
        return claim;
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" : "BAD_REQUEST",
          message: error.message || "Failed to deny claim",
        });
      }
    }),

  // Mark claim paid
  markClaimPaid: publicProcedure
    .input(markClaimPaidSchema)
    .mutation(async ({ input }) => {
      try {
        const { id, ...inputData } = input;

        // Build data object conditionally for exactOptionalPropertyTypes
        const data: any = {
          paidAmount: inputData.paidAmount,
        };

        if (inputData.paymentDate) data.paymentDate = inputData.paymentDate;

        const claim = await claimService.markPaid(id, data);
        return claim;
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" : "BAD_REQUEST",
          message: error.message || "Failed to mark claim as paid",
        });
      }
    }),

  // Request resubmission
  requestResubmission: publicProcedure
    .input(
      z.object({
        id: z.number().positive(),
        reason: z.string().min(1).max(1000),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const claim = await claimService.requestResubmission(input.id, input.reason);
        return claim;
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" : "BAD_REQUEST",
          message: error.message || "Failed to request resubmission",
        });
      }
    }),

  // Withdraw claim
  withdrawClaim: publicProcedure
    .input(z.object({ id: z.number().positive() }))
    .mutation(async ({ input }) => {
      try {
        const claim = await claimService.withdrawClaim(input.id);
        return claim;
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" : "BAD_REQUEST",
          message: error.message || "Failed to withdraw claim",
        });
      }
    }),

  // Update claim
  updateClaim: publicProcedure
    .input(updateClaimSchema)
    .mutation(async ({ input }) => {
      try {
        const { id, ...inputData } = input;

        // Build data object conditionally for exactOptionalPropertyTypes
        const data: any = {};

        if (inputData.claimNumber) data.claimNumber = inputData.claimNumber;
        if (inputData.status) data.status = inputData.status;
        if (inputData.claimedAmount !== undefined) data.claimedAmount = inputData.claimedAmount;
        if (inputData.approvedAmount !== undefined) data.approvedAmount = inputData.approvedAmount;
        if (inputData.deniedAmount !== undefined) data.deniedAmount = inputData.deniedAmount;
        if (inputData.paidAmount !== undefined) data.paidAmount = inputData.paidAmount;
        if (inputData.denialReason) data.denialReason = inputData.denialReason;
        if (inputData.denialCode) data.denialCode = inputData.denialCode;
        if (inputData.administratorName) data.administratorName = inputData.administratorName;
        if (inputData.notes) data.notes = inputData.notes;
        if (inputData.internalNotes) data.internalNotes = inputData.internalNotes;

        const claim = await claimService.updateClaim(id, data);
        return claim;
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" : "BAD_REQUEST",
          message: error.message || "Failed to update claim",
        });
      }
    }),

  // Get claims for a medical expense
  getClaims: publicProcedure
    .input(z.object({ medicalExpenseId: z.number().positive() }))
    .query(async ({ input }) => {
      try {
        const claims = await claimService.getClaimsByExpense(input.medicalExpenseId);
        return claims;
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message || "Failed to fetch claims",
        });
      }
    }),

  // Get pending claims
  getPendingClaims: publicProcedure.query(async () => {
    try {
      const claims = await claimService.getPendingClaims();
      return claims;
    } catch (error: any) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: error.message || "Failed to fetch pending claims",
      });
    }
  }),

  // Delete claim
  deleteClaim: publicProcedure
    .input(z.object({ id: z.number().positive() }))
    .mutation(async ({ input }) => {
      try {
        await claimService.deleteClaim(input.id);
        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" : "BAD_REQUEST",
          message: error.message || "Failed to delete claim",
        });
      }
    }),
});
