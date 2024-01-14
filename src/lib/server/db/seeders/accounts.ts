import slugify from '@sindresorhus/slugify';
import { db } from '..';
import { accounts } from '../../../schema';
import { faker } from '@faker-js/faker';

export const accountSeeder = async(count: number = faker.number.int({ max: 10 })) => {
  for (let i = 0; i < count; i++) {
    const name = faker.finance.accountName();
    await db.insert(accounts).values({
      name,
      slug: slugify(name),
      balance: faker.number.float({
        max: 100000
      }),
      notes: faker.lorem.text()
    });
  }
};
