import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CategoryService } from './services';
import type { CategoryRepository } from './repository';
import type { Category } from '$lib/schema/categories';

/**
 * Unit tests for CategoryService
 *
 * Demonstrates how dependency injection enables easy testing with mocks.
 */
describe('CategoryService', () => {
  let mockRepository: Partial<CategoryRepository>;
  let categoryService: CategoryService;

  beforeEach(() => {
    // Create a mock repository with the methods we need
    mockRepository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findBySlug: vi.fn(),
    };

    // Instantiate service with mocked repository
    categoryService = new CategoryService(mockRepository as CategoryRepository);
  });

  describe('getAllCategories', () => {
    it('should return all categories from repository', async () => {
      const mockCategories: Category[] = [
        {
          id: 1,
          name: 'Groceries',
          slug: 'groceries',
          parentId: null,
          categoryType: 'expense',
          categoryIcon: null,
          categoryColor: null,
          isActive: true,
          displayOrder: 1,
          isTaxDeductible: false,
          taxCategory: null,
          deductiblePercentage: null,
          isSeasonal: false,
          seasonalMonths: null,
          expectedMonthlyMin: null,
          expectedMonthlyMax: null,
          spendingPriority: null,
          incomeReliability: null,
          notes: null,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          deletedAt: null,
        },
      ];

      // Setup mock to return our test data
      vi.mocked(mockRepository.findAll!).mockResolvedValue({
        data: mockCategories,
        total: 1,
      });

      // Call the service method
      const result = await categoryService.getAllCategories();

      // Verify the repository was called
      expect(mockRepository.findAll).toHaveBeenCalledOnce();

      // Verify the result
      expect(result).toEqual(mockCategories);
    });

    it('should handle repository errors gracefully', async () => {
      // Setup mock to throw an error
      vi.mocked(mockRepository.findAll!).mockRejectedValue(
        new Error('Database connection failed')
      );

      // Verify the error is propagated
      await expect(categoryService.getAllCategories()).rejects.toThrow(
        'Database connection failed'
      );
    });
  });

  describe('getCategoryById', () => {
    it('should return category when found', async () => {
      const mockCategory: Category = {
        id: 1,
        name: 'Groceries',
        slug: 'groceries',
        parentId: null,
        categoryType: 'expense',
        categoryIcon: null,
        categoryColor: null,
        isActive: true,
        displayOrder: 1,
        isTaxDeductible: false,
        taxCategory: null,
        deductiblePercentage: null,
        isSeasonal: false,
        seasonalMonths: null,
        expectedMonthlyMin: null,
        expectedMonthlyMax: null,
        spendingPriority: null,
        incomeReliability: null,
        notes: null,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        deletedAt: null,
      };

      vi.mocked(mockRepository.findById!).mockResolvedValue(mockCategory);

      const result = await categoryService.getCategoryById(1);

      expect(mockRepository.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockCategory);
    });

    it('should throw NotFoundError when category does not exist', async () => {
      vi.mocked(mockRepository.findById!).mockResolvedValue(null);

      await expect(categoryService.getCategoryById(999)).rejects.toThrow('Category not found');
    });
  });

  describe('createCategory', () => {
    it('should create category with valid data', async () => {
      const createData = {
        name: 'New Category',
        notes: 'Test category',
      };

      const mockCreatedCategory: Category = {
        id: 1,
        name: 'New Category',
        slug: 'new-category',
        parentId: null,
        categoryType: 'expense',
        categoryIcon: null,
        categoryColor: null,
        isActive: true,
        displayOrder: 1,
        isTaxDeductible: false,
        taxCategory: null,
        deductiblePercentage: null,
        isSeasonal: false,
        seasonalMonths: null,
        expectedMonthlyMin: null,
        expectedMonthlyMax: null,
        spendingPriority: null,
        incomeReliability: null,
        notes: 'Test category',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        deletedAt: null,
      };

      // Mock slug uniqueness check
      vi.mocked(mockRepository.findBySlug!).mockResolvedValue(null);
      vi.mocked(mockRepository.create!).mockResolvedValue(mockCreatedCategory);

      const result = await categoryService.createCategory(createData);

      expect(mockRepository.create).toHaveBeenCalled();
      expect(result).toEqual(mockCreatedCategory);
    });

    it('should throw ValidationError for empty name', async () => {
      const createData = {
        name: '',
      };

      await expect(categoryService.createCategory(createData)).rejects.toThrow(
        'Category name is required'
      );

      // Verify repository was never called
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictError for duplicate slug', async () => {
      const createData = {
        name: 'Groceries',
      };

      const existingCategory: Category = {
        id: 1,
        name: 'Groceries',
        slug: 'groceries',
        parentId: null,
        categoryType: 'expense',
        categoryIcon: null,
        categoryColor: null,
        isActive: true,
        displayOrder: 1,
        isTaxDeductible: false,
        taxCategory: null,
        deductiblePercentage: null,
        isSeasonal: false,
        seasonalMonths: null,
        expectedMonthlyMin: null,
        expectedMonthlyMax: null,
        spendingPriority: null,
        incomeReliability: null,
        notes: null,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        deletedAt: null,
      };

      vi.mocked(mockRepository.findBySlug!).mockResolvedValue(existingCategory);

      await expect(categoryService.createCategory(createData)).rejects.toThrow(
        'Category with slug "groceries" already exists'
      );

      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });
});
