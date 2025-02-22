import type { Account, Transaction } from "$lib/schema";
import { trpc } from "$lib/trpc/client";
import { without } from "$lib/utils";

export const deleteTransactions = async (
  account: Account,
  transactions: number[],
  cb?: (id: Transaction[]) => void
) => {
  await trpc().transactionRoutes.delete.mutate({
    entities: transactions,
    accountId: account.id,
  });
  const removed = without(account.transactions ?? [], (transaction: Transaction) =>
    transactions.includes(transaction.id)
  );
  if (cb) {
    cb(removed);
  }
};

export const deleteTransaction = async (account: Account, transaction: number) => {
  return deleteTransactions(account, [transaction]);
};
