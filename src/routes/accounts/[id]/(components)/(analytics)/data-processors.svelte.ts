import type { TransactionsFormat } from '$lib/types';
import { CalendarDate } from '@internationalized/date';
import { currentDate, parseDateValue } from '$lib/utils/dates';

export function createMonthlySpendingProcessor(transactions: TransactionsFormat[]) {
  let processMonthlySpending = $state<Array<{ month: CalendarDate; amount: number }>>([]);
  
  $effect(() => {
    if (!transactions?.length) {
      processMonthlySpending = [];
      return;
    }
    
    const monthlyData: Record<string, { amount: number; date: CalendarDate }> = {};
    
    transactions.forEach((t) => {
      if (t.amount < 0) {
        // Use parseDateValue for consistent date handling
        const parsedDate = parseDateValue(t.date);
        if (!parsedDate) return; // Skip invalid dates
        
        const year = parsedDate.year;
        const month = parsedDate.month;
        const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            amount: 0,
            date: new CalendarDate(year, month, 1) // First day of month
          };
        }
        monthlyData[monthKey].amount += Math.abs(t.amount);
      }
    });

    processMonthlySpending = Object.entries(monthlyData)
      .map(([_, data]) => ({ 
        month: data.date,
        amount: data.amount
      }))
      .sort((a, b) => a.month.compare(b.month));

  });

  return {
    get data() { return processMonthlySpending; }
  };
}

export function createIncomeVsExpensesProcessor(transactions: TransactionsFormat[]) {
  let processIncomeVsExpenses = $state<Array<{ month: CalendarDate; income: number; expenses: number }>>([]);
  
  $effect(() => {
    if (!transactions?.length) {
      processIncomeVsExpenses = [];
      return;
    }

    const monthlyData: Record<string, { income: number; expenses: number }> = {};
    
    transactions.forEach((t) => {
      // Use parseDateValue for consistent date handling
      const parsedDate = parseDateValue(t.date);
      if (!parsedDate) return; // Skip invalid dates
      
      const year = parsedDate.year;
      const month = parsedDate.month;
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) monthlyData[monthKey] = { income: 0, expenses: 0 };
      
      if (t.amount > 0) {
        monthlyData[monthKey].income += t.amount;
      } else {
        monthlyData[monthKey].expenses += Math.abs(t.amount);
      }
    });

    processIncomeVsExpenses = Object.entries(monthlyData)
      .map(([monthKey, data]) => {
        const [year = '', month = ''] = monthKey.split('-');
        return {
          month: new CalendarDate(
            parseInt(year) || currentDate.year, 
            parseInt(month) || currentDate.month, 
            1
          ),
          ...data 
        };
      })
      .sort((a, b) => a.month.compare(b.month));
  });

  return {
    get data() { return processIncomeVsExpenses; }
  };
}

export function createCategorySpendingProcessor(transactions: TransactionsFormat[]) {
  let processCategorySpending = $state<Array<{ category: string; amount: number }>>([]);
  
  $effect(() => {
    if (!transactions?.length) {
      processCategorySpending = [];
      return;
    }

    const categoryData: Record<string, number> = {};
    
    transactions.forEach(t => {
      if (t.amount < 0 && t.category?.name) {
        const category = t.category.name;
        categoryData[category] = (categoryData[category] || 0) + Math.abs(t.amount);
      }
    });

    processCategorySpending = Object.entries(categoryData)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  });

  return {
    get data() { return processCategorySpending; }
  };
}

export function createTopPayeesProcessor(transactions: TransactionsFormat[]) {
  let processTopPayees = $state<Array<{ payee: string; total: number; count: number }>>([]);
  
  $effect(() => {
    if (!transactions?.length) {
      processTopPayees = [];
      return;
    }

    const payeeData: Record<string, { total: number; count: number }> = {};
    
    transactions.forEach(t => {
      if (t.payee?.name) {
        const payee = t.payee.name;
        if (!payeeData[payee]) payeeData[payee] = { total: 0, count: 0 };
        payeeData[payee].total += Math.abs(t.amount);
        payeeData[payee].count += 1;
      }
    });

    processTopPayees = Object.entries(payeeData)
      .map(([payee, data]) => ({ payee, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  });

  return {
    get data() { return processTopPayees; }
  };
}