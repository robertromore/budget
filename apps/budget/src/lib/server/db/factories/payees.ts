import {payees, type Payee} from "$lib/schema";
import {db} from "..";
import {faker} from "@faker-js/faker";

export const payeeFactory = async (
  count: number = faker.number.int({min: 1, max: 10})
): Promise<Payee[]> => {
  const payees_collection: Payee[] = [];
  for (let i = 0; i < count; i++) {
    const new_payee = await db
      .insert(payees)
      .values({
        name: faker.company.name(),
        notes: faker.lorem.text(),
      })
      .returning();
    payees_collection.push(new_payee[0]);
  }
  return payees_collection;
};
