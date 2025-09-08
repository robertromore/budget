/**
 * Finance-specific chart data transformation utilities
 * These functions are specific to the budget application's financial data
 */

import type { ChartDataPoint } from '$lib/components/charts/config/chart-config';
import type { DateValue } from '@internationalized/date';
import { ensureDateValue, dateValueToJSDate } from './dates';

/**
 * Financial data types specific to the budget application
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
          existing.metadata.count++;
        } else {
          acc.push({
            x: monthKey,
            y: Math.abs(transaction.amount),
            label: monthLabel,
            metadata: { month: monthKey, label: monthLabel, count: 1 }
          });
        }
        
        return acc;
      }, [] as ChartDataPoint[]);
      
      return grouped.sort((a, b) => {
        // Sort by month chronologically
        const [aYear, aMonth] = (a.x as string).split('-').map(Number);
        const [bYear, bMonth] = (b.x as string).split('-').map(Number);
        return aYear - bYear || aMonth - bMonth;
      });
    }
    
    case 'date':
    default: {
      return transactions.map((transaction, index) => {
        const dateValue = ensureDateValue(transaction.date);
        return {
          x: dateValueToJSDate(dateValue),
          y: Math.abs(transaction.amount),
          category: transaction.category,
          metadata: { ...transaction, index, dateValue }
        };
      });
    }
  }
}

/**
 * Transforms category summary data for pie/donut charts
 */
export function transformCategoryData(
  categories: CategorySummaryItem[]
): ChartDataPoint[] {
  return categories.map((category, index) => ({
    x: category.category,
    y: Math.abs(category.amount),
    category: category.category,
    metadata: { ...category, index }
  }));
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
 * Transforms income vs expenses data for multi-series charts
 * Supports both combined and separate series views
 */
export function transformIncomeVsExpensesData<T extends Record<string, any>>(
  data: T[],
  mapping: {
    x: keyof T | ((item: T) => any);
    income: keyof T | ((item: T) => number);
    expenses: keyof T | ((item: T) => number);
  }
): {
  combined: ChartDataPoint[];
  income: ChartDataPoint[];
  expenses: ChartDataPoint[];
  series: ChartDataPoint[];
} {
  const getField = <K>(field: keyof T | ((item: T) => K), item: T): K => {
    return typeof field === 'function' ? field(item) : item[field] as K;
  };

  // Create separate series for income and expenses
  const income = data.map((item, index) => ({
    x: getField(mapping.x, item),
    y: Number(getField(mapping.income, item)) || 0,
    category: 'Income',
    series: 'income',
    metadata: { ...item, index, type: 'income' }
  }));

  const expenses = data.map((item, index) => ({
    x: getField(mapping.x, item),
    y: Math.abs(Number(getField(mapping.expenses, item)) || 0),
    category: 'Expenses', 
    series: 'expenses',
    metadata: { ...item, index, type: 'expenses' }
  }));

  // Create combined dataset (interleaved for grouped bars)
  const combined = data.flatMap((item, index) => [
    {
      x: getField(mapping.x, item),
      y: Number(getField(mapping.income, item)) || 0,
      category: 'Income',
      series: 'income',
      key: `combined-income-${index}`, // Unique key for combined dataset
      metadata: { ...item, index, type: 'income' }
    },
    {
      x: getField(mapping.x, item),
      y: Math.abs(Number(getField(mapping.expenses, item)) || 0),
      category: 'Expenses',
      series: 'expenses',
      key: `combined-expenses-${index}`, // Unique key for combined dataset
      metadata: { ...item, index, type: 'expenses' }
    }
  ]);

  // Create series dataset for LayerChart with rScale
  const series = [...income, ...expenses];

  return { combined, income, expenses, series };
}

/**
 * Transforms spending trend data with moving averages
 */
export function transformSpendingTrend(
  transactions: TransactionItem[],
  windowSize: number = 7
): { daily: ChartDataPoint[], average: ChartDataPoint[] } {
  // Group by date and sum amounts
  const dailyMap = new Map<string, number>();
  
  transactions.forEach(transaction => {
    const dateValue = ensureDateValue(transaction.date);
    const dateKey = dateValue.toString();
    const current = dailyMap.get(dateKey) || 0;
    dailyMap.set(dateKey, current + Math.abs(transaction.amount));
  });
  
  // Convert to sorted array
  const daily = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateStr, amount]) => {
      const dateValue = ensureDateValue(dateStr);
      return {
        x: dateValueToJSDate(dateValue),
        y: amount,
        metadata: { date: dateValue, amount }
      };
    });
  
  // Calculate moving average
  const average = daily.map((point, index) => {
    const start = Math.max(0, index - Math.floor(windowSize / 2));
    const end = Math.min(daily.length, index + Math.ceil(windowSize / 2));
    const window = daily.slice(start, end);
    const avg = window.reduce((sum, p) => sum + p.y, 0) / window.length;
    
    return {
      ...point,
      y: avg,
      metadata: { ...point.metadata, average: avg }
    };
  });
  
  return { daily, average };
}

/**
 * Transforms cash flow data (income minus expenses over time)
 */
export function transformCashFlow(
  data: Array<{ date: string | DateValue; income: number; expenses: number }>
): ChartDataPoint[] {
  return data.map((item, index) => {
    const dateValue = ensureDateValue(item.date);
    const cashFlow = item.income - Math.abs(item.expenses);
    
    return {
      x: dateValueToJSDate(dateValue),
      y: cashFlow,
      category: cashFlow >= 0 ? 'Positive' : 'Negative',
      metadata: {
        ...item,
        index,
        dateValue,
        cashFlow,
        isPositive: cashFlow >= 0
      }
    };
  });
}

/**
 * Transforms budget vs actual spending data
 */
export function transformBudgetComparison(
  data: Array<{
    category: string;
    budgeted: number;
    actual: number;
  }>
): {
  budgeted: ChartDataPoint[];
  actual: ChartDataPoint[];
  variance: ChartDataPoint[];
} {
  const budgeted = data.map((item, index) => ({
    x: item.category,
    y: item.budgeted,
    category: 'Budgeted',
    metadata: { ...item, index, type: 'budgeted' }
  }));
  
  const actual = data.map((item, index) => ({
    x: item.category,
    y: item.actual,
    category: 'Actual',
    metadata: { ...item, index, type: 'actual' }
  }));
  
  const variance = data.map((item, index) => {
    const diff = item.actual - item.budgeted;
    const percentDiff = item.budgeted ? (diff / item.budgeted) * 100 : 0;
    
    return {
      x: item.category,
      y: diff,
      category: diff > 0 ? 'Over Budget' : 'Under Budget',
      metadata: {
        ...item,
        index,
        variance: diff,
        percentVariance: percentDiff,
        isOverBudget: diff > 0
      }
    };
  });
  
  return { budgeted, actual, variance };
}