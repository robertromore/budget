import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PayeeService } from '../../src/lib/server/domains/payees/services';
import { ConflictError, NotFoundError, ValidationError } from '../../src/lib/server/shared/types/errors';
import type { Payee } from '../../src/lib/schema';

// Mock all dependencies
vi.mock('../../src/lib/server/domains/payees/repository', () => ({
  PayeeRepository: vi.fn().mockImplementation(() => ({
    create: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    bulkDelete: vi.fn(),
    search: vi.fn(),
    exists: vi.fn(),
    hasTransactions: vi.fn(),
    updateCalculatedFields: vi.fn(),
    getStats: vi.fn(),
  }))
}));

vi.mock('../../src/lib/server/domains/payees/intelligence', () => ({
  PayeeIntelligenceService: vi.fn().mockImplementation(() => ({
    analyzeSpendingPatterns: vi.fn(),
    predictNextTransaction: vi.fn(),
    suggestBudgetAllocation: vi.fn(),
  }))
}));

vi.mock('../../src/lib/server/domains/payees/category-learning', () => ({
  CategoryLearningService: vi.fn().mockImplementation(() => ({
    learnFromCorrection: vi.fn(),
    analyzeCorrectionPatterns: vi.fn(),
  }))
}));

vi.mock('../../src/lib/server/domains/payees/contact-management', () => ({
  ContactManagementService: vi.fn().mockImplementation(() => ({
    validateContact: vi.fn(),
    detectDuplicates: vi.fn(),
  }))
}));

vi.mock('../../src/lib/server/domains/payees/ml-coordinator', () => ({
  PayeeMLCoordinator: vi.fn().mockImplementation(() => ({
    generateUnifiedRecommendations: vi.fn(),
    detectBehaviorChanges: vi.fn(),
  }))
}));

vi.mock('../../src/lib/server/shared/validation', () => ({
  InputSanitizer: {
    sanitizeText: vi.fn((text) => text),
    sanitizeName: vi.fn((name) => name),
    sanitizeDescription: vi.fn((desc) => desc),
    sanitizeUrl: vi.fn((url) => url),
    sanitizeEmail: vi.fn((email) => email),
    sanitizePhone: vi.fn((phone) => phone),
  }
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
  },
  toISOString: vi.fn((date) => '2024-01-15'),
}));

describe('PayeeService', () => {
  let service: PayeeService;
  let mockRepository: any;
  let mockCategoryService: any;
  let mockBudgetService: any;

  beforeEach(async () => {
    mockCategoryService = {
      verifyCategoryExists: vi.fn().mockResolvedValue(true),
    };

    mockBudgetService = {
      getBudget: vi.fn().mockResolvedValue({ id: 1, name: 'Test Budget' }),
    };

    service = new PayeeService(undefined, mockCategoryService, mockBudgetService);
    mockRepository = (service as any).repository;
    vi.clearAllMocks();

    // Reset InputSanitizer mocks to default behavior with smart handling
    const { InputSanitizer } = await import('../../src/lib/server/shared/validation');
    vi.mocked(InputSanitizer.sanitizeName).mockImplementation((name) => {
      // Return empty string only if input is empty/whitespace
      return name && name.trim() ? name.trim() : '';
    });
    vi.mocked(InputSanitizer.sanitizeDescription).mockImplementation((desc) => desc);
    vi.mocked(InputSanitizer.sanitizeText).mockImplementation((text) => text);
  });

  describe('createPayee', () => {
    it('should create a payee with valid data', async () => {
      const payeeData = {
        name: 'Test Payee',
        notes: 'Test notes',
        isActive: true,
        taxRelevant: false,
      };

      const createdPayee: Payee = {
        id: 1,
        ...payeeData,
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

      mockRepository.create.mockResolvedValue(createdPayee);

      const result = await service.createPayee(payeeData);

      expect(result).toEqual(createdPayee);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Payee',
          notes: 'Test notes',
        })
      );
    });

    it('should sanitize input fields', async () => {
      const payeeData = {
        name: '  Test Payee  ',
        notes: '  Test notes  ',
        isActive: true,
        taxRelevant: false,
      };

      mockRepository.create.mockResolvedValue({ id: 1, ...payeeData });

      await service.createPayee(payeeData);

      expect(mockRepository.create).toHaveBeenCalled();
    });

    it('should validate category exists when defaultCategoryId provided', async () => {
      const payeeData = {
        name: 'Test Payee',
        defaultCategoryId: 1,
        isActive: true,
        taxRelevant: false,
      };

      mockCategoryService.verifyCategoryExists.mockResolvedValue(true);
      mockRepository.create.mockResolvedValue({ id: 1, ...payeeData });

      await service.createPayee(payeeData);

      expect(mockCategoryService.verifyCategoryExists).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundError when category does not exist', async () => {
      const payeeData = {
        name: 'Test Payee',
        defaultCategoryId: 999,
        isActive: true,
        taxRelevant: false,
      };

      mockCategoryService.verifyCategoryExists.mockResolvedValue(false);

      await expect(service.createPayee(payeeData)).rejects.toThrow(NotFoundError);
    });

    it('should validate budget exists when defaultBudgetId provided', async () => {
      const payeeData = {
        name: 'Test Payee',
        defaultBudgetId: 1,
        isActive: true,
        taxRelevant: false,
      };

      mockBudgetService.getBudget.mockResolvedValue({ id: 1, name: 'Test Budget' });
      mockRepository.create.mockResolvedValue({ id: 1, ...payeeData });

      await service.createPayee(payeeData);

      expect(mockBudgetService.getBudget).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundError when budget does not exist', async () => {
      const payeeData = {
        name: 'Test Payee',
        defaultBudgetId: 999,
        isActive: true,
        taxRelevant: false,
      };

      mockBudgetService.getBudget.mockRejectedValue(new NotFoundError('Budget', 999));

      await expect(service.createPayee(payeeData)).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError for invalid name (empty after sanitization)', async () => {
      const payeeData = {
        name: '   ', // Empty after trimming - the mock will return empty string
        isActive: true,
        taxRelevant: false,
      };

      // The mock already handles empty/whitespace input by returning empty string
      await expect(service.createPayee(payeeData)).rejects.toThrow(ValidationError);
    });
  });

  describe('updatePayee', () => {
    it('should update payee successfully', async () => {
      const existingPayee: Payee = {
        id: 1,
        name: 'Old Payee',
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

      mockRepository.findById.mockResolvedValue(existingPayee);
      mockRepository.update.mockResolvedValue(updatedPayee);

      const result = await service.updatePayee(1, updateData);

      expect(result).toEqual(updatedPayee);
      expect(mockRepository.update).toHaveBeenCalledWith(1, expect.any(Object));
    });

    it('should throw NotFoundError when payee does not exist', async () => {
      mockRepository.update.mockRejectedValue(new NotFoundError('Payee', 999));

      await expect(service.updatePayee(999, { name: 'Updated' })).rejects.toThrow(NotFoundError);
    });

    it('should validate category when updating defaultCategoryId', async () => {
      const existingPayee: Payee = {
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

      const updateData = {
        defaultCategoryId: 1,
      };

      mockRepository.findById.mockResolvedValue(existingPayee);
      mockCategoryService.verifyCategoryExists.mockResolvedValue(true);
      mockRepository.update.mockResolvedValue({ ...existingPayee, ...updateData });

      await service.updatePayee(1, updateData);

      expect(mockCategoryService.verifyCategoryExists).toHaveBeenCalledWith(1);
    });
  });

  describe('deletePayee', () => {
    it('should soft delete payee successfully', async () => {
      const existingPayee: Payee = {
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

      mockRepository.findById.mockResolvedValue(existingPayee);
      mockRepository.softDelete.mockResolvedValue(deletedPayee);

      const result = await service.deletePayee(1);

      expect(result).toEqual(deletedPayee);
      expect(mockRepository.softDelete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundError when payee does not exist', async () => {
      mockRepository.softDelete.mockRejectedValue(new NotFoundError('Payee', 999));

      await expect(service.deletePayee(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getPayeeById', () => {
    it('should return payee by ID', async () => {
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

      mockRepository.findById.mockResolvedValue(mockPayee);

      const result = await service.getPayeeById(1);

      expect(result).toEqual(mockPayee);
      expect(mockRepository.findById).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundError when payee not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getPayeeById(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getAllPayees', () => {
    it('should return all payees', async () => {
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

      mockRepository.findAll.mockResolvedValue(mockPayees);

      const result = await service.getAllPayees();

      expect(result).toEqual(mockPayees);
      expect(result).toHaveLength(2);
      expect(mockRepository.findAll).toHaveBeenCalled();
    });

    it('should return empty array when no payees exist', async () => {
      mockRepository.findAll.mockResolvedValue([]);

      const result = await service.getAllPayees();

      expect(result).toEqual([]);
    });
  });

  describe('searchPayees', () => {
    it('should search payees by query', async () => {
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

      mockRepository.search.mockResolvedValue(mockPayees);

      const result = await service.searchPayees('amazon');

      expect(result).toEqual(mockPayees);
      expect(mockRepository.search).toHaveBeenCalledWith('amazon');
    });
  });

  describe('bulkDeletePayees', () => {
    it('should bulk delete multiple payees', async () => {
      const payee1 = { id: 1, name: 'Payee 1', hasTransactions: false };
      const payee2 = { id: 2, name: 'Payee 2', hasTransactions: false };
      const payee3 = { id: 3, name: 'Payee 3', hasTransactions: false };

      mockRepository.findById
        .mockResolvedValueOnce(payee1)
        .mockResolvedValueOnce(payee2)
        .mockResolvedValueOnce(payee3);

      mockRepository.hasTransactions
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false);

      mockRepository.bulkDelete.mockResolvedValue(3);

      const result = await service.bulkDeletePayees([1, 2, 3]);

      expect(result.deletedCount).toBe(3);
      expect(result.errors).toEqual([]);
    });

    it('should throw ValidationError when empty array provided', async () => {
      await expect(service.bulkDeletePayees([])).rejects.toThrow(ValidationError);
    });
  });

  describe('mergePayees', () => {
    it('should merge two payees successfully', async () => {
      const sourcePayee: Payee = {
        id: 1,
        name: 'Source Payee',
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

      const targetPayee: Payee = {
        id: 2,
        name: 'Target Payee',
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

      const mockStats = {
        transactionCount: 5,
        totalAmount: 500,
        avgAmount: 100,
        minAmount: 50,
        maxAmount: 150,
        lastTransactionDate: '2024-01-15',
        firstTransactionDate: '2024-01-01',
        monthlyAverage: 100,
        categoryDistribution: [],
      };

      mockRepository.findById.mockResolvedValueOnce(sourcePayee).mockResolvedValueOnce(targetPayee);
      mockRepository.getStats.mockResolvedValue(mockStats);
      mockRepository.softDelete.mockResolvedValue(sourcePayee);
      mockRepository.updateCalculatedFields.mockResolvedValue(targetPayee);

      await service.mergePayees(1, 2);

      expect(mockRepository.findById).toHaveBeenCalledWith(1);
      expect(mockRepository.findById).toHaveBeenCalledWith(2);
      expect(mockRepository.softDelete).toHaveBeenCalledWith(1);
      expect(mockRepository.updateCalculatedFields).toHaveBeenCalledWith(2);
    });

    it('should throw ValidationError when merging payee with itself', async () => {
      await expect(service.mergePayees(1, 1)).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when source payee does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.mergePayees(999, 2)).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when target payee does not exist', async () => {
      const sourcePayee: Payee = {
        id: 1,
        name: 'Source Payee',
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

      mockRepository.findById.mockResolvedValueOnce(sourcePayee).mockResolvedValueOnce(null);

      await expect(service.mergePayees(1, 999)).rejects.toThrow(NotFoundError);
    });
  });
});