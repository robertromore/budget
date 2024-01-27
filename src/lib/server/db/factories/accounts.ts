import slugify from '@sindresorhus/slugify';
import { db } from '..';
import { accounts, type NewTransaction } from '../../../schema';
import { faker } from '@faker-js/faker';
import { transactionFactory } from './transactions';
import { eq } from 'drizzle-orm';

export const accountFactory = async (count: number = faker.number.int({ min: 1, max: 10 })) => {
  for (let i = 0; i < count; i++) {
    const name: string = faker.finance.accountName();
    const account = (
      await db
        .insert(accounts)
        .values({
          name,
          slug: slugify(name),
          notes: faker.lorem.text()
        })
        .returning({
          id: accounts.id
        })
    )[0];
    const transactions: NewTransaction[] = await transactionFactory(account);
    const balance = transactions.reduce(
      (total, current: NewTransaction) => total + current.amount!,
      0
    );
    await db
      .update(accounts)
      .set({
        balance
      })
      .where(eq(accounts.id, account.id));
  }
};
