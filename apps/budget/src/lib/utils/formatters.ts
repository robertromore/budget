import type { TransactionsFormat } from "$lib/types";
import type { Transaction } from "$lib/schema";
import { parseDate, toCalendarDate } from "@internationalized/date";

// @todo change to user's preferred locale
export const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export const numberFormatter = new Intl.NumberFormat("en-US", {
  style: "decimal",
});

export const transactionFormatter = {
  format: (transactions?: Transaction[]) => {
    return transactions?.map((transaction: Transaction): TransactionsFormat => {
      return {
        ...transaction,
        date: toCalendarDate(parseDate(transaction.date)),
      };
    });
  },
};

// Period formatter for converting time periods to proper adverbs
export const periodFormatter = {
  toAdverb: (period: string): string => {
    const periodMap: Record<string, string> = {
      'day': 'Daily',
      'week': 'Weekly', 
      'month': 'Monthly',
      'year': 'Yearly',
      'hour': 'Hourly'
    };
    
    return periodMap[period] || `${period.charAt(0).toUpperCase() + period.slice(1)}ly`;
  }
};
