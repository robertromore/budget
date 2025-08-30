import type { TransactionsFormat } from "$lib/types";
import type { Transaction } from "$lib/schema";
import { parseDate, toCalendarDate } from "@internationalized/date";

// @todo change to user's preferred locale
export const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export const transactionFormatter = {
  format: (transactions?: Transaction[], startingBalance: number = 0): TransactionsFormat[] => {
    if (!transactions || transactions.length === 0) {
      return [];
    }

    // Sort transactions by date and id to ensure proper balance calculation
    const sortedTransactions = [...transactions].sort((a, b) => {
      const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      return dateComparison !== 0 ? dateComparison : a.id - b.id;
    });

    let runningBalance = startingBalance;
    
    return sortedTransactions.map((transaction: Transaction): TransactionsFormat => {
      runningBalance += transaction.amount || 0; // Handle potential null/undefined amounts
      
      // Safely parse the date with error handling
      let parsedDate;
      try {
        // Handle different date formats that might come from the database
        if (transaction.date) {
          // If it's already in ISO format (YYYY-MM-DD), use it directly
          if (/^\d{4}-\d{2}-\d{2}$/.test(transaction.date)) {
            parsedDate = toCalendarDate(parseDate(transaction.date));
          } else {
            // If it's a JavaScript Date string, parse it first
            const jsDate = new Date(transaction.date);
            if (!isNaN(jsDate.getTime())) {
              // Convert to ISO format for parseDate
              const isoString = jsDate.toISOString().split('T')[0];
              parsedDate = toCalendarDate(parseDate(isoString));
            } else {
              // Fallback to today's date if parsing fails
              parsedDate = toCalendarDate(parseDate(new Date().toISOString().split('T')[0]));
              console.warn(`Invalid date format for transaction ${transaction.id}:`, transaction.date);
            }
          }
        } else {
          // Fallback to today's date if no date provided
          parsedDate = toCalendarDate(parseDate(new Date().toISOString().split('T')[0]));
        }
      } catch (error) {
        // Ultimate fallback
        parsedDate = toCalendarDate(parseDate(new Date().toISOString().split('T')[0]));
        console.error(`Error parsing date for transaction ${transaction.id}:`, error, transaction.date);
      }
      
      return {
        ...transaction,
        date: parsedDate,
        balance: runningBalance,
      };
    });
  },
};
