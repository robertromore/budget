import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BudgetService, GoalTrackingService, BudgetForecastService } from '$lib/server/domains/budgets/services';
import type { BudgetRepository, BudgetWithRelations } from '$lib/server/domains/budgets/repository';
import type { EnvelopeService } from '$lib/server/domains/budgets/envelope-service';
import type { BudgetIntelligenceService } from '$lib/server/domains/budgets/intelligence-service';
import { ValidationError, NotFoundError } from '$lib/server/shared/types/errors';

describe('BudgetService', () => {
  let mockBudgetRepository: Partial<BudgetRepository>;
  let mockEnvelopeService: Partial<EnvelopeService>;
  let mockGoalTrackingService: Partial<GoalTrackingService>;
  let mockForecastService: Partial<BudgetForecastService>;
  let mockIntelligenceService: Partial<BudgetIntelligenceService>;
  let budgetService: BudgetService;

  const mockBudget: BudgetWithRelations = {
    id: 1,
    name: 'Monthly Groceries',
    slug: 'monthly-groceries',
    description: 'Food and groceries budget',
    type: 'category-envelope',
    scope: 'category',
    status: 'active',
    enforcementLevel: 'warning',
    metadata: {},
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    accounts: [],
    categories: [],
    groups: [],
  };

  beforeEach(() => {
    mockBudgetRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findBySlug: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findAll: vi.fn(),
      slugExists: vi.fn(),
    };

    mockEnvelopeService = {
      createEnvelopeAllocation: vi.fn(),
      calculateEnvelopeStatus: vi.fn(),
    };

    mockGoalTrackingService = {
      calculateGoalProgress: vi.fn(),
    };

    mockForecastService = {
      forecastBudgetImpact: vi.fn(),
    };

    mockIntelligenceService = {
      detectBudgetsForTransaction: vi.fn(),
    };

    budgetService = new BudgetService(
      mockBudgetRepository as BudgetRepository,
      mockEnvelopeService as EnvelopeService,
      mockGoalTrackingService as GoalTrackingService,
      mockForecastService as BudgetForecastService,
      mockIntelligenceService as BudgetIntelligenceService
    );
  });

  describe('createBudget', () => {
    it('should create a budget successfully', async () => {
      const createData = {
        name: 'Monthly Groceries',
        description: 'Food and groceries budget',
        type: 'category-envelope' as const,
        scope: 'category' as const,
      };

      vi.mocked(mockBudgetRepository.slugExists!).mockResolvedValue(false);
      vi.mocked(mockBudgetRepository.create!).mockResolvedValue(mockBudget);

      const result = await budgetService.createBudget(createData);

      expect(mockBudgetRepository.slugExists).toHaveBeenCalledWith('monthly-groceries');
      expect(mockBudgetRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          budget: expect.objectContaining({
            name: 'Monthly Groceries',
            slug: 'monthly-groceries',
            type: 'category-envelope',
            scope: 'category',
          })
        })
      );
      expect(result).toEqual(mockBudget);
    });

    it('should generate unique slug when duplicate exists', async () => {
      const createData = {
        name: 'Monthly Groceries',
        type: 'category-envelope' as const,
        scope: 'category' as const,
      };

      // First slug check returns true (exists), second returns false
      vi.mocked(mockBudgetRepository.slugExists!)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      vi.mocked(mockBudgetRepository.create!).mockResolvedValue({
        ...mockBudget,
        slug: 'monthly-groceries-1',
      });

      const result = await budgetService.createBudget(createData);

      expect(mockBudgetRepository.slugExists).toHaveBeenCalledTimes(2);
      expect(mockBudgetRepository.slugExists).toHaveBeenNthCalledWith(1, 'monthly-groceries');
      expect(mockBudgetRepository.slugExists).toHaveBeenNthCalledWith(2, 'monthly-groceries-1');
      expect(result.slug).toBe('monthly-groceries-1');
    });

    it('should set default enforcement level to "warning"', async () => {
      const createData = {
        name: 'Test Budget',
        type: 'category-envelope' as const,
        scope: 'category' as const,
      };

      vi.mocked(mockBudgetRepository.slugExists!).mockResolvedValue(false);
      vi.mocked(mockBudgetRepository.create!).mockResolvedValue(mockBudget);

      await budgetService.createBudget(createData);

      expect(mockBudgetRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          budget: expect.objectContaining({
            enforcementLevel: 'warning',
          })
        })
      );
    });

    it('should set default status to "active"', async () => {
      const createData = {
        name: 'Test Budget',
        type: 'category-envelope' as const,
        scope: 'category' as const,
      };

      vi.mocked(mockBudgetRepository.slugExists!).mockResolvedValue(false);
      vi.mocked(mockBudgetRepository.create!).mockResolvedValue(mockBudget);

      await budgetService.createBudget(createData);

      expect(mockBudgetRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          budget: expect.objectContaining({
            status: 'active',
          })
        })
      );
    });

    it('should include account IDs when provided', async () => {
      const createData = {
        name: 'Test Budget',
        type: 'account-monthly' as const,
        scope: 'account' as const,
        accountIds: [1, 2, 3],
      };

      vi.mocked(mockBudgetRepository.slugExists!).mockResolvedValue(false);
      vi.mocked(mockBudgetRepository.create!).mockResolvedValue(mockBudget);

      await budgetService.createBudget(createData);

      expect(mockBudgetRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          accountIds: [1, 2, 3],
        })
      );
    });

    it('should include category IDs when provided', async () => {
      const createData = {
        name: 'Test Budget',
        type: 'category-envelope' as const,
        scope: 'category' as const,
        categoryIds: [5, 10, 15],
      };

      vi.mocked(mockBudgetRepository.slugExists!).mockResolvedValue(false);
      vi.mocked(mockBudgetRepository.create!).mockResolvedValue(mockBudget);

      await budgetService.createBudget(createData);

      expect(mockBudgetRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryIds: [5, 10, 15],
        })
      );
    });

    it('should throw ValidationError for empty name', async () => {
      const createData = {
        name: '',
        type: 'category-envelope' as const,
        scope: 'category' as const,
      };

      await expect(budgetService.createBudget(createData))
        .rejects
        .toThrow(ValidationError);
    });

    it('should throw ValidationError for name that is too short', async () => {
      const createData = {
        name: 'A',
        type: 'category-envelope' as const,
        scope: 'category' as const,
      };

      await expect(budgetService.createBudget(createData))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('getBudgetById', () => {
    it('should return budget when found', async () => {
      vi.mocked(mockBudgetRepository.findById!).mockResolvedValue(mockBudget);

      const result = await budgetService.getBudgetById(1);

      expect(mockBudgetRepository.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockBudget);
    });

    it('should throw NotFoundError when budget does not exist', async () => {
      vi.mocked(mockBudgetRepository.findById!).mockResolvedValue(null);

      await expect(budgetService.getBudgetById(999))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('getBudgetBySlug', () => {
    it('should return budget when found by slug', async () => {
      vi.mocked(mockBudgetRepository.findBySlug!).mockResolvedValue(mockBudget);

      const result = await budgetService.getBudgetBySlug('monthly-groceries');

      expect(mockBudgetRepository.findBySlug).toHaveBeenCalledWith('monthly-groceries');
      expect(result).toEqual(mockBudget);
    });

    it('should return null when budget slug does not exist', async () => {
      vi.mocked(mockBudgetRepository.findBySlug!).mockResolvedValue(null);

      const result = await budgetService.getBudgetBySlug('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateBudget', () => {
    it('should update budget successfully', async () => {
      const updateData = {
        name: 'Updated Groceries',
        description: 'Updated description',
      };

      const updatedBudget = {
        ...mockBudget,
        name: 'Updated Groceries',
        description: 'Updated description',
      };

      vi.mocked(mockBudgetRepository.findById!).mockResolvedValue(mockBudget);
      vi.mocked(mockBudgetRepository.update!).mockResolvedValue(updatedBudget);

      const result = await budgetService.updateBudget(1, updateData);

      expect(mockBudgetRepository.findById).toHaveBeenCalledWith(1);
      expect(mockBudgetRepository.update).toHaveBeenCalled();
      expect(result.name).toBe('Updated Groceries');
    });

    it('should throw NotFoundError when updating non-existent budget', async () => {
      vi.mocked(mockBudgetRepository.findById!).mockResolvedValue(null);

      await expect(budgetService.updateBudget(999, { name: 'Updated' }))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('deleteBudget', () => {
    it('should delete budget successfully', async () => {
      vi.mocked(mockBudgetRepository.findById!).mockResolvedValue(mockBudget);
      vi.mocked(mockBudgetRepository.delete!).mockResolvedValue(undefined);

      await budgetService.deleteBudget(1);

      expect(mockBudgetRepository.findById).toHaveBeenCalledWith(1);
      expect(mockBudgetRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundError when deleting non-existent budget', async () => {
      vi.mocked(mockBudgetRepository.findById!).mockResolvedValue(null);

      await expect(budgetService.deleteBudget(999))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('getAllBudgets', () => {
    it('should return all budgets', async () => {
      const mockBudgets = [
        mockBudget,
        { ...mockBudget, id: 2, name: 'Entertainment' },
        { ...mockBudget, id: 3, name: 'Transportation' },
      ];

      vi.mocked(mockBudgetRepository.findAll!).mockResolvedValue(mockBudgets);

      const result = await budgetService.getAllBudgets();

      expect(mockBudgetRepository.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(3);
      expect(result).toEqual(mockBudgets);
    });

    it('should return empty array when no budgets exist', async () => {
      vi.mocked(mockBudgetRepository.findAll!).mockResolvedValue([]);

      const result = await budgetService.getAllBudgets();

      expect(result).toEqual([]);
    });
  });
});
