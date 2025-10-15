import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PayeeService } from '$lib/server/domains/payees/services';
import type { PayeeRepository } from '$lib/server/domains/payees/repository';
import type { PayeeIntelligenceService } from '$lib/server/domains/payees/intelligence';
import type { CategoryLearningService } from '$lib/server/domains/payees/category-learning';
import type { PayeeMLCoordinator } from '$lib/server/domains/payees/ml-coordinator';
import type { ContactManagementService } from '$lib/server/domains/payees/contact-management';
import type { SubscriptionManagementService } from '$lib/server/domains/payees/subscription-management';
import type { CategoryService } from '$lib/server/domains/categories/services';
import type { BudgetService } from '$lib/server/domains/budgets/services';
import type { Payee } from '$lib/schema/payees';
import { ValidationError, NotFoundError, ConflictError } from '$lib/server/shared/types/errors';

describe('PayeeService', () => {
  let mockPayeeRepository: Partial<PayeeRepository>;
  let mockIntelligenceService: Partial<PayeeIntelligenceService>;
  let mockLearningService: Partial<CategoryLearningService>;
  let mockMLCoordinator: Partial<PayeeMLCoordinator>;
  let mockContactService: Partial<ContactManagementService>;
  let mockSubscriptionService: Partial<SubscriptionManagementService>;
  let mockCategoryService: Partial<CategoryService>;
  let mockBudgetService: Partial<BudgetService>;
  let payeeService: PayeeService;

  const mockPayee: Payee = {
    id: 1,
    name: 'Grocery Store',
    slug: 'grocery-store',
    notes: null,
    defaultCategoryId: 5,
    defaultBudgetId: null,
    payeeType: 'merchant',
    taxRelevant: false,
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
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    mockPayeeRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByIdOrThrow: vi.fn(),
      findBySlug: vi.fn(),
      findBySlugOrThrow: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findAll: vi.fn(),
      search: vi.fn(),
      hasTransactions: vi.fn(),
    };

    mockIntelligenceService = {
      analyzeSpendingPatterns: vi.fn(),
    };

    mockLearningService = {
      learnFromCorrection: vi.fn(),
    };

    mockMLCoordinator = {
      generateUnifiedRecommendations: vi.fn(),
    };

    mockContactService = {
      validateContactInfo: vi.fn(),
    };

    mockSubscriptionService = {
      detectSubscription: vi.fn(),
    };

    mockCategoryService = {
      getCategoryById: vi.fn(),
      verifyCategoryExists: vi.fn(),
    };

    mockBudgetService = {
      getBudgetById: vi.fn(),
    };

    payeeService = new PayeeService(
      mockPayeeRepository as PayeeRepository,
      mockIntelligenceService as PayeeIntelligenceService,
      mockLearningService as CategoryLearningService,
      mockMLCoordinator as PayeeMLCoordinator,
      mockContactService as ContactManagementService,
      mockSubscriptionService as SubscriptionManagementService,
      mockCategoryService as CategoryService,
      mockBudgetService as BudgetService
    );
  });

  describe('createPayee', () => {
    it('should create a payee successfully', async () => {
      const createData = {
        name: 'Grocery Store',
        defaultCategoryId: 5,
      };

      vi.mocked(mockCategoryService.verifyCategoryExists!).mockResolvedValue(true);
      vi.mocked(mockPayeeRepository.findBySlug!).mockResolvedValue(null);
      vi.mocked(mockPayeeRepository.create!).mockResolvedValue(mockPayee);

      const result = await payeeService.createPayee(createData);

      expect(mockCategoryService.verifyCategoryExists).toHaveBeenCalledWith(5);
      expect(mockPayeeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Grocery Store',
          slug: 'grocery-store',
          defaultCategoryId: 5,
        })
      );
      expect(result).toEqual(mockPayee);
    });

    it('should generate unique slug when duplicate exists', async () => {
      const createData = {
        name: 'Grocery Store',
      };

      // First slug check returns existing payee, second returns null
      vi.mocked(mockPayeeRepository.findBySlug!)
        .mockResolvedValueOnce(mockPayee)
        .mockResolvedValueOnce(null);

      vi.mocked(mockPayeeRepository.create!).mockResolvedValue({
        ...mockPayee,
        slug: 'grocery-store-1',
      });

      const result = await payeeService.createPayee(createData);

      expect(mockPayeeRepository.findBySlug).toHaveBeenCalledTimes(2);
      expect(result.slug).toBe('grocery-store-1');
    });

    it('should set default payeeType to "merchant"', async () => {
      const createData = {
        name: 'Test Payee',
      };

      vi.mocked(mockPayeeRepository.findBySlug!).mockResolvedValue(null);
      vi.mocked(mockPayeeRepository.create!).mockResolvedValue(mockPayee);

      await payeeService.createPayee(createData);

      expect(mockPayeeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payeeType: 'merchant',
        })
      );
    });

    it('should throw ValidationError for empty name', async () => {
      const createData = {
        name: '',
      };

      await expect(payeeService.createPayee(createData))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('getPayeeById', () => {
    it('should return payee when found', async () => {
      vi.mocked(mockPayeeRepository.findById!).mockResolvedValue(mockPayee);

      const result = await payeeService.getPayeeById(1);

      expect(mockPayeeRepository.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockPayee);
    });

    it('should throw NotFoundError when payee does not exist', async () => {
      vi.mocked(mockPayeeRepository.findById!).mockResolvedValue(null);

      await expect(payeeService.getPayeeById(999))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('updatePayee', () => {
    it('should update payee successfully', async () => {
      const updateData = {
        name: 'Supermarket',
        notes: 'New notes',
        defaultCategoryId: 10,
      };

      const updatedPayee = {
        ...mockPayee,
        name: 'Supermarket',
        notes: 'New notes',
        defaultCategoryId: 10,
      };

      vi.mocked(mockCategoryService.verifyCategoryExists!).mockResolvedValue(true);
      vi.mocked(mockPayeeRepository.findById!).mockResolvedValue(mockPayee);
      vi.mocked(mockPayeeRepository.update!).mockResolvedValue(updatedPayee);

      const result = await payeeService.updatePayee(1, updateData);

      expect(mockPayeeRepository.findById).toHaveBeenCalledWith(1);
      expect(mockPayeeRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          name: 'Supermarket',
          notes: 'New notes',
          defaultCategoryId: 10,
        })
      );
      expect(result).toEqual(updatedPayee);
    });

    it('should throw NotFoundError when updating non-existent payee', async () => {
      vi.mocked(mockPayeeRepository.findById!).mockResolvedValue(null);

      await expect(payeeService.updatePayee(999, { name: 'Updated' }))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('deletePayee', () => {
    it('should delete payee successfully', async () => {
      vi.mocked(mockPayeeRepository.findById!).mockResolvedValue(mockPayee);
      vi.mocked(mockPayeeRepository.hasTransactions!).mockResolvedValue(false);
      vi.mocked(mockPayeeRepository.delete!).mockResolvedValue(undefined);

      await payeeService.deletePayee(1);

      expect(mockPayeeRepository.findById).toHaveBeenCalledWith(1);
      expect(mockPayeeRepository.hasTransactions).toHaveBeenCalledWith(1);
      expect(mockPayeeRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundError when deleting non-existent payee', async () => {
      vi.mocked(mockPayeeRepository.findByIdOrThrow!).mockRejectedValue(new NotFoundError('Payee', 999));

      await expect(payeeService.deletePayee(999))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('getAllPayees', () => {
    it('should return all payees', async () => {
      const mockPayees = [
        mockPayee,
        { ...mockPayee, id: 2, name: 'Coffee Shop' },
        { ...mockPayee, id: 3, name: 'Gas Station' },
      ];

      vi.mocked(mockPayeeRepository.findAll!).mockResolvedValue({ data: mockPayees, total: 3 });

      const result = await payeeService.getAllPayees();

      expect(mockPayeeRepository.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(3);
      expect(result).toEqual(mockPayees);
    });

    it('should return empty array when no payees exist', async () => {
      vi.mocked(mockPayeeRepository.findAll!).mockResolvedValue({ data: [], total: 0 });

      const result = await payeeService.getAllPayees();

      expect(result).toEqual([]);
    });
  });

  describe('getPayeeBySlug', () => {
    it('should return payee when found by slug', async () => {
      vi.mocked(mockPayeeRepository.findBySlug!).mockResolvedValue(mockPayee);

      const result = await payeeService.getPayeeBySlug('grocery-store');

      expect(mockPayeeRepository.findBySlug).toHaveBeenCalledWith('grocery-store');
      expect(result).toEqual(mockPayee);
    });

    it('should throw NotFoundError when payee slug does not exist', async () => {
      vi.mocked(mockPayeeRepository.findBySlug!).mockResolvedValue(null);

      await expect(payeeService.getPayeeBySlug('non-existent'))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('searchPayees', () => {
    it('should search payees by name', async () => {
      const searchResults = [
        mockPayee,
        { ...mockPayee, id: 2, name: 'Grocery Mart' },
      ];

      vi.mocked(mockPayeeRepository.search!).mockResolvedValue(searchResults);

      const result = await payeeService.searchPayees('grocery');

      expect(result).toHaveLength(2);
    });

    it('should return empty array when no matches found', async () => {
      vi.mocked(mockPayeeRepository.search!).mockResolvedValue([]);

      const result = await payeeService.searchPayees('nonexistent');

      expect(result).toEqual([]);
    });
  });
});
