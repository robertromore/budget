import type { TransactionsFormat } from "$lib/types";
import type { Transaction } from "$lib/schema";
import { parseDate, toCalendarDate } from "@internationalized/date";

// @todo change to user's preferred locale
export const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
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
