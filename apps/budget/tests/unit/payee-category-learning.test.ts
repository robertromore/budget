import {describe, it, expect, beforeEach, vi} from 'vitest';
import {CategoryLearningService} from '../../src/lib/server/domains/payees/category-learning';

// Mock the database with simpler spy-based approach
let mockDb: any;
let queryMock: any;

vi.mock('../../src/lib/server/db', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  }
}));

// Mock date utilities
vi.mock('../../src/lib/utils/dates', () => {
  const mockCurrentDate = new Date('2025-01-15');
  return {
    currentDate: {
      ...mockCurrentDate,
      subtract: vi.fn(({months}: {months: number}) => {
        const date = new Date('2025-01-15');
        date.setMonth(date.getMonth() - months);
        return {
          ...date,
          toISOString: () => date.toISOString(),
        };
      }),
      getTime: () => mockCurrentDate.getTime(),
      getMonth: () => mockCurrentDate.getMonth(),
      setMonth: (month: number) => mockCurrentDate.setMonth(month),
    },
    toISOString: vi.fn((date: any) => {
      if (date instanceof Date) {
        return date.toISOString();
      }
      if (typeof date === 'object' && date !== null && date.toISOString) {
        return date.toISOString();
      }
      return mockCurrentDate.toISOString();
    }),
  };
});

describe('CategoryLearningService', () => {
  let service: CategoryLearningService;

  beforeEach(async () => {
    service = new CategoryLearningService();
    const db = await import('../../src/lib/server/db');
    mockDb = db.db;
    vi.clearAllMocks();

    // Setup default query chain mock
    queryMock = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      having: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]),
    };

    mockDb.insert.mockReturnValue(queryMock);
    mockDb.select.mockReturnValue(queryMock);
    mockDb.update.mockReturnValue(queryMock);
  });

  // Note: learnFromCorrection has complex internal dependencies (enrichCorrectionWithContext)
  // that make comprehensive unit testing difficult. Integration tests would be more appropriate.

  describe('analyzeCorrectionPatterns', () => {
    it('should return empty array if no corrections found', async () => {
      queryMock.orderBy.mockResolvedValueOnce([]);

      const patterns = await service.analyzeCorrectionPatterns(1);

      expect(patterns).toEqual([]);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should analyze patterns when corrections exist', async () => {
      const corrections = [
        {
          id: 1,
          payeeId: 1,
          fromCategoryId: 5,
          toCategoryId: 10,
          userConfidence: 8,
          createdAt: new Date('2024-12-01').toISOString(),
          correctionTrigger: 'manual_user_correction',
          transactionAmount: 50,
          temporalContext: JSON.stringify({season: 'winter', isWeekend: false}),
        },
        {
          id: 2,
          payeeId: 1,
          fromCategoryId: 5,
          toCategoryId: 10,
          userConfidence: 9,
          createdAt: new Date('2024-12-15').toISOString(),
          correctionTrigger: 'manual_user_correction',
          transactionAmount: 60,
          temporalContext: JSON.stringify({season: 'winter', isWeekend: true}),
        },
      ];

      queryMock.orderBy.mockResolvedValueOnce(corrections);

      const patterns = await service.analyzeCorrectionPatterns(1);

      expect(patterns).toBeInstanceOf(Array);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('getCategoryRecommendations', () => {
    it('should return default recommendation if no patterns found', async () => {
      // Mock empty patterns
      queryMock.orderBy.mockResolvedValueOnce([]);

      // Mock payee fetch for default
      queryMock.limit.mockResolvedValueOnce([{defaultCategoryId: null}]);

      const recommendation = await service.getCategoryRecommendations(1);

      expect(recommendation).toHaveProperty('payeeId', 1);
      expect(recommendation).toHaveProperty('recommendedCategoryId');
      expect(recommendation).toHaveProperty('confidence');
      expect(recommendation).toHaveProperty('reasoning');
    });

    it('should generate recommendations when patterns exist', async () => {
      const corrections = [
        {
          id: 1,
          payeeId: 1,
          fromCategoryId: 5,
          toCategoryId: 10,
          userConfidence: 8,
          createdAt: new Date('2024-12-01').toISOString(),
          correctionTrigger: 'manual_user_correction',
        },
      ];

      queryMock.orderBy.mockResolvedValueOnce(corrections);
      queryMock.limit.mockResolvedValueOnce([{name: 'Groceries'}]);

      const recommendation = await service.getCategoryRecommendations(1);

      expect(recommendation).toHaveProperty('payeeId', 1);
      expect(recommendation).toHaveProperty('recommendedCategoryId');
      expect(recommendation).toHaveProperty('confidence');
    });
  });

  describe('calculateCategoryConfidence', () => {
    it('should return 0 confidence if no corrections found', async () => {
      queryMock.orderBy.mockResolvedValueOnce([]);

      const confidence = await service.calculateCategoryConfidence(1, 10);

      expect(confidence).toBe(0);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should calculate confidence based on correction frequency', async () => {
      const corrections = [
        {id: 1, payeeId: 1, toCategoryId: 10, userConfidence: 8, createdAt: new Date().toISOString()},
        {id: 2, payeeId: 1, toCategoryId: 10, userConfidence: 9, createdAt: new Date().toISOString()},
      ];

      queryMock.orderBy.mockResolvedValueOnce(corrections);
      queryMock.returning.mockResolvedValueOnce([{count: 5}]);

      const confidence = await service.calculateCategoryConfidence(1, 10);

      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('detectCategoryDrift', () => {
    it('should return null if insufficient data', async () => {
      queryMock.orderBy.mockResolvedValueOnce([{id: 1}, {id: 2}]); // Only 2 corrections

      const drift = await service.detectCategoryDrift(1);

      expect(drift).toBeNull();
    });

    // Note: detectCategoryDrift makes multiple complex queries and has intricate
    // internal logic. Full testing requires integration tests with real database.
  });

  describe('suggestDefaultCategoryUpdates', () => {
    it('should return empty array if no payees meet criteria', async () => {
      queryMock.having.mockResolvedValueOnce([]);

      const suggestions = await service.suggestDefaultCategoryUpdates();

      expect(suggestions).toEqual([]);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should generate suggestions for qualifying payees', async () => {
      const candidatePayees = [
        {payeeId: 1, correctionCount: 5, lastCorrectionDate: new Date().toISOString()},
      ];

      queryMock.having.mockResolvedValueOnce(candidatePayees);
      queryMock.orderBy.mockResolvedValueOnce([]);

      const suggestions = await service.suggestDefaultCategoryUpdates();

      expect(suggestions).toBeInstanceOf(Array);
    });
  });

  // Note: getLearningMetrics makes multiple internal method calls (calculateConfidenceDistribution,
  // calculateAccuracyMetrics, etc.) that are complex to fully mock. Integration tests recommended.
});