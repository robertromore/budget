import { accounts, type Account, type NewAccount, type Transaction } from "$lib/schema";
import { db } from "$lib/server/db";
import slugify from "@sindresorhus/slugify";

export const addAccount = async(account: NewAccount): Promise<Account> => {
  const defaults = {
    slug: slugify(account.name),
    balance: account.transactions.reduce(
      (total, current: Transaction) => total + current.amount!,
      0
    )
  };
  const merged = {
    ...defaults,
    ...account
  };
  return (await db.insert(accounts).values(merged).returning())[0];
}

export const addAccounts = (account: NewAccount[]): Account[] {

}
