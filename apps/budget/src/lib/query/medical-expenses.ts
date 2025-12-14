import type { ExpenseReceipt, ReceiptType } from "$lib/schema/expense-receipts";
import type { ClaimStatus, HsaClaim } from "$lib/schema/hsa-claims";
import type { MedicalExpense } from "$lib/schema/medical-expenses";
import { medicalExpenseTypeEnum } from "$lib/schema/medical-expenses";
import { trpc } from "$lib/trpc/client";
import { cachePatterns } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

/**
 * Query Keys for medical expense operations
 */
export const medicalExpenseKeys = createQueryKeys("medical-expenses", {
  lists: () => ["medical-expenses", "list"] as const,
  details: () => ["medical-expenses", "detail"] as const,
  detail: (id: number) => ["medical-expenses", "detail", id] as const,
  byAccount: (hsaAccountId: number) => ["medical-expenses", "account", hsaAccountId] as const,
  allWithRelations: (hsaAccountId: number) =>
    ["medical-expenses", "all-relations", hsaAccountId] as const,
  byTaxYear: (hsaAccountId: number, taxYear: number) =>
    ["medical-expenses", "tax-year", hsaAccountId, taxYear] as const,
  taxYearSummary: (hsaAccountId: number, taxYear: number) =>
    ["medical-expenses", "summary", hsaAccountId, taxYear] as const,
  receipts: (medicalExpenseId: number) => ["receipts", "expense", medicalExpenseId] as const,
  receipt: (id: number) => ["receipts", "detail", id] as const,
  receiptCount: (medicalExpenseId: number) => ["receipts", "count", medicalExpenseId] as const,
  claims: (medicalExpenseId: number) => ["claims", "expense", medicalExpenseId] as const,
  pendingClaims: () => ["claims", "pending"] as const,
});

// ============================================================================
// Medical Expense Queries
// ============================================================================

/**
 * Get medical expense by ID with relations (receipts, claims)
 */
export const getMedicalExpenseById = (id: number) => {
  return defineQuery({
    queryKey: medicalExpenseKeys.detail(id),
    queryFn: () => trpc().medicalExpensesRouter.getById.query({ id }),
    options: {
      staleTime: 60 * 1000, // 1 minute
    },
  });
};

/**
 * Get all medical expenses for an HSA account
 */
export const getMedicalExpensesByAccount = (hsaAccountId: number) => {
  return defineQuery({
    queryKey: medicalExpenseKeys.byAccount(hsaAccountId),
    queryFn: () => trpc().medicalExpensesRouter.getByAccount.query({ hsaAccountId }),
    options: {
      staleTime: 30 * 1000, // 30 seconds
    },
  });
};

/**
 * Get medical expenses by tax year
 */
export const getMedicalExpensesByTaxYear = (hsaAccountId: number, taxYear: number) => {
  return defineQuery({
    queryKey: medicalExpenseKeys.byTaxYear(hsaAccountId, taxYear),
    queryFn: () => trpc().medicalExpensesRouter.getByTaxYear.query({ hsaAccountId, taxYear }),
    options: {
      staleTime: 60 * 1000, // 1 minute
    },
  });
};

/**
 * Get tax year summary (aggregated statistics)
 */
export const getTaxYearSummary = (hsaAccountId: number, taxYear: number) => {
  return defineQuery({
    queryKey: medicalExpenseKeys.taxYearSummary(hsaAccountId, taxYear),
    queryFn: () => trpc().medicalExpensesRouter.getTaxYearSummary.query({ hsaAccountId, taxYear }),
    options: {
      staleTime: 60 * 1000, // 1 minute
    },
  });
};

/**
 * Get all medical expenses with claims and receipts for data table
 */
export const getAllExpensesWithRelations = (hsaAccountId: number) => {
  return defineQuery({
    queryKey: medicalExpenseKeys.allWithRelations(hsaAccountId),
    queryFn: () => trpc().medicalExpensesRouter.getAllWithRelations.query({ hsaAccountId }),
    options: {
      staleTime: 30 * 1000, // 30 seconds
    },
  });
};

// ============================================================================
// Medical Expense Mutations
// ============================================================================

/**
 * Create medical expense
 */
export const createMedicalExpense = defineMutation<
  {
    transactionId: number;
    hsaAccountId: number;
    expenseType: (typeof medicalExpenseTypeEnum)[number];
    isQualified?: boolean;
    provider?: string;
    patientName?: string;
    diagnosis?: string;
    treatmentDescription?: string;
    amount: number;
    insuranceCovered?: number;
    outOfPocket?: number;
    serviceDate: string;
    paidDate?: string;
    taxYear?: number;
    notes?: string;
  },
  MedicalExpense
>({
  mutationFn: (variables) => trpc().medicalExpensesRouter.create.mutate(variables),
  onSuccess: (newExpense, variables) => {
    // Invalidate all related queries
    cachePatterns.invalidatePrefix(medicalExpenseKeys.byAccount(variables.hsaAccountId));
    cachePatterns.invalidatePrefix(medicalExpenseKeys.allWithRelations(variables.hsaAccountId));
    if (newExpense.taxYear) {
      cachePatterns.invalidatePrefix(
        medicalExpenseKeys.byTaxYear(variables.hsaAccountId, newExpense.taxYear)
      );
      cachePatterns.invalidatePrefix(
        medicalExpenseKeys.taxYearSummary(variables.hsaAccountId, newExpense.taxYear)
      );
    }
  },
  successMessage: "Medical expense created successfully",
  errorMessage: "Failed to create medical expense",
});

/**
 * Create medical expense with transaction
 * Creates both a transaction and medical expense record in one operation
 */
export const createMedicalExpenseWithTransaction = defineMutation<
  {
    accountId: number;
    hsaAccountId: number;
    expenseType: (typeof medicalExpenseTypeEnum)[number];
    isQualified?: boolean;
    provider?: string;
    patientName?: string;
    diagnosis?: string;
    treatmentDescription?: string;
    amount: number;
    insuranceCovered?: number;
    outOfPocket?: number;
    serviceDate: string;
    paidDate?: string;
    taxYear?: number;
    notes?: string;
    transactionNotes?: string;
  },
  MedicalExpense
>({
  mutationFn: (variables) => trpc().medicalExpensesRouter.createWithTransaction.mutate(variables),
  onSuccess: (newExpense, variables) => {
    // Invalidate all related queries
    cachePatterns.invalidatePrefix(medicalExpenseKeys.byAccount(variables.hsaAccountId));
    cachePatterns.invalidatePrefix(medicalExpenseKeys.allWithRelations(variables.hsaAccountId));
    if (newExpense.taxYear) {
      cachePatterns.invalidatePrefix(
        medicalExpenseKeys.byTaxYear(variables.hsaAccountId, newExpense.taxYear)
      );
      cachePatterns.invalidatePrefix(
        medicalExpenseKeys.taxYearSummary(variables.hsaAccountId, newExpense.taxYear)
      );
    }
    // Also invalidate transactions for the account
    cachePatterns.invalidatePrefix(["transactions", "account", variables.accountId]);
  },
  successMessage: "Medical expense created successfully",
  errorMessage: "Failed to create medical expense",
});

/**
 * Update medical expense
 */
export const updateMedicalExpense = defineMutation<
  {
    id: number;
    expenseType?: (typeof medicalExpenseTypeEnum)[number];
    isQualified?: boolean;
    provider?: string;
    patientName?: string;
    diagnosis?: string;
    treatmentDescription?: string;
    amount?: number;
    insuranceCovered?: number;
    outOfPocket?: number;
    serviceDate?: string;
    paidDate?: string;
    taxYear?: number;
    notes?: string;
  },
  MedicalExpense
>({
  mutationFn: (variables) => trpc().medicalExpensesRouter.update.mutate(variables),
  onSuccess: (updatedExpense) => {
    // Update the detail query cache
    cachePatterns.setQueryData(medicalExpenseKeys.detail(updatedExpense.id), updatedExpense);

    // Invalidate all related queries
    cachePatterns.invalidatePrefix(medicalExpenseKeys.byAccount(updatedExpense.hsaAccountId));
    cachePatterns.invalidatePrefix(
      medicalExpenseKeys.allWithRelations(updatedExpense.hsaAccountId)
    );
    if (updatedExpense.taxYear) {
      cachePatterns.invalidatePrefix(
        medicalExpenseKeys.byTaxYear(updatedExpense.hsaAccountId, updatedExpense.taxYear)
      );
      cachePatterns.invalidatePrefix(
        medicalExpenseKeys.taxYearSummary(updatedExpense.hsaAccountId, updatedExpense.taxYear)
      );
    }
  },
  successMessage: "Medical expense updated successfully",
  errorMessage: "Failed to update medical expense",
});

/**
 * Delete medical expense
 */
export const deleteMedicalExpense = defineMutation<
  { id: number; hsaAccountId: number; taxYear?: number },
  { success: boolean }
>({
  mutationFn: ({ id }) => trpc().medicalExpensesRouter.delete.mutate({ id }),
  onSuccess: (_result, variables) => {
    // Remove from detail cache
    cachePatterns.invalidateQueries(medicalExpenseKeys.detail(variables.id));

    // Invalidate list queries
    cachePatterns.invalidatePrefix(medicalExpenseKeys.byAccount(variables.hsaAccountId));
    cachePatterns.invalidatePrefix(medicalExpenseKeys.allWithRelations(variables.hsaAccountId));
    if (variables.taxYear) {
      cachePatterns.invalidatePrefix(
        medicalExpenseKeys.byTaxYear(variables.hsaAccountId, variables.taxYear)
      );
      cachePatterns.invalidatePrefix(
        medicalExpenseKeys.taxYearSummary(variables.hsaAccountId, variables.taxYear)
      );
    }
  },
  successMessage: "Medical expense deleted successfully",
  errorMessage: "Failed to delete medical expense",
});

// ============================================================================
// Receipt Queries
// ============================================================================

/**
 * Get all receipts for a medical expense
 */
export const getReceipts = (medicalExpenseId: number) => {
  return defineQuery({
    queryKey: medicalExpenseKeys.receipts(medicalExpenseId),
    queryFn: () => trpc().medicalExpensesRouter.getReceipts.query({ medicalExpenseId }),
    options: {
      staleTime: 60 * 1000, // 1 minute
    },
  });
};

/**
 * Get single receipt by ID
 */
export const getReceipt = (id: number) => {
  return defineQuery({
    queryKey: medicalExpenseKeys.receipt(id),
    queryFn: () => trpc().medicalExpensesRouter.getReceipt.query({ id }),
    options: {
      staleTime: 60 * 1000, // 1 minute
    },
  });
};

/**
 * Count receipts for an expense
 */
export const getReceiptCount = (medicalExpenseId: number) => {
  return defineQuery({
    queryKey: medicalExpenseKeys.receiptCount(medicalExpenseId),
    queryFn: () => trpc().medicalExpensesRouter.countReceipts.query({ medicalExpenseId }),
    options: {
      staleTime: 60 * 1000, // 1 minute
    },
  });
};

// ============================================================================
// Receipt Mutations
// ============================================================================

/**
 * Upload receipt (uses fetch API, not tRPC)
 */
export const uploadReceipt = defineMutation<
  {
    medicalExpenseId: number;
    file: File;
    receiptType?: string;
    description?: string;
  },
  { success: boolean; receipt: ExpenseReceipt }
>({
  mutationFn: async (variables) => {
    const formData = new FormData();
    formData.append("medicalExpenseId", variables.medicalExpenseId.toString());
    formData.append("file", variables.file);
    if (variables.receiptType) {
      formData.append("receiptType", variables.receiptType);
    }
    if (variables.description) {
      formData.append("description", variables.description);
    }

    const response = await fetch("/api/receipts/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Upload failed" }));
      throw new Error(error.message || "Failed to upload receipt");
    }

    return response.json();
  },
  onSuccess: (result, variables) => {
    // Invalidate receipts list
    cachePatterns.invalidatePrefix(medicalExpenseKeys.receipts(variables.medicalExpenseId));
    // Invalidate receipt count
    cachePatterns.invalidatePrefix(medicalExpenseKeys.receiptCount(variables.medicalExpenseId));
    // Invalidate expense detail (to show updated receipt count)
    cachePatterns.invalidatePrefix(medicalExpenseKeys.detail(variables.medicalExpenseId));
  },
  successMessage: "Receipt uploaded successfully",
  errorMessage: "Failed to upload receipt",
});

/**
 * Update receipt metadata
 */
export const updateReceipt = defineMutation<
  {
    id: number;
    medicalExpenseId: number;
    receiptType?: ReceiptType;
    description?: string;
  },
  ExpenseReceipt
>({
  mutationFn: ({ id, receiptType, description }) =>
    trpc().medicalExpensesRouter.updateReceipt.mutate({
      id,
      receiptType,
      description,
    }),
  onSuccess: (updatedReceipt, variables) => {
    // Update the detail query cache
    cachePatterns.setQueryData(medicalExpenseKeys.receipt(updatedReceipt.id), updatedReceipt);

    // Invalidate receipts list
    cachePatterns.invalidatePrefix(medicalExpenseKeys.receipts(variables.medicalExpenseId));
  },
  successMessage: "Receipt updated successfully",
  errorMessage: "Failed to update receipt",
});

/**
 * Delete receipt
 */
export const deleteReceipt = defineMutation<
  { id: number; medicalExpenseId: number },
  { success: boolean }
>({
  mutationFn: ({ id }) => trpc().medicalExpensesRouter.deleteReceipt.mutate({ id }),
  onSuccess: (_result, variables) => {
    // Remove from detail cache
    cachePatterns.invalidateQueries(medicalExpenseKeys.receipt(variables.id));

    // Invalidate receipts list
    cachePatterns.invalidatePrefix(medicalExpenseKeys.receipts(variables.medicalExpenseId));
    // Invalidate receipt count
    cachePatterns.invalidatePrefix(medicalExpenseKeys.receiptCount(variables.medicalExpenseId));
  },
  successMessage: "Receipt deleted successfully",
  errorMessage: "Failed to delete receipt",
});

// ============================================================================
// Claim Queries
// ============================================================================

/**
 * Get all claims for a medical expense
 */
export const getClaims = (medicalExpenseId: number) => {
  return defineQuery({
    queryKey: medicalExpenseKeys.claims(medicalExpenseId),
    queryFn: () => trpc().medicalExpensesRouter.getClaims.query({ medicalExpenseId }),
    options: {
      staleTime: 30 * 1000, // 30 seconds (claims change more frequently)
    },
  });
};

/**
 * Get all pending claims
 */
export const getPendingClaims = () => {
  return defineQuery({
    queryKey: medicalExpenseKeys.pendingClaims(),
    queryFn: () => trpc().medicalExpensesRouter.getPendingClaims.query(),
    options: {
      staleTime: 30 * 1000, // 30 seconds
    },
  });
};

// ============================================================================
// Claim Mutations
// ============================================================================

/**
 * Create claim
 */
export const createClaim = defineMutation<
  {
    medicalExpenseId: number;
    claimNumber?: string;
    claimedAmount: number;
    administratorName?: string;
    notes?: string;
    internalNotes?: string;
  },
  HsaClaim
>({
  mutationFn: (variables) => trpc().medicalExpensesRouter.createClaim.mutate(variables),
  onSuccess: (newClaim, variables) => {
    // Invalidate claims list
    cachePatterns.invalidatePrefix(medicalExpenseKeys.claims(variables.medicalExpenseId));
    // Invalidate expense detail
    cachePatterns.invalidatePrefix(medicalExpenseKeys.detail(variables.medicalExpenseId));
  },
  successMessage: "Claim created successfully",
  errorMessage: "Failed to create claim",
});

/**
 * Submit claim
 */
export const submitClaim = defineMutation<
  {
    id: number;
    medicalExpenseId: number;
    claimNumber?: string;
    submittedDate?: string;
  },
  HsaClaim
>({
  mutationFn: ({ id, claimNumber, submittedDate }) =>
    trpc().medicalExpensesRouter.submitClaim.mutate({ id, claimNumber, submittedDate }),
  onSuccess: (updatedClaim, variables) => {
    // Invalidate claims list
    cachePatterns.invalidatePrefix(medicalExpenseKeys.claims(variables.medicalExpenseId));
    // Invalidate pending claims
    cachePatterns.invalidatePrefix(medicalExpenseKeys.pendingClaims());
  },
  successMessage: "Claim submitted successfully",
  errorMessage: "Failed to submit claim",
});

/**
 * Mark claim in review
 */
export const markClaimInReview = defineMutation<
  {
    id: number;
    medicalExpenseId: number;
    reviewDate?: string;
  },
  HsaClaim
>({
  mutationFn: ({ id, reviewDate }) =>
    trpc().medicalExpensesRouter.markClaimInReview.mutate({ id, reviewDate }),
  onSuccess: (updatedClaim, variables) => {
    cachePatterns.invalidatePrefix(medicalExpenseKeys.claims(variables.medicalExpenseId));
    cachePatterns.invalidatePrefix(medicalExpenseKeys.pendingClaims());
  },
  successMessage: "Claim marked as in review",
  errorMessage: "Failed to mark claim in review",
});

/**
 * Approve claim
 */
export const approveClaim = defineMutation<
  {
    id: number;
    medicalExpenseId: number;
    approvedAmount: number;
    deniedAmount?: number;
    approvalDate?: string;
  },
  HsaClaim
>({
  mutationFn: ({ id, approvedAmount, deniedAmount, approvalDate }) =>
    trpc().medicalExpensesRouter.approveClaim.mutate({
      id,
      approvedAmount,
      deniedAmount,
      approvalDate,
    }),
  onSuccess: (updatedClaim, variables) => {
    cachePatterns.invalidatePrefix(medicalExpenseKeys.claims(variables.medicalExpenseId));
    cachePatterns.invalidatePrefix(medicalExpenseKeys.pendingClaims());
  },
  successMessage: "Claim approved successfully",
  errorMessage: "Failed to approve claim",
});

/**
 * Deny claim
 */
export const denyClaim = defineMutation<
  {
    id: number;
    medicalExpenseId: number;
    denialReason: string;
    denialCode?: string;
  },
  HsaClaim
>({
  mutationFn: ({ id, denialReason, denialCode }) =>
    trpc().medicalExpensesRouter.denyClaim.mutate({ id, denialReason, denialCode }),
  onSuccess: (updatedClaim, variables) => {
    cachePatterns.invalidatePrefix(medicalExpenseKeys.claims(variables.medicalExpenseId));
    cachePatterns.invalidatePrefix(medicalExpenseKeys.pendingClaims());
  },
  successMessage: "Claim denied",
  errorMessage: "Failed to deny claim",
});

/**
 * Mark claim as paid
 */
export const markClaimPaid = defineMutation<
  {
    id: number;
    medicalExpenseId: number;
    paidAmount: number;
    paymentDate?: string;
  },
  HsaClaim
>({
  mutationFn: ({ id, paidAmount, paymentDate }) =>
    trpc().medicalExpensesRouter.markClaimPaid.mutate({ id, paidAmount, paymentDate }),
  onSuccess: (updatedClaim, variables) => {
    cachePatterns.invalidatePrefix(medicalExpenseKeys.claims(variables.medicalExpenseId));
    cachePatterns.invalidatePrefix(medicalExpenseKeys.pendingClaims());
  },
  successMessage: "Claim marked as paid",
  errorMessage: "Failed to mark claim as paid",
});

/**
 * Request resubmission
 */
export const requestResubmission = defineMutation<
  {
    id: number;
    medicalExpenseId: number;
    reason: string;
  },
  HsaClaim
>({
  mutationFn: ({ id, reason }) =>
    trpc().medicalExpensesRouter.requestResubmission.mutate({ id, reason }),
  onSuccess: (updatedClaim, variables) => {
    cachePatterns.invalidatePrefix(medicalExpenseKeys.claims(variables.medicalExpenseId));
    cachePatterns.invalidatePrefix(medicalExpenseKeys.pendingClaims());
  },
  successMessage: "Resubmission requested",
  errorMessage: "Failed to request resubmission",
});

/**
 * Withdraw claim
 */
export const withdrawClaim = defineMutation<
  {
    id: number;
    medicalExpenseId: number;
  },
  HsaClaim
>({
  mutationFn: ({ id }) => trpc().medicalExpensesRouter.withdrawClaim.mutate({ id }),
  onSuccess: (updatedClaim, variables) => {
    cachePatterns.invalidatePrefix(medicalExpenseKeys.claims(variables.medicalExpenseId));
    cachePatterns.invalidatePrefix(medicalExpenseKeys.pendingClaims());
  },
  successMessage: "Claim withdrawn",
  errorMessage: "Failed to withdraw claim",
});

/**
 * Update claim
 */
export const updateClaim = defineMutation<
  {
    id: number;
    medicalExpenseId: number;
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
  },
  HsaClaim
>({
  mutationFn: (variables) => trpc().medicalExpensesRouter.updateClaim.mutate(variables),
  onSuccess: (updatedClaim, variables) => {
    cachePatterns.invalidatePrefix(medicalExpenseKeys.claims(variables.medicalExpenseId));
    cachePatterns.invalidatePrefix(medicalExpenseKeys.pendingClaims());
  },
  successMessage: "Claim updated successfully",
  errorMessage: "Failed to update claim",
});

/**
 * Delete claim
 */
export const deleteClaim = defineMutation<
  {
    id: number;
    medicalExpenseId: number;
  },
  { success: boolean }
>({
  mutationFn: ({ id }) => trpc().medicalExpensesRouter.deleteClaim.mutate({ id }),
  onSuccess: (_result, variables) => {
    cachePatterns.invalidatePrefix(medicalExpenseKeys.claims(variables.medicalExpenseId));
    cachePatterns.invalidatePrefix(medicalExpenseKeys.pendingClaims());
  },
  successMessage: "Claim deleted successfully",
  errorMessage: "Failed to delete claim",
});
