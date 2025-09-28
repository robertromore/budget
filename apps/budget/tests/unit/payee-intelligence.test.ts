import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PayeeIntelligenceService } from '../../src/lib/server/domains/payees/intelligence';

// Mock the database
vi.mock('../../src/lib/server/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    eq: vi.fn(),
    and: vi.fn(),
    isNull: vi.fn(),
    sql: vi.fn(),
    desc: vi.fn(),
    asc: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    count: vi.fn(),
    avg: vi.fn(),
    sum: vi.fn(),
    min: vi.fn(),
    max: vi.fn(),
  }
}));

// Mock schemas
vi.mock('../../src/lib/schema', () => ({
  payees: {
    id: 'id',
    name: 'name',
  },
  transactions: {
    id: 'id',
    payeeId: 'payeeId',
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

describe('PayeeIntelligenceService', () => {
  let intelligenceService: PayeeIntelligenceService;

  beforeEach(() => {
    intelligenceService = new PayeeIntelligenceService();
    vi.clearAllMocks();
  });

  describe('analyzeSpendingPatterns', () => {
    it('should return empty analysis for payee with no transactions', async () => {
      // Mock empty transaction data
      const mockDb = await import('../../src/lib/server/db');
      vi.mocked(mockDb.db.select).mockResolvedValue([]);

      const result = await intelligenceService.analyzeSpendingPatterns(1);

      expect(result).toEqual({
        payeeId: 1,
        totalAmount: 0,
        transactionCount: 0,
        averageAmount: 0,
        medianAmount: 0,
        standardDeviation: 0,
        minAmount: 0,
        maxAmount: 0,
        amountRange: { min: 0, max: 0, quartiles: [0, 0, 0] },
        trendDirection: 'stable',
        trendStrength: 0,
        volatility: 0,
        firstTransactionDate: null,
        lastTransactionDate: null,
        timeSpanDays: 0,
        outlierTransactions: []
      });
    });

    it('should analyze spending patterns for payee with transactions', async () => {
      const mockTransactions = [
        { date: '2024-01-01', amount: 100 },
        { date: '2024-01-15', amount: 150 },
        { date: '2024-02-01', amount: 120 },
        { date: '2024-02-15', amount: 200 },
        { date: '2024-03-01', amount: 110 }
      ];

      const mockDb = await import('../../src/lib/server/db');
      vi.mocked(mockDb.db.select).mockResolvedValue(mockTransactions);

      const result = await intelligenceService.analyzeSpendingPatterns(1);

      expect(result.payeeId).toBe(1);
      expect(result.transactionCount).toBe(5);
      expect(result.totalAmount).toBe(680);
      expect(result.averageAmount).toBe(136);
      expect(result.firstTransactionDate).toBe('2024-01-01');
      expect(result.lastTransactionDate).toBe('2024-03-01');
      expect(result.minAmount).toBe(100);
      expect(result.maxAmount).toBe(200);
    });
  });

  describe('detectSeasonality', () => {
    it('should return empty array for payee with no transactions', async () => {
      const mockDb = await import('../../src/lib/server/db');
      vi.mocked(mockDb.db.select).mockResolvedValue([]);

      const result = await intelligenceService.detectSeasonality(1);

      expect(result).toEqual([]);
    });

    it('should detect seasonal patterns', async () => {
      const mockMonthlyData = [
        { month: 1, transactionCount: 3, totalAmount: 300, averageAmount: 100 },
        { month: 2, transactionCount: 2, totalAmount: 250, averageAmount: 125 },
        { month: 3, transactionCount: 4, totalAmount: 500, averageAmount: 125 }
      ];

      const mockDb = await import('../../src/lib/server/db');
      vi.mocked(mockDb.db.select).mockResolvedValue(mockMonthlyData);

      const result = await intelligenceService.detectSeasonality(1);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(expect.objectContaining({
        month: 1,
        monthName: 'January',
        transactionCount: 3,
        totalAmount: 300,
        averageAmount: 100
      }));
    });
  });

  describe('analyzeFrequencyPattern', () => {
    it('should return empty analysis for insufficient transactions', async () => {
      const mockDb = await import('../../src/lib/server/db');
      vi.mocked(mockDb.db.select).mockResolvedValue([{ date: '2024-01-01' }]);

      const result = await intelligenceService.analyzeFrequencyPattern(1);

      expect(result.detectedFrequency).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.intervals).toEqual([]);
    });

    it('should detect weekly frequency pattern', async () => {
      const mockTransactionDates = [
        { date: '2024-01-01' },
        { date: '2024-01-08' }, // 7 days
        { date: '2024-01-15' }, // 7 days
        { date: '2024-01-22' }, // 7 days
        { date: '2024-01-29' }  // 7 days
      ];

      const mockDb = await import('../../src/lib/server/db');
      vi.mocked(mockDb.db.select).mockResolvedValue(mockTransactionDates);

      const result = await intelligenceService.analyzeFrequencyPattern(1);

      expect(result.detectedFrequency).toBe('weekly');
      expect(result.averageDaysBetween).toBe(7);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.intervals).toEqual([7, 7, 7, 7]);
    });
  });

  describe('predictNextTransaction', () => {
    it('should return insufficient data prediction for payee with no history', async () => {
      const mockDb = await import('../../src/lib/server/db');
      vi.mocked(mockDb.db.select).mockResolvedValue([]);

      const result = await intelligenceService.predictNextTransaction(1);

      expect(result.predictionMethod).toBe('insufficient_data');
      expect(result.confidence).toBe(0);
      expect(result.nextTransactionDate).toBeNull();
    });
  });

  describe('suggestBudgetAllocation', () => {
    it('should return empty suggestion for payee with no transactions', async () => {
      const mockDb = await import('../../src/lib/server/db');
      vi.mocked(mockDb.db.select).mockResolvedValue([]);

      const result = await intelligenceService.suggestBudgetAllocation(1);

      expect(result.suggestedMonthlyAllocation).toBe(0);
      expect(result.confidence).toBe(0);
      expect(result.seasonalAdjustments).toEqual([]);
    });
  });

  describe('calculateConfidenceScores', () => {
    it('should calculate confidence metrics', async () => {
      const mockDb = await import('../../src/lib/server/db');
      vi.mocked(mockDb.db.select).mockResolvedValue([]);

      const result = await intelligenceService.calculateConfidenceScores(1);

      expect(result).toEqual(expect.objectContaining({
        overall: expect.any(Number),
        dataQuality: expect.objectContaining({
          score: expect.any(Number),
          factors: expect.any(Object)
        }),
        patternReliability: expect.objectContaining({
          score: expect.any(Number),
          factors: expect.any(Object)
        }),
        predictionAccuracy: expect.objectContaining({
          score: expect.any(Number),
          factors: expect.any(Object)
        }),
        explanation: expect.any(String)
      }));
    });
  });

  describe('helper methods', () => {
    it('should calculate median correctly', () => {
      // Test odd number of elements
      expect((intelligenceService as any).calculateMedian([1, 2, 3, 4, 5])).toBe(3);

      // Test even number of elements
      expect((intelligenceService as any).calculateMedian([1, 2, 3, 4])).toBe(2.5);
    });

    it('should calculate quartiles correctly', () => {
      const sortedNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const quartiles = (intelligenceService as any).calculateQuartiles(sortedNumbers);

      expect(quartiles).toHaveLength(3);
      expect(quartiles[0]).toBeGreaterThan(0);
      expect(quartiles[1]).toBeGreaterThan(quartiles[0]);
      expect(quartiles[2]).toBeGreaterThan(quartiles[1]);
    });

    it('should calculate standard deviation correctly', () => {
      const numbers = [1, 2, 3, 4, 5];
      const mean = 3;
      const stdDev = (intelligenceService as any).calculateStandardDeviation(numbers, mean);

      expect(stdDev).toBeCloseTo(1.414, 2);
    });

    it('should detect frequency from interval correctly', () => {
      const result = (intelligenceService as any).detectFrequencyFromInterval(7, 0.9);
      expect(result.detectedFrequency).toBe('weekly');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should describe intervals correctly', () => {
      expect((intelligenceService as any).describeInterval(1)).toBe('Daily');
      expect((intelligenceService as any).describeInterval(7)).toBe('Weekly');
      expect((intelligenceService as any).describeInterval(14)).toBe('Bi-weekly');
      expect((intelligenceService as any).describeInterval(30)).toBe('Monthly');
      expect((intelligenceService as any).describeInterval(90)).toBe('Quarterly');
      expect((intelligenceService as any).describeInterval(365)).toBe('Annually');
      expect((intelligenceService as any).describeInterval(500)).toBe('Very infrequent');
    });
  });

  describe('data quality assessment', () => {
    it('should assess data quality correctly', async () => {
      const mockSpendingAnalysis = {
        payeeId: 1,
        transactionCount: 10,
        timeSpanDays: 365,
        outlierTransactions: [],
        totalAmount: 1000,
        averageAmount: 100,
        medianAmount: 100,
        standardDeviation: 20,
        minAmount: 50,
        maxAmount: 150,
        amountRange: { min: 50, max: 150, quartiles: [75, 100, 125] },
        trendDirection: 'stable' as const,
        trendStrength: 0.2,
        volatility: 0.2,
        firstTransactionDate: '2024-01-01',
        lastTransactionDate: '2024-12-31'
      };

      const mockFrequencyAnalysis = {
        detectedFrequency: 'monthly' as const,
        confidence: 0.8,
        averageDaysBetween: 30,
        standardDeviationDays: 5,
        regularityScore: 0.8,
        predictabilityScore: 0.7,
        intervals: [30, 31, 29, 30],
        irregularPatterns: {
          clusters: [],
          hasSeasonalBreaks: false,
          unusualGaps: []
        }
      };

      const dataQuality = (intelligenceService as any).assessDataQuality(
        mockSpendingAnalysis,
        mockFrequencyAnalysis
      );

      expect(dataQuality.score).toBeGreaterThan(0);
      expect(dataQuality.factors.transactionCount).toBe(10);
      expect(dataQuality.factors.timeSpanMonths).toBeGreaterThan(0);
    });
  });

  describe('trend analysis', () => {
    it('should detect increasing trend', () => {
      const transactionData = [
        { date: '2024-01-01', amount: 100 },
        { date: '2024-01-15', amount: 110 },
        { date: '2024-02-01', amount: 120 },
        { date: '2024-02-15', amount: 130 }
      ];

      const result = (intelligenceService as any).analyzeTrend(transactionData);
      expect(result.trendDirection).toBe('increasing');
      expect(result.trendStrength).toBeGreaterThan(0);
    });

    it('should detect stable trend', () => {
      const transactionData = [
        { date: '2024-01-01', amount: 100 },
        { date: '2024-01-15', amount: 100 },
        { date: '2024-02-01', amount: 100 }
      ];

      const result = (intelligenceService as any).analyzeTrend(transactionData);
      expect(result.trendDirection).toBe('stable');
    });
  });
});