import { accounts } from "$lib/schema/accounts";
import type { MedicalExpense, MedicalExpenseType } from "$lib/schema/medical-expenses";
import { transactions } from "$lib/schema/transactions";
import { db } from "$lib/server/shared/database";
import { ConflictError, NotFoundError, ValidationError } from "$lib/server/shared/types/errors";
import { InputSanitizer } from "$lib/server/shared/validation";
import { and, eq, isNull } from "drizzle-orm";
import { TransactionService } from "../transactions/services";
import { ClaimService } from "./claim-service";
import { MedicalExpenseRepository } from "./repository";

// Service input types
export interface CreateMedicalExpenseData {
  transactionId: number;
  hsaAccountId: number;
  expenseType: MedicalExpenseType;
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
  taxYear?: number; // If not provided, will be calculated from paidDate
  notes?: string;
}

export interface CreateMedicalExpenseWithTransactionData {
  accountId: number;
  hsaAccountId: number;
  expenseType: MedicalExpenseType;
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
}

export interface UpdateMedicalExpenseData {
  expenseType?: MedicalExpenseType;
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
}

/**
 * Medical expense service containing business logic
 *
 * Dependencies are injected via constructor for testability.
 * Use ServiceFactory to instantiate in production code.
 */
export class MedicalExpenseService {
  constructor(
    private repository: MedicalExpenseRepository,
    private transactionService: TransactionService,
    private claimService: ClaimService
  ) {}

  /**
   * Calculate tax year from payment date (IRS rules: based on payment date, not service date)
   */
  private calculateTaxYear(paidDate?: string, serviceDate?: string): number {
    const dateToUse = paidDate || serviceDate;
    if (!dateToUse) {
      return new Date().getFullYear();
    }
    return new Date(dateToUse).getFullYear();
  }

  /**
   * Validate that the transaction exists and belongs to an HSA account
   */
  private async validateTransaction(transactionId: number, hsaAccountId: number): Promise<void> {
    const result = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.id, transactionId),
          eq(transactions.accountId, hsaAccountId),
          isNull(transactions.deletedAt)
        )
      )
      .limit(1)
      .execute();

    if (!result[0]) {
      throw new NotFoundError("Transaction", transactionId.toString());
    }
  }

  /**
   * Validate that the HSA account exists and is of type 'hsa'
   */
  private async validateHsaAccount(hsaAccountId: number): Promise<void> {
    const result = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, hsaAccountId), isNull(accounts.deletedAt)))
      .limit(1)
      .execute();

    const account = result[0];
    if (!account) {
      throw new NotFoundError("Account", hsaAccountId.toString());
    }

    if (account.accountType !== "hsa") {
      throw new ValidationError("Account must be of type HSA");
    }
  }

  /**
   * Check if a transaction already has a medical expense
   */
  private async checkTransactionConflict(transactionId: number): Promise<void> {
    const existing = await this.repository.findByTransactionId(transactionId);
    if (existing) {
      throw new ConflictError("Transaction already has a medical expense");
    }
  }

  /**
   * Create a new medical expense
   */
  async createMedicalExpense(data: CreateMedicalExpenseData): Promise<MedicalExpense> {
    // Validate HSA account
    await this.validateHsaAccount(data.hsaAccountId);

    // Validate transaction
    await this.validateTransaction(data.transactionId, data.hsaAccountId);

    // Check for existing medical expense on this transaction
    await this.checkTransactionConflict(data.transactionId);

    // Sanitize text inputs
    const sanitizedProvider = data.provider
      ? InputSanitizer.sanitizeText(data.provider)
      : undefined;
    const sanitizedPatientName = data.patientName
      ? InputSanitizer.sanitizeText(data.patientName)
      : undefined;
    const sanitizedDiagnosis = data.diagnosis
      ? InputSanitizer.sanitizeDescription(data.diagnosis)
      : undefined;
    const sanitizedTreatment = data.treatmentDescription
      ? InputSanitizer.sanitizeDescription(data.treatmentDescription)
      : undefined;
    const sanitizedNotes = data.notes ? InputSanitizer.sanitizeDescription(data.notes) : undefined;

    // Validate amounts
    const amount = InputSanitizer.validateAmount(data.amount, "Amount");
    const insuranceCovered =
      data.insuranceCovered !== undefined
        ? InputSanitizer.validateAmount(data.insuranceCovered, "Insurance covered")
        : 0;

    // Calculate or validate out of pocket amount
    let outOfPocket = data.outOfPocket;
    if (outOfPocket === undefined) {
      outOfPocket = amount - insuranceCovered;
    } else {
      outOfPocket = InputSanitizer.validateAmount(outOfPocket, "Out of pocket");
      // Validate that out of pocket + insurance = total amount
      if (Math.abs(outOfPocket + insuranceCovered - amount) > 0.01) {
        throw new ValidationError(
          "Out of pocket amount + insurance covered must equal total amount"
        );
      }
    }

    // Calculate tax year (based on payment date per IRS rules)
    const taxYear = data.taxYear || this.calculateTaxYear(data.paidDate, data.serviceDate);

    // Create medical expense - build object conditionally for exactOptionalPropertyTypes
    const expenseData: {
      transactionId: number;
      hsaAccountId: number;
      expenseType: string;
      isQualified: boolean;
      amount: number;
      insuranceCovered: number;
      outOfPocket: number;
      serviceDate: string;
      taxYear: number;
      provider?: string;
      patientName?: string;
      diagnosis?: string;
      treatmentDescription?: string;
      paidDate?: string;
      notes?: string;
    } = {
      transactionId: data.transactionId,
      hsaAccountId: data.hsaAccountId,
      expenseType: data.expenseType,
      isQualified: data.isQualified !== undefined ? data.isQualified : true,
      amount,
      insuranceCovered,
      outOfPocket,
      serviceDate: data.serviceDate,
      taxYear,
    };

    if (sanitizedProvider) expenseData.provider = sanitizedProvider;
    if (sanitizedPatientName) expenseData.patientName = sanitizedPatientName;
    if (sanitizedDiagnosis) expenseData.diagnosis = sanitizedDiagnosis;
    if (sanitizedTreatment) expenseData.treatmentDescription = sanitizedTreatment;
    if (data.paidDate) expenseData.paidDate = data.paidDate;
    if (sanitizedNotes) expenseData.notes = sanitizedNotes;

    const expense = await this.repository.create(expenseData);

    return expense;
  }

  /**
   * Create a new medical expense with transaction (all-in-one)
   */
  async createMedicalExpenseWithTransaction(
    data: CreateMedicalExpenseWithTransactionData,
    workspaceId: number
  ): Promise<MedicalExpense> {
    // Validate HSA account
    await this.validateHsaAccount(data.hsaAccountId);

    // Sanitize text inputs
    const sanitizedProvider = data.provider
      ? InputSanitizer.sanitizeText(data.provider)
      : undefined;
    const sanitizedPatientName = data.patientName
      ? InputSanitizer.sanitizeText(data.patientName)
      : undefined;
    const sanitizedDiagnosis = data.diagnosis
      ? InputSanitizer.sanitizeDescription(data.diagnosis)
      : undefined;
    const sanitizedTreatment = data.treatmentDescription
      ? InputSanitizer.sanitizeDescription(data.treatmentDescription)
      : undefined;
    const sanitizedNotes = data.notes ? InputSanitizer.sanitizeDescription(data.notes) : undefined;
    const sanitizedTransactionNotes = data.transactionNotes
      ? InputSanitizer.sanitizeDescription(data.transactionNotes)
      : undefined;

    // Validate amounts
    const amount = InputSanitizer.validateAmount(data.amount, "Amount");
    const insuranceCovered =
      data.insuranceCovered !== undefined
        ? InputSanitizer.validateAmount(data.insuranceCovered, "Insurance covered")
        : 0;

    // Calculate or validate out of pocket amount
    let outOfPocket = data.outOfPocket;
    if (outOfPocket === undefined) {
      outOfPocket = amount - insuranceCovered;
    } else {
      outOfPocket = InputSanitizer.validateAmount(outOfPocket, "Out of pocket");
      // Validate that out of pocket + insurance = total amount
      if (Math.abs(outOfPocket + insuranceCovered - amount) > 0.01) {
        throw new ValidationError(
          "Out of pocket amount + insurance covered must equal total amount"
        );
      }
    }

    // Calculate tax year (based on payment date per IRS rules)
    const taxYear = data.taxYear || this.calculateTaxYear(data.paidDate, data.serviceDate);

    // Create the transaction first
    // Extract just the date portion (YYYY-MM-DD) from the ISO datetime string
    const transactionDate = data.serviceDate.split("T")[0];

    const transactionData: {
      accountId: number;
      amount: number;
      date: string;
      status: "cleared" | "pending" | "scheduled";
      notes?: string;
    } = {
      accountId: data.accountId,
      amount: -outOfPocket, // Negative for HSA withdrawal/expense
      date: transactionDate,
      status: "cleared",
    };

    if (sanitizedTransactionNotes) {
      transactionData.notes = sanitizedTransactionNotes;
    } else if (sanitizedProvider) {
      // Use provider as default transaction note if no specific notes provided
      transactionData.notes = `Medical: ${sanitizedProvider}`;
    }

    const transaction = await this.transactionService.createTransaction(
      transactionData,
      workspaceId.toString()
    );

    // Create medical expense - build object conditionally for exactOptionalPropertyTypes
    const expenseData: {
      transactionId: number;
      hsaAccountId: number;
      expenseType: string;
      isQualified: boolean;
      amount: number;
      insuranceCovered: number;
      outOfPocket: number;
      serviceDate: string;
      taxYear: number;
      provider?: string;
      patientName?: string;
      diagnosis?: string;
      treatmentDescription?: string;
      paidDate?: string;
      notes?: string;
    } = {
      transactionId: transaction.id,
      hsaAccountId: data.hsaAccountId,
      expenseType: data.expenseType,
      isQualified: data.isQualified !== undefined ? data.isQualified : true,
      amount,
      insuranceCovered,
      outOfPocket,
      serviceDate: data.serviceDate,
      taxYear,
    };

    if (sanitizedProvider) expenseData.provider = sanitizedProvider;
    if (sanitizedPatientName) expenseData.patientName = sanitizedPatientName;
    if (sanitizedDiagnosis) expenseData.diagnosis = sanitizedDiagnosis;
    if (sanitizedTreatment) expenseData.treatmentDescription = sanitizedTreatment;
    if (data.paidDate) expenseData.paidDate = data.paidDate;
    if (sanitizedNotes) expenseData.notes = sanitizedNotes;

    const expense = await this.repository.create(expenseData);

    // Auto-create a pending claim for this expense (if out of pocket > 0)
    if (outOfPocket > 0) {
      try {
        await this.claimService.createClaim({
          medicalExpenseId: expense.id,
          claimedAmount: outOfPocket,
        });
      } catch (error) {
        // Log but don't fail the expense creation if claim creation fails
        console.error("Failed to auto-create claim for expense", expense.id, error);
      }
    }

    return expense;
  }

  /**
   * Update a medical expense
   */
  async updateMedicalExpense(id: number, data: UpdateMedicalExpenseData): Promise<MedicalExpense> {
    // Verify expense exists
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("MedicalExpense", id.toString());
    }

    // Sanitize text inputs if provided
    const sanitizedProvider = data.provider
      ? InputSanitizer.sanitizeText(data.provider)
      : undefined;
    const sanitizedPatientName = data.patientName
      ? InputSanitizer.sanitizeText(data.patientName)
      : undefined;
    const sanitizedDiagnosis = data.diagnosis
      ? InputSanitizer.sanitizeDescription(data.diagnosis)
      : undefined;
    const sanitizedTreatment = data.treatmentDescription
      ? InputSanitizer.sanitizeDescription(data.treatmentDescription)
      : undefined;
    const sanitizedNotes = data.notes ? InputSanitizer.sanitizeDescription(data.notes) : undefined;

    // Validate amounts if provided
    const amount =
      data.amount !== undefined ? InputSanitizer.validateAmount(data.amount, "Amount") : undefined;
    const insuranceCovered =
      data.insuranceCovered !== undefined
        ? InputSanitizer.validateAmount(data.insuranceCovered, "Insurance covered")
        : undefined;
    const outOfPocket =
      data.outOfPocket !== undefined
        ? InputSanitizer.validateAmount(data.outOfPocket, "Out of pocket")
        : undefined;

    // Recalculate tax year if paid date changed
    let taxYear = data.taxYear;
    if (data.paidDate && !taxYear) {
      taxYear = this.calculateTaxYear(data.paidDate);
    }

    // Update medical expense - build object conditionally for exactOptionalPropertyTypes
    const updateData: {
      expenseType?: string;
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
    } = {};

    if (data.expenseType) updateData.expenseType = data.expenseType;
    if (data.isQualified !== undefined) updateData.isQualified = data.isQualified;
    if (sanitizedProvider) updateData.provider = sanitizedProvider;
    if (sanitizedPatientName) updateData.patientName = sanitizedPatientName;
    if (sanitizedDiagnosis) updateData.diagnosis = sanitizedDiagnosis;
    if (sanitizedTreatment) updateData.treatmentDescription = sanitizedTreatment;
    if (amount !== undefined) updateData.amount = amount;
    if (insuranceCovered !== undefined) updateData.insuranceCovered = insuranceCovered;
    if (outOfPocket !== undefined) updateData.outOfPocket = outOfPocket;
    if (data.serviceDate) updateData.serviceDate = data.serviceDate;
    if (data.paidDate) updateData.paidDate = data.paidDate;
    if (taxYear) updateData.taxYear = taxYear;
    if (sanitizedNotes) updateData.notes = sanitizedNotes;

    const updated = await this.repository.update(id, updateData);

    return updated;
  }

  /**
   * Get medical expense by ID with relations
   */
  async getMedicalExpenseWithRelations(id: number): Promise<any> {
    return await this.repository.findWithRelations(id);
  }

  /**
   * Get all medical expenses for an HSA account
   */
  async getMedicalExpensesByAccount(hsaAccountId: number): Promise<MedicalExpense[]> {
    await this.validateHsaAccount(hsaAccountId);
    return await this.repository.findByHsaAccountId(hsaAccountId);
  }

  /**
   * Get medical expenses for a specific tax year
   */
  async getMedicalExpensesByTaxYear(
    hsaAccountId: number,
    taxYear: number
  ): Promise<MedicalExpense[]> {
    await this.validateHsaAccount(hsaAccountId);
    return await this.repository.findByTaxYear(hsaAccountId, taxYear);
  }

  /**
   * Get tax year summary
   */
  async getTaxYearSummary(hsaAccountId: number, taxYear: number): Promise<any> {
    await this.validateHsaAccount(hsaAccountId);
    return await this.repository.getTaxYearSummary(hsaAccountId, taxYear);
  }

  /**
   * Get all medical expenses with claims and receipts for data table
   */
  async getAllExpensesWithRelations(hsaAccountId: number): Promise<any[]> {
    await this.validateHsaAccount(hsaAccountId);
    return await this.repository.getAllExpensesWithRelations(hsaAccountId);
  }

  /**
   * Delete a medical expense (soft delete)
   */
  async deleteMedicalExpense(id: number): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("MedicalExpense", id.toString());
    }
    await this.repository.delete(id);
  }
}
