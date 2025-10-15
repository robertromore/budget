import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TransactionService } from '$lib/server/domains/transactions/services';
import type { TransactionRepository } from '$lib/server/domains/transactions/repository';
import type { PayeeService } from '$lib/server/domains/payees/services';
import type { CategoryService } from '$lib/server/domains/categories/services';
import type { BudgetTransactionService } from '$lib/server/domains/budgets/services';
import type { BudgetCalculationService } from '$lib/server/domains/budgets/calculation-service';
import type { Transaction } from '$lib/schema/transactions';
import { ValidationError, NotFoundError } from '$lib/server/shared/types/errors';

describe('TransactionService', () => {
  let mockTransactionRepository: Partial<TransactionRepository>;
  let mockPayeeService: Partial<PayeeService>;
  let mockCategoryService: Partial<CategoryService>;
  let mockBudgetTransactionService: Partial<BudgetTransactionService>;
  let mockBudgetCalculationService: Partial<BudgetCalculationService>;
  let transactionService: TransactionService;

  const mockTransaction: Transaction = {
    id: 1,
    accountId: 100,
    amount: 50.00,
    date: '2024-01-15',
    payeeId: 10,
    categoryId: 5,
    notes: 'Test transaction',
    status: 'cleared',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  };

  beforeEach(() => {
    // Reset all mocks before each test
    mockTransactionRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findByAccountId: vi.fn(),
      findAll: vi.fn(),
    };

    mockPayeeService = {
      getPayeeById: vi.fn(),
      updateCalculatedFields: vi.fn(),
    };

    mockCategoryService = {
      getCategoryById: vi.fn(),
    };

    mockBudgetTransactionService = {
      createBudgetTransaction: vi.fn(),
      updateBudgetTransaction: vi.fn(),
      deleteBudgetTransactions: vi.fn(),
    };

    mockBudgetCalculationService = {
      recalculateBudgetAmounts: vi.fn(),
    };

    // Inject all mocks
    transactionService = new TransactionService(
      mockTransactionRepository as TransactionRepository,
      mockPayeeService as PayeeService,
      mockCategoryService as CategoryService,
      mockBudgetTransactionService as BudgetTransactionService,
      mockBudgetCalculationService as BudgetCalculationService
    );
  });

  describe('createTransaction', () => {
    it('should create a transaction successfully', async () => {
      const createData = {
        accountId: 100,
        amount: 50.00,
        date: '2024-01-15',
        payeeId: 10,
        categoryId: 5,
        notes: 'Test transaction',
        status: 'cleared' as const,
      };

      vi.mocked(mockTransactionRepository.create!).mockResolvedValue(mockTransaction);

      const result = await transactionService.createTransaction(createData);

      expect(mockTransactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 100,
          amount: 50.00,
          date: '2024-01-15',
        })
      );
      expect(result).toEqual(mockTransaction);
    });

    it('should throw ValidationError when accountId is missing', async () => {
      const invalidData = {
        amount: 50.00,
        date: '2024-01-15',
      } as any;

      await expect(transactionService.createTransaction(invalidData))
        .rejects
        .toThrow(ValidationError);
    });

    it('should throw ValidationError when amount is missing', async () => {
      const invalidData = {
        accountId: 100,
        date: '2024-01-15',
      } as any;

      await expect(transactionService.createTransaction(invalidData))
        .rejects
        .toThrow(ValidationError);
    });

    it('should throw ValidationError when date is missing', async () => {
      const invalidData = {
        accountId: 100,
        amount: 50.00,
      } as any;

      await expect(transactionService.createTransaction(invalidData))
        .rejects
        .toThrow(ValidationError);
    });

    it('should default status to "cleared" when not provided', async () => {
      const createData = {
        accountId: 100,
        amount: 50.00,
        date: '2024-01-15',
      };

      vi.mocked(mockTransactionRepository.create!).mockResolvedValue(mockTransaction);

      await transactionService.createTransaction(createData);

      expect(mockTransactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'cleared',
        })
      );
    });
  });

  describe('getTransactionById', () => {
    it('should return a transaction when found', async () => {
      vi.mocked(mockTransactionRepository.findById!).mockResolvedValue(mockTransaction);

      const result = await transactionService.getTransactionById(1);

      expect(mockTransactionRepository.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockTransaction);
    });

    it('should throw NotFoundError when transaction does not exist', async () => {
      vi.mocked(mockTransactionRepository.findById!).mockResolvedValue(null);

      await expect(transactionService.getTransactionById(999))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('updateTransaction', () => {
    it('should update a transaction successfully', async () => {
      const updateData = {
        amount: 75.00,
        notes: 'Updated notes',
      };

      const updatedTransaction = {
        ...mockTransaction,
        amount: 75.00,
        notes: 'Updated notes',
      };

      vi.mocked(mockTransactionRepository.findById!).mockResolvedValue(mockTransaction);
      vi.mocked(mockTransactionRepository.update!).mockResolvedValue(updatedTransaction);

      const result = await transactionService.updateTransaction(1, updateData);

      expect(mockTransactionRepository.findById).toHaveBeenCalledWith(1);
      expect(mockTransactionRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining(updateData)
      );
      expect(result.amount).toBe(75.00);
      expect(result.notes).toBe('Updated notes');
    });

    it('should throw NotFoundError when updating non-existent transaction', async () => {
      vi.mocked(mockTransactionRepository.findById!).mockResolvedValue(null);

      await expect(transactionService.updateTransaction(999, { amount: 100 }))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('deleteTransaction', () => {
    it('should delete a transaction successfully', async () => {
      vi.mocked(mockTransactionRepository.findById!).mockResolvedValue(mockTransaction);
      vi.mocked(mockTransactionRepository.delete!).mockResolvedValue(undefined);
      vi.mocked(mockBudgetTransactionService.deleteBudgetTransactions!).mockResolvedValue(undefined);

      await transactionService.deleteTransaction(1);

      expect(mockTransactionRepository.findById).toHaveBeenCalledWith(1);
      expect(mockBudgetTransactionService.deleteBudgetTransactions).toHaveBeenCalledWith([1]);
      expect(mockTransactionRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundError when deleting non-existent transaction', async () => {
      vi.mocked(mockTransactionRepository.findById!).mockResolvedValue(null);

      await expect(transactionService.deleteTransaction(999))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('getAccountTransactions', () => {
    it('should return all transactions for an account', async () => {
      const mockTransactions = [
        mockTransaction,
        { ...mockTransaction, id: 2, amount: 100.00 },
        { ...mockTransaction, id: 3, amount: 25.50 },
      ];

      vi.mocked(mockTransactionRepository.findByAccountId!).mockResolvedValue(mockTransactions);

      const result = await transactionService.getAccountTransactions(100);

      expect(mockTransactionRepository.findByAccountId).toHaveBeenCalledWith(100);
      expect(result).toHaveLength(3);
      expect(result).toEqual(mockTransactions);
    });

    it('should return empty array when account has no transactions', async () => {
      vi.mocked(mockTransactionRepository.findByAccountId!).mockResolvedValue([]);

      const result = await transactionService.getAccountTransactions(100);

      expect(result).toEqual([]);
    });
  });

  describe('createTransactionWithPayeeDefaults', () => {
    it('should create transaction with payee suggestions when payeeId provided', async () => {
      const createData = {
        accountId: 100,
        amount: 50.00,
        date: '2024-01-15',
        payeeId: 10,
        autoPopulateFromPayee: true,
        allowPayeeOverrides: true,
        updatePayeeStats: true,
      };

      const mockSuggestions = {
        suggestedCategoryId: 5,
        suggestedBudgetId: 20,
        suggestedNotes: 'Groceries',
        confidence: 85,
        basedOn: 'historical' as const,
      };

      vi.mocked(mockTransactionRepository.create!).mockResolvedValue(mockTransaction);

      // Mock the suggestTransactionDetails method internally
      vi.spyOn(transactionService, 'suggestTransactionDetails').mockResolvedValue(mockSuggestions);
      vi.spyOn(transactionService, 'updatePayeeAfterTransaction').mockResolvedValue(undefined);

      const result = await transactionService.createTransactionWithPayeeDefaults(createData);

      expect(transactionService.suggestTransactionDetails).toHaveBeenCalledWith(10, 50.00);
      expect(transactionService.updatePayeeAfterTransaction).toHaveBeenCalledWith(10);
      expect(result).toEqual(mockTransaction);
    });

    it('should skip payee suggestions when autoPopulateFromPayee is false', async () => {
      const createData = {
        accountId: 100,
        amount: 50.00,
        date: '2024-01-15',
        payeeId: 10,
        autoPopulateFromPayee: false,
      };

      vi.mocked(mockTransactionRepository.create!).mockResolvedValue(mockTransaction);
      vi.spyOn(transactionService, 'suggestTransactionDetails');

      await transactionService.createTransactionWithPayeeDefaults(createData);

      expect(transactionService.suggestTransactionDetails).not.toHaveBeenCalled();
    });

    it('should continue transaction creation even if payee suggestions fail', async () => {
      const createData = {
        accountId: 100,
        amount: 50.00,
        date: '2024-01-15',
        payeeId: 10,
        autoPopulateFromPayee: true,
      };

      vi.mocked(mockTransactionRepository.create!).mockResolvedValue(mockTransaction);
      vi.spyOn(transactionService, 'suggestTransactionDetails').mockRejectedValue(
        new Error('Suggestion service failed')
      );

      const result = await transactionService.createTransactionWithPayeeDefaults(createData);

      expect(result).toEqual(mockTransaction);
    });
  });

  describe('deleteTransactions (bulk)', () => {
    it('should delete multiple transactions', async () => {
      const idsToDelete = [1, 2, 3];

      vi.mocked(mockBudgetTransactionService.deleteBudgetTransactions!).mockResolvedValue(undefined);
      vi.mocked(mockTransactionRepository.delete!).mockResolvedValue(undefined);

      await transactionService.deleteTransactions(idsToDelete);

      expect(mockBudgetTransactionService.deleteBudgetTransactions).toHaveBeenCalledWith(idsToDelete);
      expect(mockTransactionRepository.delete).toHaveBeenCalledTimes(3);
      expect(mockTransactionRepository.delete).toHaveBeenCalledWith(1);
      expect(mockTransactionRepository.delete).toHaveBeenCalledWith(2);
      expect(mockTransactionRepository.delete).toHaveBeenCalledWith(3);
    });

    it('should handle empty array gracefully', async () => {
      await transactionService.deleteTransactions([]);

      expect(mockBudgetTransactionService.deleteBudgetTransactions).toHaveBeenCalledWith([]);
      expect(mockTransactionRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('getAccountSummary', () => {
    it('should return transaction summary for an account', async () => {
      const mockTransactions = [
        { ...mockTransaction, status: 'cleared', amount: 100 },
        { ...mockTransaction, id: 2, status: 'cleared', amount: -50 },
        { ...mockTransaction, id: 3, status: 'pending', amount: 25 },
      ];

      vi.mocked(mockTransactionRepository.findByAccountId!).mockResolvedValue(mockTransactions);

      const result = await transactionService.getAccountSummary(100);

      expect(result).toHaveProperty('totalIncome');
      expect(result).toHaveProperty('totalExpenses');
      expect(result).toHaveProperty('totalTransactions');
      expect(result).toHaveProperty('clearedCount');
      expect(result).toHaveProperty('pendingCount');
    });
  });
});
