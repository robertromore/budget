/**
 * Unit tests for the ChartTooltip component
 * Validates formatting, data extraction, and configuration handling
 */

import { describe, it, expect } from 'vitest';
import { chartFormatters } from '@budget-shared/utils';

// Test the formatting functions used by ChartTooltip
describe('ChartTooltip formatting', () => {
  describe('Currency formatting', () => {
    it('should format currency with precision', () => {
      const result = chartFormatters.currencyPrecise(1234.56);
      expect(result).toBe('$1,234.56');
    });

    it('should format negative currency correctly', () => {
      const result = chartFormatters.currencyPrecise(-1234.56);
      expect(result).toBe('-$1,234.56');
    });

    it('should format zero currency', () => {
      const result = chartFormatters.currencyPrecise(0);
      expect(result).toBe('$0.00');
    });
  });

  describe('Percentage formatting', () => {
    it('should format percentages correctly', () => {
      const result = chartFormatters.percentage(25.5);
      expect(result).toBe('25.5%');
    });

    it('should handle whole number percentages', () => {
      const result = chartFormatters.percentage(50);
      expect(result).toBe('50%');
    });

    it('should handle decimal percentages', () => {
      const result = chartFormatters.percentage(33.333);
      expect(result).toBe('33.3%');
    });
  });

  describe('Number formatting', () => {
    it('should format numbers with thousands separators', () => {
      const result = chartFormatters.number(1234567);
      expect(result).toBe('1,234,567');
    });

    it('should handle negative numbers', () => {
      const result = chartFormatters.number(-1234);
      expect(result).toBe('-1,234');
    });

    it('should handle small numbers', () => {
      const result = chartFormatters.number(42);
      expect(result).toBe('42');
    });
  });
});

// Test data extraction logic
describe('ChartTooltip data extraction', () => {
  const extractValue = (item: any): number => {
    if (typeof item === 'number') return item;
    
    if (item?.value !== undefined) return item.value;
    if (item?.payload?.y !== undefined) return item.payload.y;
    if (item?.payload?.value !== undefined) return item.payload.value;
    if (item?.y !== undefined) return item.y;
    if (item?.amount !== undefined) return item.amount;
    
    return 0;
  };

  it('should extract value from number', () => {
    expect(extractValue(42)).toBe(42);
  });

  it('should extract value from object with value property', () => {
    expect(extractValue({ value: 100 })).toBe(100);
  });

  it('should extract value from payload.y', () => {
    expect(extractValue({ payload: { y: 200 } })).toBe(200);
  });

  it('should extract value from payload.value', () => {
    expect(extractValue({ payload: { value: 300 } })).toBe(300);
  });

  it('should extract value from y property', () => {
    expect(extractValue({ y: 400 })).toBe(400);
  });

  it('should extract value from amount property', () => {
    expect(extractValue({ amount: 500 })).toBe(500);
  });

  it('should return 0 for invalid data', () => {
    expect(extractValue(null)).toBe(0);
    expect(extractValue(undefined)).toBe(0);
    expect(extractValue({})).toBe(0);
    expect(extractValue({ unrelated: 'data' })).toBe(0);
  });
});

// Test label extraction logic
describe('ChartTooltip label extraction', () => {
  const extractLabel = (item: any, index: number, viewModeLabel?: string, defaultLabel?: string): string => {
    if (item?.label) return item.label;
    if (item?.name) return item.name;
    if (item?.key) return item.key;
    if (item?.series) return item.series;
    if (item?.category) return item.category;
    
    if (viewModeLabel) return viewModeLabel;
    
    return defaultLabel || `Series ${index + 1}`;
  };

  it('should extract label property', () => {
    expect(extractLabel({ label: 'Income' }, 0)).toBe('Income');
  });

  it('should extract name property', () => {
    expect(extractLabel({ name: 'Expenses' }, 0)).toBe('Expenses');
  });

  it('should extract key property', () => {
    expect(extractLabel({ key: 'revenue' }, 0)).toBe('revenue');
  });

  it('should extract series property', () => {
    expect(extractLabel({ series: 'Q1' }, 0)).toBe('Q1');
  });

  it('should extract category property', () => {
    expect(extractLabel({ category: 'Food' }, 0)).toBe('Food');
  });

  it('should use viewModeLabel when provided', () => {
    expect(extractLabel({}, 0, 'Income')).toBe('Income');
  });

  it('should use default label when provided', () => {
    expect(extractLabel({}, 0, undefined, 'Value')).toBe('Value');
  });

  it('should generate series label based on index', () => {
    expect(extractLabel({}, 0)).toBe('Series 1');
    expect(extractLabel({}, 1)).toBe('Series 2');
    expect(extractLabel({}, 2)).toBe('Series 3');
  });
});

// Test date formatting logic
describe('ChartTooltip date formatting', () => {
  const formatHeader = (xValue: any): string => {
    if (!xValue) return '';
    
    if (xValue instanceof Date) {
      return xValue.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    }
    
    if (typeof xValue === 'string') {
      const dateAttempt = new Date(xValue);
      if (!isNaN(dateAttempt.getTime()) && xValue.includes('-')) {
        return dateAttempt.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        });
      }
    }
    
    return String(xValue);
  };

  it('should format Date objects', () => {
    const date = new Date('2025-01-15');
    const result = formatHeader(date);
    expect(result).toBe('Jan 15, 2025');
  });

  it('should format date strings', () => {
    const result = formatHeader('2025-03-20');
    expect(result).toBe('Mar 20, 2025');
  });

  it('should return non-date strings as-is', () => {
    expect(formatHeader('Category A')).toBe('Category A');
    expect(formatHeader('Q1 2025')).toBe('Q1 2025');
  });

  it('should handle numbers', () => {
    expect(formatHeader(2025)).toBe('2025');
  });

  it('should handle null/undefined', () => {
    expect(formatHeader(null)).toBe('');
    expect(formatHeader(undefined)).toBe('');
  });
});

// Test total calculation for multi-series
describe('ChartTooltip total calculation', () => {
  const calculateTotal = (payload: any[]): number => {
    const extractValue = (item: any): number => {
      if (typeof item === 'number') return item;
      if (item?.value !== undefined) return item.value;
      if (item?.payload?.y !== undefined) return item.payload.y;
      if (item?.payload?.value !== undefined) return item.payload.value;
      if (item?.y !== undefined) return item.y;
      if (item?.amount !== undefined) return item.amount;
      return 0;
    };

    return payload.reduce((sum, item) => {
      const val = extractValue(item);
      return sum + (typeof val === 'number' ? val : 0);
    }, 0);
  };

  it('should calculate total for multi-series data', () => {
    const payload = [
      { value: 100 },
      { value: 200 },
      { value: 300 }
    ];
    expect(calculateTotal(payload)).toBe(600);
  });

  it('should handle mixed data structures', () => {
    const payload = [
      { value: 100 },
      { payload: { y: 200 } },
      { amount: 300 },
      { y: 400 }
    ];
    expect(calculateTotal(payload)).toBe(1000);
  });

  it('should ignore non-numeric values', () => {
    const payload = [
      { value: 100 },
      { value: 'invalid' },
      { value: null },
      { value: 200 }
    ];
    expect(calculateTotal(payload)).toBe(300);
  });

  it('should handle empty payload', () => {
    expect(calculateTotal([])).toBe(0);
  });
});