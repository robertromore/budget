import { db } from "..";
import { transactions, type Category, type NewTransaction } from "$lib/schema";
import { faker } from "@faker-js/faker";
import { payeeFactory } from "./payees";
import type { Payee } from "$lib/schema/payees";
import { categoryFactory } from "./categories";
import { CalendarDate } from "@internationalized/date";

/**
 * Creates transaction(s) for a specific account with realistic data distribution
 *
 * This factory implements smart entity reuse:
 * - 50% chance to create new payee/category
 * - 50% chance to reuse existing ones (creates realistic transaction patterns)
 *
 * @param account - The account object with id field
 * @param workspaceId - The workspace ID these transactions belong to (REQUIRED)
 * @param count - Number of transactions to create (default: random 1-50)
 * @returns Promise<NewTransaction[]> - Array of created transactions
 *
 * @example
 * ```typescript
 * // Create transactions for an account
 * const account = await accountFactory(1, workspaceId);
 * const transactions = await transactionFactory(account, workspaceId, 20);
 * ```
 */
export const transactionFactory = async (
  account: { id: number },
  workspaceId: number,
  count: number = faker.number.int({ min: 1, max: 50 })
): Promise<NewTransaction[]> => {
  const transactions_collection: NewTransaction[] = [];

  // BUGFIX: Move arrays outside loop so they persist across iterations
  const payees: Payee[] = [];
  const categories: Category[] = [];

  const random_dates = faker.date.betweens({
    from: faker.date.past({ years: 5 }),
    to: faker.date.recent(),
    count,
  });

  for (let i = 0; i < count; i++) {
    let new_payee: Payee | undefined;
    let new_category: Category | undefined;

    // 50% chance to create new entities, or always create if pools are empty
    if (payees.length === 0 || categories.length === 0 || faker.datatype.boolean()) {
      // Create new payee and category
      new_payee = await payeeFactory(workspaceId, 1).then((p) => p[0]);
      if (new_payee) payees.push(new_payee);

      new_category = await categoryFactory(workspaceId, 1).then((c) => c[0]);
      if (new_category) categories.push(new_category);
    } else {
      // Reuse existing entities from pool
      new_payee = faker.helpers.arrayElement(payees);
      new_category = faker.helpers.arrayElement(categories);
    }

    if (!new_payee || !new_category) {
      throw new Error(`Failed to create transaction entities for account ${account.id}`);
    }

    const transactionDate = random_dates[i];
    if (!transactionDate) {
      throw new Error(`Failed to generate date for transaction ${i}`);
    }

    const new_transaction = await db
      .insert(transactions)
      .values({
        amount: faker.number.float({
          max: 1000,
          min: -1000,
          fractionDigits: 2,
        }),
        notes: faker.lorem.text(),
        accountId: account.id,
        payeeId: new_payee.id,
        categoryId: new_category.id,
        date: new CalendarDate(
          transactionDate.getFullYear(),
          transactionDate.getMonth() + 1,
          transactionDate.getDate()
        ).toString(),
      })
      .returning();

    const transaction = new_transaction[0];
    if (!transaction) {
      throw new Error(`Failed to create transaction for account ${account.id}`);
    }

    transactions_collection.push(transaction);
  }

  return transactions_collection;
};
