/**
 * Chart data standardization utilities
 * Transforms various data formats into standardized ChartDataPoint format
 */

import type { ChartDataPoint } from '$lib/components/charts/chart-config';
import type { DateValue } from '@internationalized/date';
import { ensureDateValue, dateValueToJSDate } from './dates';

/**
 * Common data transformation patterns for the budget application
 */

export interface BalanceHistoryItem {
  date: string | DateValue;
  balance: number;
  [key: string]: any;
}

export interface TransactionItem {
  date: string | DateValue;
  amount: number;
  category?: string;
  description?: string;
  [key: string]: any;
}

export interface CategorySummaryItem {
  category: string;
  amount: number;
  count?: number;
  [key: string]: any;
}

export interface MonthlyDataItem {
  month: string;
  income?: number;
  expenses?: number;
  net?: number;
  [key: string]: any;
}

/**
 * Transforms balance history data for trend charts
 */
export function transformBalanceHistory(
  data: BalanceHistoryItem[]
): ChartDataPoint[] {
  return data.map((item, index) => {
    const dateValue = ensureDateValue(item.date);
    return {
      x: dateValueToJSDate(dateValue), // Convert DateValue to Date for LayerChart compatibility
      y: item.balance,
      metadata: { ...item, index, dateValue } // Keep DateValue in metadata for filtering
    };
  });
}

/**
 * Transforms transaction data for various chart types
 */
export function transformTransactions(
  transactions: TransactionItem[],
  groupBy: 'date' | 'category' | 'month' = 'date'
): ChartDataPoint[] {
  switch (groupBy) {
    case 'category': {
      const grouped = transactions.reduce((acc, transaction) => {
        const category = transaction.category || 'Uncategorized';
        const existing = acc.find(item => item.category === category);
        
        if (existing) {
          existing.y += Math.abs(transaction.amount);
        } else {
          acc.push({
            x: category,
            y: Math.abs(transaction.amount),
            category,
            metadata: { category, count: 1 }
          });
        }
        
        return acc;
      }, [] as ChartDataPoint[]);
      
      return grouped.sort((a, b) => b.y - a.y);
    }
    
    case 'month': {
      const grouped = transactions.reduce((acc, transaction) => {
        const dateValue = ensureDateValue(transaction.date);
        const date = dateValueToJSDate(dateValue);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        });
        
        const existing = acc.find(item => item.x === monthKey);
        
        if (existing) {
          existing.y += Math.abs(transaction.amount);
        } else {
          acc.push({
            x: monthKey,
            y: Math.abs(transaction.amount),
            metadata: { monthKey, monthLabel, count: 1 }
          });
        }
        
        return acc;
      }, [] as ChartDataPoint[]);
      
      return grouped.sort((a, b) => String(a.x).localeCompare(String(b.x)));
    }
    
    case 'date':
    default: {
      return transactions.map((transaction, index) => {
        const dateValue = ensureDateValue(transaction.date);
        return {
          x: dateValueToJSDate(dateValue), // Convert DateValue to Date for LayerChart compatibility
          y: transaction.amount,
          category: transaction.category || undefined,
          metadata: { ...transaction, index, dateValue } // Keep DateValue in metadata for filtering
        };
      }).sort((a, b) => {
        return (a.x as Date).getTime() - (b.x as Date).getTime();
      });
    }
  }
}

/**
 * Transforms category summary data for pie/bar charts
 */
export function transformCategorySummary(
  data: CategorySummaryItem[]
): ChartDataPoint[] {
  return data
    .map(item => ({
      x: item.category,
      y: Math.abs(item.amount),
      category: item.category,
      metadata: item
    }))
    .sort((a, b) => b.y - a.y);
}

/**
 * Transforms monthly data for income vs expenses charts
 */
export function transformMonthlyData(
  data: MonthlyDataItem[]
): { income: ChartDataPoint[], expenses: ChartDataPoint[], net: ChartDataPoint[] } {
  const income = data.map(item => ({
    x: item.month,
    y: item.income || 0,
    metadata: item
  }));
  
  const expenses = data.map(item => ({
    x: item.month,
    y: Math.abs(item.expenses || 0),
    metadata: item
  }));
  
  const net = data.map(item => ({
    x: item.month,
    y: (item.income || 0) - Math.abs(item.expenses || 0),
    metadata: item
  }));
  
  return { income, expenses, net };
}

/**
 * Generic data transformer with flexible mapping
 */
export function transformData<T extends Record<string, any>>(
  data: T[],
  mapping: {
    x: keyof T | ((item: T) => any);
    y: keyof T | ((item: T) => number);
    category?: keyof T | ((item: T) => string);
  }
): ChartDataPoint[] {
  return data.map((item, index) => {
    const getField = <K>(field: keyof T | ((item: T) => K)): K => {
      return typeof field === 'function' ? field(item) : item[field] as K;
    };
    
    return {
      x: getField(mapping.x),
      y: Number(getField(mapping.y)) || 0,
      ...(mapping.category && { category: String(getField(mapping.category)) }),
      metadata: { ...item, index }
    };
  });
}

/**
 * Aggregates data by time periods (day, week, month, year)
 */
export function aggregateByTimePeriod(
  data: ChartDataPoint[],
  period: 'day' | 'week' | 'month' | 'year' = 'month',
  aggregation: 'sum' | 'average' | 'count' = 'sum'
): ChartDataPoint[] {
  const grouped = data.reduce((acc, item) => {
    const dateValue = ensureDateValue(item.x);
    let key: string = ''; // Initialize to avoid undefined
    
    switch (period) {
      case 'day':
        key = `${dateValue.year}-${String(dateValue.month).padStart(2, '0')}-${String(dateValue.day).padStart(2, '0')}`;
        break;
      case 'week':
        // Get the start of the week (Sunday)
        const jsDate = dateValueToJSDate(dateValue);
        const weekStart = new Date(jsDate);
        weekStart.setDate(jsDate.getDate() - jsDate.getDay());
        key = weekStart.toISOString().split('T')[0] || '';
        break;
      case 'month':
        key = `${dateValue.year}-${String(dateValue.month).padStart(2, '0')}`;
        break;
      case 'year':
        key = String(dateValue.year);
        break;
      default:
        // Fallback to day format
        key = `${dateValue.year}-${String(dateValue.month).padStart(2, '0')}-${String(dateValue.day).padStart(2, '0')}`;
        break;
    }
    
    if (!acc[key]) {
      acc[key] = { values: [], count: 0 };
    }
    
    // TypeScript now knows acc[key] exists because we just checked/created it
    const bucket = acc[key]!;
    bucket.values.push(item.y);
    bucket.count++;
    
    return acc;
  }, {} as Record<string, { values: number[], count: number }>);
  
  return Object.entries(grouped).map(([key, group]) => {
    let y: number;
    
    if (!group) {
      y = 0;
    } else {
      const { values, count } = group;
      switch (aggregation) {
        case 'sum':
          y = values.reduce((sum, val) => sum + val, 0);
          break;
        case 'average':
          y = values.reduce((sum, val) => sum + val, 0) / values.length;
          break;
        case 'count':
          y = count;
          break;
        default:
          y = 0;
      }
    }
    
    return {
      x: key,
      y,
      metadata: { period, aggregation, originalCount: group?.count || 0 }
    };
  }).sort((a, b) => String(a.x).localeCompare(String(b.x)));
}

/**
 * Filters data by value ranges
 */
export function filterByRange(
  data: ChartDataPoint[],
  range: { min?: number; max?: number }
): ChartDataPoint[] {
  return data.filter(item => {
    if (range.min !== undefined && item.y < range.min) return false;
    if (range.max !== undefined && item.y > range.max) return false;
    return true;
  });
}

/**
 * Sorts data by various criteria
 */
export function sortChartData(
  data: ChartDataPoint[],
  sortBy: 'x' | 'y' | 'category',
  order: 'asc' | 'desc' = 'asc'
): ChartDataPoint[] {
  const sorted = [...data].sort((a, b) => {
    let aVal: any, bVal: any;
    
    switch (sortBy) {
      case 'x':
        aVal = a.x;
        bVal = b.x;
        break;
      case 'y':
        aVal = a.y;
        bVal = b.y;
        break;
      case 'category':
        aVal = a.category || '';
        bVal = b.category || '';
        break;
    }
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return order === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    const comparison = String(aVal).localeCompare(String(bVal));
    return order === 'asc' ? comparison : -comparison;
  });
  
  return sorted;
}

/**
 * Calculates running totals/cumulative sums
 */
export function calculateRunningTotal(
  data: ChartDataPoint[]
): ChartDataPoint[] {
  let runningTotal = 0;
  
  return data.map(item => {
    runningTotal += item.y;
    return {
      ...item,
      y: runningTotal,
      metadata: { 
        ...item.metadata, 
        originalValue: item.y,
        runningTotal 
      }
    };
  });
}