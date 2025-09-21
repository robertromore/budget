import {db} from "$lib/server/db";
import {payees, transactions} from "$lib/schema";
import {eq, and, isNull, like, inArray, sql, count} from "drizzle-orm";
import type {Payee, NewPayee} from "$lib/schema/payees";
import {NotFoundError} from "$lib/server/shared/types/errors";

export interface UpdatePayeeData {
  name?: string;
  notes?: string | null;
}

export interface PayeeStats {
  transactionCount: number;
  totalAmount: number;
  lastTransactionDate: string | null;
}

/**
 * Repository for payee database operations
 */
export class PayeeRepository {
  /**
   * Create a new payee
   */
  async create(data: NewPayee): Promise<Payee> {
    const [payee] = await db
      .insert(payees)
      .values(data)
      .returning();

    if (!payee) {
      throw new Error("Failed to create payee");
    }

    return payee;
  }

  /**
   * Find payee by ID
   */
  async findById(id: number): Promise<Payee | null> {
    const [payee] = await db
      .select()
      .from(payees)
      .where(and(eq(payees.id, id), isNull(payees.deletedAt)))
      .limit(1);

    return payee || null;
  }

  /**
   * Find all active payees
   */
  async findAll(): Promise<Payee[]> {
    return await db
      .select()
      .from(payees)
      .where(isNull(payees.deletedAt))
      .orderBy(payees.name);
  }

  /**
   * Update payee
   */
  async update(id: number, data: UpdatePayeeData): Promise<Payee> {
    const [payee] = await db
      .update(payees)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(payees.id, id), isNull(payees.deletedAt)))
      .returning();

    if (!payee) {
      throw new NotFoundError("Payee", id);
    }

    return payee;
  }

  /**
   * Soft delete payee
   */
  async softDelete(id: number): Promise<Payee> {
    const [payee] = await db
      .update(payees)
      .set({
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(payees.id, id), isNull(payees.deletedAt)))
      .returning();

    if (!payee) {
      throw new NotFoundError("Payee", id);
    }

    return payee;
  }

  /**
   * Bulk soft delete payees
   */
  async bulkDelete(ids: number[]): Promise<number> {
    if (ids.length === 0) return 0;

    const result = await db
      .update(payees)
      .set({
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(and(
        inArray(payees.id, ids),
        isNull(payees.deletedAt)
      ))
      .returning({id: payees.id});

    return result.length;
  }

  /**
   * Search payees by name
   */
  async search(query: string): Promise<Payee[]> {
    if (!query.trim()) {
      return this.findAll();
    }

    return await db
      .select()
      .from(payees)
      .where(and(
        like(payees.name, `%${query}%`),
        isNull(payees.deletedAt)
      ))
      .orderBy(payees.name)
      .limit(50);
  }

  /**
   * Find payees used in account transactions
   */
  async findByAccountTransactions(accountId: number): Promise<Payee[]> {
    const payeeIds = await db
      .selectDistinct({payeeId: transactions.payeeId})
      .from(transactions)
      .where(and(
        eq(transactions.accountId, accountId),
        isNull(transactions.deletedAt)
      ));

    if (payeeIds.length === 0) return [];

    const validPayeeIds = payeeIds
      .filter(item => item.payeeId !== null)
      .map(item => item.payeeId!);

    if (validPayeeIds.length === 0) return [];

    return await db
      .select()
      .from(payees)
      .where(and(
        inArray(payees.id, validPayeeIds),
        isNull(payees.deletedAt)
      ))
      .orderBy(payees.name);
  }

  /**
   * Get payee statistics
   */
  async getStats(id: number): Promise<PayeeStats> {
    const [stats] = await db
      .select({
        transactionCount: count(transactions.id),
        totalAmount: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
        lastTransactionDate: sql<string | null>`MAX(${transactions.date})`,
      })
      .from(transactions)
      .where(and(
        eq(transactions.payeeId, id),
        isNull(transactions.deletedAt)
      ));

    return {
      transactionCount: stats?.transactionCount || 0,
      totalAmount: stats?.totalAmount || 0,
      lastTransactionDate: stats?.lastTransactionDate || null,
    };
  }

  /**
   * Check if payee exists and is active
   */
  async exists(id: number): Promise<boolean> {
    const [result] = await db
      .select({id: payees.id})
      .from(payees)
      .where(and(eq(payees.id, id), isNull(payees.deletedAt)))
      .limit(1);

    return !!result;
  }

  /**
   * Check if payee has associated transactions
   */
  async hasTransactions(id: number): Promise<boolean> {
    const [result] = await db
      .select({id: transactions.id})
      .from(transactions)
      .where(and(
        eq(transactions.payeeId, id),
        isNull(transactions.deletedAt)
      ))
      .limit(1);

    return !!result;
  }
}