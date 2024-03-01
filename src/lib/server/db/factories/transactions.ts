import { db } from '..';
import { transactions, type Category, type NewTransaction } from '../../../schema';
import { faker } from '@faker-js/faker';
import { payeeFactory } from './payees';
import type { Payee } from '$lib/schema/payees';
import { categoryFactory } from './categories';

export const transactionFactory = async (
  account?: { id: number },
  count: number = faker.number.int({ min: 1, max: 10 })
): Promise<NewTransaction[]> => {
  const transactions_collection: NewTransaction[] = [];
  for (let i = 0; i < count; i++) {
    const new_payee: Payee = await payeeFactory(1).then((payees) => payees[0]);
    const new_category: Category = await categoryFactory(1).then((categories) => categories[0]);
    const new_transaction = await db
      .insert(transactions)
      .values({
        amount: faker.number.float({
          max: 1000,
          min: -1000,
          fractionDigits: 2
        }),
        notes: faker.lorem.text(),
        accountId: account?.id,
        payeeId: new_payee.id,
        categoryId: new_category.id
      })
      .returning();
    transactions_collection.push(new_transaction[0]);
  }
  return transactions_collection;
};
