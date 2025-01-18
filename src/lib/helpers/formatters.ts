import type { TransactionsFormat } from '$lib/types';
import type { Transaction } from '$lib/schema';
import { DateFormatter, fromDate, getLocalTimeZone, toCalendarDate } from '@internationalized/date';

// @todo change to user's preferred locale
export const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

export const transactionFormatter = {
  format: (transactions?: Transaction[]) => {
    return transactions?.map((transaction: Transaction): TransactionsFormat => {
      return {
        ...transaction,
        date: toCalendarDate(fromDate(new Date(transaction.date), getLocalTimeZone()))
      };
    });
  },
  unformat: (transactions?: TransactionsFormat[]) => {
    return transactions?.map((transaction: TransactionsFormat): Transaction => {
      return {
        ...transaction,
        date: transaction.date?.toDate(getLocalTimeZone()).toString() || ''
      };
    });
  }
};

export const dateFormatter = new DateFormatter('en-US', {
  dateStyle: 'long'
});
