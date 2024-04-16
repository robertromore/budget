import type { TransactionsFormat } from "$lib/components/types";
import type { Transaction } from "$lib/schema";
import { CalendarDate, DateFormatter, fromDate, getLocalTimeZone, toCalendarDate } from "@internationalized/date";

// @todo change to user's preferred locale
export const currencyFormatter = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD'
});

export const transactionFormatter = (transactions: Transaction[]) => {
  return transactions.map((transaction: Transaction): TransactionsFormat => {
    return {
      id: transaction.id,
      // amount: currencyFormatter.format(Number(transaction.amount)),
      amount: {
        value: transaction.amount,
        formatted: currencyFormatter.format(Number(transaction.amount))
      },
      date: toCalendarDate(fromDate(new Date(transaction.date), getLocalTimeZone())),
      payee: transaction.payee,
      category: transaction.category,
      notes: transaction.notes,
      payeeId: transaction.payeeId,
      categoryId: transaction.categoryId
    };
  });
};

export const dateFormatter = new DateFormatter('en-US', {
  dateStyle: 'long'
});
