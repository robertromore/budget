import slugify from '@sindresorhus/slugify';
import { db } from '..';
import { accounts } from '../../../schema';
import { faker } from '@faker-js/faker';
import { transactionFactory } from './transactions';

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
    await transactionFactory(account);
  }
};
