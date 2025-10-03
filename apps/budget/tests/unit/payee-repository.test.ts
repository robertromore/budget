import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PayeeRepository } from '../../src/lib/server/domains/payees/repository';
import { NotFoundError } from '../../src/lib/server/shared/types/errors';
import type { Payee, NewPayee } from '../../src/lib/schema';

// Mock the database
vi.mock('../../src/lib/server/db', () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    selectDistinct: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
  }
}));

vi.mock('../../src/lib/schema', () => ({
  payees: {
    id: 'id',
    name: 'name',
    notes: 'notes',
    defaultCategoryId: 'defaultCategoryId',
    defaultBudgetId: 'defaultBudgetId',
    payeeType: 'payeeType',
    avgAmount: 'avgAmount',
    paymentFrequency: 'paymentFrequency',
    lastTransactionDate: 'lastTransactionDate',
    taxRelevant: 'taxRelevant',
    isActive: 'isActive',
    website: 'website',
    phone: 'phone',
    email: 'email',
    address: 'address',
    accountNumber: 'accountNumber',
    alertThreshold: 'alertThreshold',
    isSeasonal: 'isSeasonal',
    subscriptionInfo: 'subscriptionInfo',
    tags: 'tags',
    preferredPaymentMethods: 'preferredPaymentMethods',
    merchantCategoryCode: 'merchantCategoryCode',
    dateCreated: 'dateCreated',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    deletedAt: 'deletedAt',
  },
  transactions: {
    id: 'id',
    payeeId: 'payeeId',
    accountId: 'accountId',
    amount: 'amount',
    date: 'date',
    categoryId: 'categoryId',
    deletedAt: 'deletedAt',
  },
  categories: {
    id: 'id',
    name: 'name',
  },
  budgets: {
    id: 'id',
    name: 'name',
  }
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  isNull: vi.fn(),
  like: vi.fn(),
  inArray: vi.fn(),
  sql: vi.fn(),
  count: vi.fn(),
  desc: vi.fn(),
  avg: vi.fn(),
  sum: vi.fn(),
  min: vi.fn(),
  max: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
}));

vi.mock('../../src/lib/server/shared/logging', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}));

vi.mock('../../src/lib/utils/dates', () => ({
  getCurrentTimestamp: vi.fn(() => '2024-01-15T12:00:00Z'),
  currentDate: {
    subtract: vi.fn(() => ({ year: 2023, month: 10, day: 15 })),
    year: 2024,
    month: 1,
    day: 15,
  }
}));

describe('PayeeRepository', () => {
  let repository: PayeeRepository;
  let mockDb: any;

  beforeEach(async () => {
    repository = new PayeeRepository();
    const db = await import('../../src/lib/server/db');
    mockDb = db.db;
    vi.clearAllMocks();

    // Reset all mock functions to return 'this' for chaining
    mockDb.insert.mockReturnThis();
    mockDb.select.mockReturnThis();
    mockDb.selectDistinct.mockReturnThis();
    mockDb.update.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.orderBy.mockReturnThis();
    mockDb.groupBy.mockReturnThis();
    mockDb.leftJoin.mockReturnThis();
    mockDb.limit.mockReturnThis();
    mockDb.set.mockReturnThis();
    mockDb.values.mockReturnThis();
  });

  describe('create', () => {
    it('should create a new payee successfully', async () => {
      const newPayee: NewPayee = {
        name: 'Test Payee',
        notes: 'Test notes',
        isActive: true,
        taxRelevant: false,
      };

      const createdPayee: Payee = {
        id: 1,
        ...newPayee,
        defaultCategoryId: null,
        defaultBudgetId: null,
        payeeType: null,
        avgAmount: null,
        paymentFrequency: null,
        lastTransactionDate: null,
        website: null,
        phone: null,
        email: null,
        address: null,
        accountNumber: null,
        alertThreshold: null,
        isSeasonal: false,
        subscriptionInfo: null,
        tags: null,
        preferredPaymentMethods: null,
        merchantCategoryCode: null,
        dateCreated: null,
        createdAt: '2024-01-15T12:00:00Z',
        updatedAt: '2024-01-15T12:00:00Z',
        deletedAt: null,
      };

      vi.mocked(mockDb.returning).mockResolvedValue([createdPayee]);

      const result = await repository.create(newPayee);

      expect(result).toEqual(createdPayee);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(newPayee);
    });

    it('should throw error if payee creation fails', async () => {
      const newPayee: NewPayee = {
        name: 'Test Payee',
        isActive: true,
        taxRelevant: false,
      };

      vi.mocked(mockDb.returning).mockResolvedValue([]);

      await expect(repository.create(newPayee)).rejects.toThrow('Failed to create payee');
    });
  });

  describe('findById', () => {
    it('should return payee when found', async () => {
      const mockPayee: Payee = {
        id: 1,
        name: 'Test Payee',
        notes: null,
        defaultCategoryId: null,
        defaultBudgetId: null,
        payeeType: null,
        avgAmount: null,
        paymentFrequency: null,
        lastTransactionDate: null,
        taxRelevant: false,
        isActive: true,
        website: null,
        phone: null,
        email: null,
        address: null,
        accountNumber: null,
        alertThreshold: null,
        isSeasonal: false,
        subscriptionInfo: null,
        tags: null,
        preferredPaymentMethods: null,
        merchantCategoryCode: null,
        dateCreated: null,
        createdAt: '2024-01-15T12:00:00Z',
        updatedAt: '2024-01-15T12:00:00Z',
        deletedAt: null,
      };

      vi.mocked(mockDb.limit).mockResolvedValue([mockPayee]);

      const result = await repository.findById(1);

      expect(result).toEqual(mockPayee);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.limit).toHaveBeenCalledWith(1);
    });

    it('should return null when payee not found', async () => {
      vi.mocked(mockDb.limit).mockResolvedValue([]);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all active payees ordered by name', async () => {
      const mockPayees: Payee[] = [
        {
          id: 1,
          name: 'Payee A',
          notes: null,
          defaultCategoryId: null,
          defaultBudgetId: null,
          payeeType: null,
          avgAmount: null,
          paymentFrequency: null,
          lastTransactionDate: null,
          taxRelevant: false,
          isActive: true,
          website: null,
          phone: null,
          email: null,
          address: null,
          accountNumber: null,
          alertThreshold: null,
          isSeasonal: false,
          subscriptionInfo: null,
          tags: null,
          preferredPaymentMethods: null,
          merchantCategoryCode: null,
          dateCreated: null,
          createdAt: '2024-01-15T12:00:00Z',
          updatedAt: '2024-01-15T12:00:00Z',
          deletedAt: null,
        },
        {
          id: 2,
          name: 'Payee B',
          notes: null,
          defaultCategoryId: null,
          defaultBudgetId: null,
          payeeType: null,
          avgAmount: null,
          paymentFrequency: null,
          lastTransactionDate: null,
          taxRelevant: false,
          isActive: true,
          website: null,
          phone: null,
          email: null,
          address: null,
          accountNumber: null,
          alertThreshold: null,
          isSeasonal: false,
          subscriptionInfo: null,
          tags: null,
          preferredPaymentMethods: null,
          merchantCategoryCode: null,
          dateCreated: null,
          createdAt: '2024-01-15T12:00:00Z',
          updatedAt: '2024-01-15T12:00:00Z',
          deletedAt: null,
        },
      ];

      vi.mocked(mockDb.orderBy).mockResolvedValue(mockPayees);

      const result = await repository.findAll();

      expect(result).toEqual(mockPayees);
      expect(result).toHaveLength(2);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.orderBy).toHaveBeenCalled();
    });

    it('should return empty array when no payees exist', async () => {
      vi.mocked(mockDb.orderBy).mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update payee successfully', async () => {
      const updateData = {
        name: 'Updated Payee',
        notes: 'Updated notes',
      };

      const updatedPayee: Payee = {
        id: 1,
        name: 'Updated Payee',
        notes: 'Updated notes',
        defaultCategoryId: null,
        defaultBudgetId: null,
        payeeType: null,
        avgAmount: null,
        paymentFrequency: null,
        lastTransactionDate: null,
        taxRelevant: false,
        isActive: true,
        website: null,
        phone: null,
        email: null,
        address: null,
        accountNumber: null,
        alertThreshold: null,
        isSeasonal: false,
        subscriptionInfo: null,
        tags: null,
        preferredPaymentMethods: null,
        merchantCategoryCode: null,
        dateCreated: null,
        createdAt: '2024-01-15T12:00:00Z',
        updatedAt: '2024-01-15T12:30:00Z',
        deletedAt: null,
      };

      vi.mocked(mockDb.returning).mockResolvedValue([updatedPayee]);

      const result = await repository.update(1, updateData);

      expect(result).toEqual(updatedPayee);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalled();
    });

    it('should throw NotFoundError when payee does not exist', async () => {
      const updateData = {
        name: 'Updated Payee',
      };

      vi.mocked(mockDb.returning).mockResolvedValue([]);

      await expect(repository.update(999, updateData)).rejects.toThrow(NotFoundError);
    });
  });

  describe('softDelete', () => {
    it('should soft delete payee successfully', async () => {
      const deletedPayee: Payee = {
        id: 1,
        name: 'Deleted Payee',
        notes: null,
        defaultCategoryId: null,
        defaultBudgetId: null,
        payeeType: null,
        avgAmount: null,
        paymentFrequency: null,
        lastTransactionDate: null,
        taxRelevant: false,
        isActive: true,
        website: null,
        phone: null,
        email: null,
        address: null,
        accountNumber: null,
        alertThreshold: null,
        isSeasonal: false,
        subscriptionInfo: null,
        tags: null,
        preferredPaymentMethods: null,
        merchantCategoryCode: null,
        dateCreated: null,
        createdAt: '2024-01-15T12:00:00Z',
        updatedAt: '2024-01-15T12:30:00Z',
        deletedAt: '2024-01-15T12:30:00Z',
      };

      vi.mocked(mockDb.returning).mockResolvedValue([deletedPayee]);

      const result = await repository.softDelete(1);

      expect(result).toEqual(deletedPayee);
      expect(result.deletedAt).toBe('2024-01-15T12:30:00Z');
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should throw NotFoundError when payee does not exist', async () => {
      vi.mocked(mockDb.returning).mockResolvedValue([]);

      await expect(repository.softDelete(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('bulkDelete', () => {
    it('should bulk delete multiple payees', async () => {
      const deletedPayees = [{ id: 1 }, { id: 2 }, { id: 3 }];
      vi.mocked(mockDb.returning).mockResolvedValue(deletedPayees);

      const result = await repository.bulkDelete([1, 2, 3]);

      expect(result).toBe(3);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalled();
    });

    it('should return 0 when empty array provided', async () => {
      const result = await repository.bulkDelete([]);

      expect(result).toBe(0);
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should return count of actually deleted payees', async () => {
      const deletedPayees = [{ id: 1 }];
      vi.mocked(mockDb.returning).mockResolvedValue(deletedPayees);

      const result = await repository.bulkDelete([1, 2, 3]);

      expect(result).toBe(1);
    });
  });

  describe('search', () => {
    it('should search payees by name', async () => {
      const mockPayees: Payee[] = [
        {
          id: 1,
          name: 'Amazon',
          notes: null,
          defaultCategoryId: null,
          defaultBudgetId: null,
          payeeType: null,
          avgAmount: null,
          paymentFrequency: null,
          lastTransactionDate: null,
          taxRelevant: false,
          isActive: true,
          website: null,
          phone: null,
          email: null,
          address: null,
          accountNumber: null,
          alertThreshold: null,
          isSeasonal: false,
          subscriptionInfo: null,
          tags: null,
          preferredPaymentMethods: null,
          merchantCategoryCode: null,
          dateCreated: null,
          createdAt: '2024-01-15T12:00:00Z',
          updatedAt: '2024-01-15T12:00:00Z',
          deletedAt: null,
        },
      ];

      vi.mocked(mockDb.limit).mockResolvedValue(mockPayees);

      const result = await repository.search('amazon');

      expect(result).toEqual(mockPayees);
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.limit).toHaveBeenCalledWith(50);
    });

    it('should return all payees when query is empty', async () => {
      const mockPayees: Payee[] = [];
      vi.mocked(mockDb.orderBy).mockResolvedValue(mockPayees);

      const result = await repository.search('');

      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe('exists', () => {
    it('should return true when payee exists', async () => {
      vi.mocked(mockDb.limit).mockResolvedValue([{ id: 1 }]);

      const result = await repository.exists(1);

      expect(result).toBe(true);
    });

    it('should return false when payee does not exist', async () => {
      vi.mocked(mockDb.limit).mockResolvedValue([]);

      const result = await repository.exists(999);

      expect(result).toBe(false);
    });
  });

  describe('hasTransactions', () => {
    it('should return true when payee has transactions', async () => {
      vi.mocked(mockDb.limit).mockResolvedValue([{ id: 1 }]);

      const result = await repository.hasTransactions(1);

      expect(result).toBe(true);
    });

    it('should return false when payee has no transactions', async () => {
      vi.mocked(mockDb.limit).mockResolvedValue([]);

      const result = await repository.hasTransactions(1);

      expect(result).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return comprehensive stats for payee with transactions', async () => {
      const mockBasicStats = {
        transactionCount: 5,
        totalAmount: 500,
        avgAmount: 100,
        minAmount: 50,
        maxAmount: 150,
        lastTransactionDate: '2024-01-15',
        firstTransactionDate: '2024-01-01',
      };

      const mockCategoryDist = [
        {
          categoryId: 1,
          categoryName: 'Groceries',
          count: 3,
          totalAmount: 300,
        },
        {
          categoryId: 2,
          categoryName: 'Dining',
          count: 2,
          totalAmount: 200,
        },
      ];

      // Mock the first query (basic stats)
      vi.mocked(mockDb.where).mockResolvedValueOnce([mockBasicStats]);

      // Mock the second query (category distribution)
      vi.mocked(mockDb.orderBy).mockResolvedValueOnce(mockCategoryDist);

      const result = await repository.getStats(1);

      expect(result.transactionCount).toBe(5);
      expect(result.totalAmount).toBe(500);
      expect(result.avgAmount).toBe(100);
      expect(result.categoryDistribution).toHaveLength(2);
      expect(result.categoryDistribution[0].categoryName).toBe('Groceries');
    });

    it('should return zero stats for payee with no transactions', async () => {
      const mockEmptyStats = {
        transactionCount: 0,
        totalAmount: 0,
        avgAmount: 0,
        minAmount: 0,
        maxAmount: 0,
        lastTransactionDate: null,
        firstTransactionDate: null,
      };

      vi.mocked(mockDb.where).mockResolvedValueOnce([mockEmptyStats]);
      vi.mocked(mockDb.orderBy).mockResolvedValueOnce([]);

      const result = await repository.getStats(1);

      expect(result.transactionCount).toBe(0);
      expect(result.totalAmount).toBe(0);
      expect(result.categoryDistribution).toEqual([]);
    });
  });

  describe('searchWithFilters', () => {
    it('should search with multiple filters', async () => {
      const filters = {
        query: 'Amazon',
        payeeType: 'merchant' as const,
        isActive: true,
        taxRelevant: false,
      };

      const mockPayees: Payee[] = [
        {
          id: 1,
          name: 'Amazon',
          notes: null,
          defaultCategoryId: null,
          defaultBudgetId: null,
          payeeType: 'merchant',
          avgAmount: null,
          paymentFrequency: null,
          lastTransactionDate: null,
          taxRelevant: false,
          isActive: true,
          website: null,
          phone: null,
          email: null,
          address: null,
          accountNumber: null,
          alertThreshold: null,
          isSeasonal: false,
          subscriptionInfo: null,
          tags: null,
          preferredPaymentMethods: null,
          merchantCategoryCode: null,
          dateCreated: null,
          createdAt: '2024-01-15T12:00:00Z',
          updatedAt: '2024-01-15T12:00:00Z',
          deletedAt: null,
        },
      ];

      vi.mocked(mockDb.limit).mockResolvedValue(mockPayees);

      const result = await repository.searchWithFilters(filters);

      expect(result).toEqual(mockPayees);
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.limit).toHaveBeenCalledWith(100);
    });

    it('should handle empty filters', async () => {
      const mockPayees: Payee[] = [];
      vi.mocked(mockDb.limit).mockResolvedValue(mockPayees);

      const result = await repository.searchWithFilters({});

      expect(result).toEqual([]);
    });

    it('should limit results to 100', async () => {
      vi.mocked(mockDb.limit).mockResolvedValue([]);

      await repository.searchWithFilters({ query: 'test' });

      expect(mockDb.limit).toHaveBeenCalledWith(100);
    });
  });

  describe('findByType', () => {
    it('should find payees by type', async () => {
      const mockPayees: Payee[] = [
        {
          id: 1,
          name: 'Merchant A',
          notes: null,
          defaultCategoryId: null,
          defaultBudgetId: null,
          payeeType: 'merchant',
          avgAmount: null,
          paymentFrequency: null,
          lastTransactionDate: null,
          taxRelevant: false,
          isActive: true,
          website: null,
          phone: null,
          email: null,
          address: null,
          accountNumber: null,
          alertThreshold: null,
          isSeasonal: false,
          subscriptionInfo: null,
          tags: null,
          preferredPaymentMethods: null,
          merchantCategoryCode: null,
          dateCreated: null,
          createdAt: '2024-01-15T12:00:00Z',
          updatedAt: '2024-01-15T12:00:00Z',
          deletedAt: null,
        },
      ];

      vi.mocked(mockDb.orderBy).mockResolvedValue(mockPayees);

      const result = await repository.findByType('merchant');

      expect(result).toEqual(mockPayees);
      expect(mockDb.where).toHaveBeenCalled();
    });
  });
});