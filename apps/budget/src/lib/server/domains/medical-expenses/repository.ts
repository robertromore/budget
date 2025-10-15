import { expenseReceipts } from "$lib/schema/expense-receipts";
import { hsaClaims } from "$lib/schema/hsa-claims";
import { medicalExpenses, type MedicalExpense, type MedicalExpenseType } from "$lib/schema/medical-expenses";
import { db } from "$lib/server/shared/database";
import { BaseRepository } from "$lib/server/shared/database/base-repository";
import { and, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";

// Types for medical expense operations
export interface CreateMedicalExpenseInput {
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
  outOfPocket: number;
  serviceDate: string;
  paidDate?: string;
  taxYear: number;
  notes?: string;
}

export interface UpdateMedicalExpenseInput {
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
 * Medical expense repository with domain-specific operations
 */
export class MedicalExpenseRepository extends BaseRepository<
  typeof medicalExpenses,
  MedicalExpense,
  CreateMedicalExpenseInput,
  UpdateMedicalExpenseInput
> {
  constructor() {
    super(db, medicalExpenses, "MedicalExpense");
  }

  /**
   * Find all medical expenses for an HSA account
   */
  async findByHsaAccountId(hsaAccountId: number): Promise<MedicalExpense[]> {
    return await db
      .select()
      .from(medicalExpenses)
      .where(
        and(
          eq(medicalExpenses.hsaAccountId, hsaAccountId),
          isNull(medicalExpenses.deletedAt)
        )
      )
      .orderBy(desc(medicalExpenses.serviceDate))
      .execute();
  }

  /**
   * Find all medical expenses for a specific tax year with claims
   */
  async findByTaxYear(hsaAccountId: number, taxYear: number): Promise<any[]> {
    const expenses = await db
      .select()
      .from(medicalExpenses)
      .where(
        and(
          eq(medicalExpenses.hsaAccountId, hsaAccountId),
          eq(medicalExpenses.taxYear, taxYear),
          isNull(medicalExpenses.deletedAt)
        )
      )
      .orderBy(desc(medicalExpenses.serviceDate))
      .execute();

    // Fetch claims for all expenses
    const expensesWithClaims = await Promise.all(
      expenses.map(async (expense) => {
        const claims = await db
          .select()
          .from(hsaClaims)
          .where(
            and(
              eq(hsaClaims.medicalExpenseId, expense.id),
              isNull(hsaClaims.deletedAt)
            )
          )
          .execute();

        return {
          ...expense,
          claims,
        };
      })
    );

    return expensesWithClaims;
  }

  /**
   * Find medical expense by transaction ID
   */
  async findByTransactionId(transactionId: number): Promise<MedicalExpense | null> {
    const result = await db
      .select()
      .from(medicalExpenses)
      .where(
        and(
          eq(medicalExpenses.transactionId, transactionId),
          isNull(medicalExpenses.deletedAt)
        )
      )
      .limit(1)
      .execute();

    return result[0] || null;
  }

  /**
   * Find medical expenses with receipts and claims
   */
  async findWithRelations(id: number): Promise<any> {
    const expense = await this.findById(id);
    if (!expense) return null;

    // Fetch receipts
    const receipts = await db
      .select()
      .from(expenseReceipts)
      .where(
        and(
          eq(expenseReceipts.medicalExpenseId, id),
          isNull(expenseReceipts.deletedAt)
        )
      )
      .execute();

    // Fetch claims
    const claims = await db
      .select()
      .from(hsaClaims)
      .where(
        and(
          eq(hsaClaims.medicalExpenseId, id),
          isNull(hsaClaims.deletedAt)
        )
      )
      .execute();

    return {
      ...expense,
      receipts,
      claims,
    };
  }

  /**
   * Find medical expenses by date range
   */
  async findByDateRange(
    hsaAccountId: number,
    startDate: string,
    endDate: string
  ): Promise<MedicalExpense[]> {
    return await db
      .select()
      .from(medicalExpenses)
      .where(
        and(
          eq(medicalExpenses.hsaAccountId, hsaAccountId),
          gte(medicalExpenses.serviceDate, startDate),
          lte(medicalExpenses.serviceDate, endDate),
          isNull(medicalExpenses.deletedAt)
        )
      )
      .orderBy(desc(medicalExpenses.serviceDate))
      .execute();
  }

  /**
   * Get tax year summary for an HSA account
   */
  async getTaxYearSummary(hsaAccountId: number, taxYear: number): Promise<{
    totalExpenses: number;
    qualifiedExpenses: number;
    nonQualifiedExpenses: number;
    totalOutOfPocket: number;
    insuranceCovered: number;
    expenseCount: number;
  }> {
    const result = await db
      .select({
        totalExpenses: sql<number>`SUM(${medicalExpenses.amount})`,
        qualifiedExpenses: sql<number>`SUM(CASE WHEN ${medicalExpenses.isQualified} = 1 THEN ${medicalExpenses.amount} ELSE 0 END)`,
        nonQualifiedExpenses: sql<number>`SUM(CASE WHEN ${medicalExpenses.isQualified} = 0 THEN ${medicalExpenses.amount} ELSE 0 END)`,
        totalOutOfPocket: sql<number>`SUM(${medicalExpenses.outOfPocket})`,
        insuranceCovered: sql<number>`SUM(${medicalExpenses.insuranceCovered})`,
        expenseCount: sql<number>`COUNT(*)`,
      })
      .from(medicalExpenses)
      .where(
        and(
          eq(medicalExpenses.hsaAccountId, hsaAccountId),
          eq(medicalExpenses.taxYear, taxYear),
          isNull(medicalExpenses.deletedAt)
        )
      )
      .execute();

    return {
      totalExpenses: result[0]?.totalExpenses || 0,
      qualifiedExpenses: result[0]?.qualifiedExpenses || 0,
      nonQualifiedExpenses: result[0]?.nonQualifiedExpenses || 0,
      totalOutOfPocket: result[0]?.totalOutOfPocket || 0,
      insuranceCovered: result[0]?.insuranceCovered || 0,
      expenseCount: result[0]?.expenseCount || 0,
    };
  }

  /**
   * Get all expenses for an HSA account with claims and receipts
   * Used for data table display with full information
   */
  async getAllExpensesWithRelations(hsaAccountId: number): Promise<any[]> {
    const expenses = await db
      .select()
      .from(medicalExpenses)
      .where(
        and(
          eq(medicalExpenses.hsaAccountId, hsaAccountId),
          isNull(medicalExpenses.deletedAt)
        )
      )
      .orderBy(desc(medicalExpenses.serviceDate))
      .execute();

    // Fetch claims and receipts for all expenses in parallel
    const expensesWithRelations = await Promise.all(
      expenses.map(async (expense) => {
        const [claims, receipts] = await Promise.all([
          db
            .select()
            .from(hsaClaims)
            .where(
              and(
                eq(hsaClaims.medicalExpenseId, expense.id),
                isNull(hsaClaims.deletedAt)
              )
            )
            .execute(),
          db
            .select()
            .from(expenseReceipts)
            .where(
              and(
                eq(expenseReceipts.medicalExpenseId, expense.id),
                isNull(expenseReceipts.deletedAt)
              )
            )
            .execute(),
        ]);

        return {
          ...expense,
          claims,
          receipts,
        };
      })
    );

    return expensesWithRelations;
  }
}
