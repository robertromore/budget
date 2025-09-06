import type { TransactionsFormat } from '$lib/types';

export function createMonthlySpendingProcessor(transactions: TransactionsFormat[]) {
  let processMonthlySpending = $state<Array<{ month: string; amount: number }>>([]);
  
  $effect(() => {
    if (!transactions?.length) {
      processMonthlySpending = [];
      return;
    }
    
    const monthlyData: Record<string, number> = {};
    
    transactions.forEach((t) => {
      if (t.amount < 0) {
        const dateObject = t.date.toDate ? t.date.toDate() : new Date(t.date.toString());
        const month = dateObject.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        monthlyData[month] = (monthlyData[month] || 0) + Math.abs(t.amount);
      }
    });

    processMonthlySpending = Object.entries(monthlyData)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
  });

  return {
    get data() { return processMonthlySpending; }
  };
}

export function createIncomeVsExpensesProcessor(transactions: TransactionsFormat[]) {
  let processIncomeVsExpenses = $state<Array<{ month: Date; income: number; expenses: number }>>([]);
  
  $effect(() => {
    if (!transactions?.length) {
      processIncomeVsExpenses = [];
      return;
    }

    const monthlyData: Record<string, { income: number; expenses: number }> = {};
    
    transactions.forEach(t => {
      const dateObject = t.date.toDate ? t.date.toDate() : new Date(t.date.toString());
      const year = dateObject.getFullYear();
      const month = String(dateObject.getMonth() + 1).padStart(2, '0');
      const monthKey = `${year}-${month}`;
      
      if (!monthlyData[monthKey]) monthlyData[monthKey] = { income: 0, expenses: 0 };
      
      if (t.amount > 0) {
        monthlyData[monthKey].income += t.amount;
      } else {
        monthlyData[monthKey].expenses += Math.abs(t.amount);
      }
    });

    processIncomeVsExpenses = Object.entries(monthlyData)
      .map(([monthKey, data]) => ({ 
        month: new Date(monthKey + '-01'), // Convert YYYY-MM to Date object
        ...data 
      }))
      .sort((a, b) => a.month.getTime() - b.month.getTime());
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