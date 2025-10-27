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
    const payee = new_payee[0];
    if (payee) {
      payees_collection.push(payee);
    }
  }
  return payees_collection;
};
