import {PayeeRepository, type UpdatePayeeData, type PayeeStats} from "./repository";
import {ValidationError, NotFoundError, ConflictError} from "$lib/server/shared/types/errors";
import {InputSanitizer} from "$lib/server/shared/validation";
import type {Payee, NewPayee} from "$lib/schema/payees";

export interface CreatePayeeData {
  name: string;
  notes?: string | null;
}

export interface PayeeWithStats extends Payee {
  stats?: PayeeStats;
}

/**
 * Service for payee business logic
 */
export class PayeeService {
  constructor(
    private repository: PayeeRepository = new PayeeRepository()
  ) {}

  /**
   * Create a new payee
   */
  async createPayee(data: CreatePayeeData): Promise<Payee> {
    // Validate and sanitize input
    if (!data.name?.trim()) {
      throw new ValidationError("Payee name is required");
    }

    const sanitizedName = InputSanitizer.sanitizeName(data.name.trim());
    if (!sanitizedName) {
      throw new ValidationError("Invalid payee name");
    }

    const sanitizedNotes = data.notes
      ? InputSanitizer.sanitizeDescription(data.notes)
      : null;

    // Check for duplicate names (case-insensitive)
    await this.validateUniquePayeeName(sanitizedName);

    const newPayee: NewPayee = {
      name: sanitizedName,
      notes: sanitizedNotes,
    };

    return await this.repository.create(newPayee);
  }

  /**
   * Get payee by ID
   */
  async getPayeeById(id: number): Promise<Payee> {
    if (!id || id <= 0) {
      throw new ValidationError("Invalid payee ID");
    }

    const payee = await this.repository.findById(id);
    if (!payee) {
      throw new NotFoundError("Payee", id);
    }

    return payee;
  }

  /**
   * Get payee by ID with statistics
   */
  async getPayeeWithStats(id: number): Promise<PayeeWithStats> {
    const payee = await this.getPayeeById(id);
    const stats = await this.repository.getStats(id);

    return {
      ...payee,
      stats,
    };
  }

  /**
   * Get all payees
   */
  async getAllPayees(): Promise<Payee[]> {
    return await this.repository.findAll();
  }

  /**
   * Update payee
   */
  async updatePayee(id: number, data: UpdatePayeeData): Promise<Payee> {
    if (!id || id <= 0) {
      throw new ValidationError("Invalid payee ID");
    }

    // Verify payee exists
    await this.getPayeeById(id);

    const updateData: UpdatePayeeData = {};

    // Validate and sanitize name if provided
    if (data.name !== undefined) {
      if (!data.name?.trim()) {
        throw new ValidationError("Payee name cannot be empty");
      }

      const sanitizedName = InputSanitizer.sanitizeName(data.name.trim());
      if (!sanitizedName) {
        throw new ValidationError("Invalid payee name");
      }

      // Check for duplicate names (excluding current payee)
      await this.validateUniquePayeeName(sanitizedName, id);
      updateData.name = sanitizedName;
    }

    // Validate and sanitize notes if provided
    if (data.notes !== undefined) {
      updateData.notes = data.notes
        ? InputSanitizer.sanitizeDescription(data.notes)
        : null;
    }

    if (Object.keys(updateData).length === 0) {
      throw new ValidationError("No valid fields to update");
    }

    return await this.repository.update(id, updateData);
  }

  /**
   * Delete payee (soft delete)
   */
  async deletePayee(id: number, options: {force?: boolean} = {}): Promise<Payee> {
    if (!id || id <= 0) {
      throw new ValidationError("Invalid payee ID");
    }

    // Verify payee exists
    await this.getPayeeById(id);

    // Check for associated transactions unless force delete
    if (!options.force) {
      const hasTransactions = await this.repository.hasTransactions(id);
      if (hasTransactions) {
        throw new ConflictError(
          "Cannot delete payee with associated transactions. Use force delete or reassign transactions first."
        );
      }
    }

    return await this.repository.softDelete(id);
  }

  /**
   * Bulk delete payees
   */
  async bulkDeletePayees(
    ids: number[],
    options: {force?: boolean} = {}
  ): Promise<{deletedCount: number; errors: string[]}> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new ValidationError("No payee IDs provided");
    }

    const validIds = ids.filter(id => id && id > 0);
    if (validIds.length === 0) {
      throw new ValidationError("No valid payee IDs provided");
    }

    const errors: string[] = [];
    const deleteableIds: number[] = [];

    // Validate each payee and check for conflicts
    for (const id of validIds) {
      try {
        await this.getPayeeById(id);

        if (!options.force) {
          const hasTransactions = await this.repository.hasTransactions(id);
          if (hasTransactions) {
            errors.push(`Payee ${id}: Has associated transactions`);
            continue;
          }
        }

        deleteableIds.push(id);
      } catch (error) {
        errors.push(`Payee ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const deletedCount = deleteableIds.length > 0
      ? await this.repository.bulkDelete(deleteableIds)
      : 0;

    return {deletedCount, errors};
  }

  /**
   * Search payees
   */
  async searchPayees(query: string): Promise<Payee[]> {
    const sanitizedQuery = query?.trim() || '';
    return await this.repository.search(sanitizedQuery);
  }

  /**
   * Get payees used in account transactions
   */
  async getPayeesByAccount(accountId: number): Promise<Payee[]> {
    if (!accountId || accountId <= 0) {
      throw new ValidationError("Invalid account ID");
    }

    return await this.repository.findByAccountTransactions(accountId);
  }

  /**
   * Verify payee exists
   */
  async verifyPayeeExists(id: number): Promise<boolean> {
    if (!id || id <= 0) return false;
    return await this.repository.exists(id);
  }

  /**
   * Get payee statistics
   */
  async getPayeeStats(id: number): Promise<PayeeStats> {
    await this.getPayeeById(id); // Verify exists
    return await this.repository.getStats(id);
  }

  /**
   * Merge two payees (move all transactions from source to target)
   */
  async mergePayees(sourceId: number, targetId: number): Promise<void> {
    if (!sourceId || !targetId || sourceId === targetId) {
      throw new ValidationError("Invalid payee IDs for merge operation");
    }

    // Verify both payees exist
    await this.getPayeeById(sourceId);
    await this.getPayeeById(targetId);

    // Note: Transaction reassignment would be handled by TransactionService
    // This is a placeholder for the merge operation business logic
    throw new Error("Payee merge functionality not yet implemented");
  }

  /**
   * Private: Validate unique payee name
   */
  private async validateUniquePayeeName(name: string, excludeId?: number): Promise<void> {
    const existingPayees = await this.repository.findAll();

    const duplicate = existingPayees.find(payee =>
      payee.name.toLowerCase() === name.toLowerCase() &&
      payee.id !== excludeId
    );

    if (duplicate) {
      throw new ConflictError(`Payee with name "${name}" already exists`);
    }
  }
}