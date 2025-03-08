import { db } from "..";
import { transactions, type Category, type NewTransaction } from "../../../schema";
import { faker } from "@faker-js/faker";
import { payeeFactory } from "./payees";
import type { Payee } from "$lib/schema/payees";
import { categoryFactory } from "./categories";

export const transactionFactory = async (
  account?: { id: number },
  count: number = faker.number.int({ min: 1, max: 50 })
): Promise<NewTransaction[]> => {
  const transactions_collection: NewTransaction[] = [];
  for (let i = 0; i < count; i++) {
    const payees: Payee[] = [];
    const categories: Category[] = [];

    let new_payee: Payee;
    let new_category: Category;
    if (
      payees.length === 0 ||
      categories.length === 0 ||
      faker.helpers.rangeToNumber({ min: 1, max: 100 }) % 2 === 0
    ) {
      new_payee = await payeeFactory(1).then((payees) => payees[0]);
      payees.push(new_payee);
      new_category = await categoryFactory(1).then((categories) => categories[0]);
      categories.push(new_category);
    } else {
      new_payee = faker.helpers.arrayElement(payees);
      new_category = faker.helpers.arrayElement(categories);
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
        accountId: account?.id,
        payeeId: new_payee.id,
        categoryId: new_category.id,
      })
      .returning();
    transactions_collection.push(new_transaction[0]);
  }
  return transactions_collection;
};
