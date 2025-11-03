import slugify from "@sindresorhus/slugify";
import {payees, type Payee} from "$lib/schema";
import {db} from "..";
import {faker} from "@faker-js/faker";

let payeeSequence = 0;

/**
 * Creates payee(s) for a specific workspace
 *
 * @param workspaceId - The workspace ID these payees belong to (REQUIRED)
 * @param count - Number of payees to create (default: random 1-10)
 * @returns Promise<Payee[]> - Array of created payees
 *
 * @example
 * ```typescript
 * // Create payees for workspace 1
 * const payees = await payeeFactory(1, 5);
 *
 * // Create random number of payees
 * const payees = await payeeFactory(1);
 * ```
 */
export const payeeFactory = async (
  workspaceId: number,
  count: number = faker.number.int({min: 1, max: 10})
): Promise<Payee[]> => {
  const payees_collection: Payee[] = [];

  for (let i = 0; i < count; i++) {
    const name = faker.company.name();
    const slug = `${slugify(name)}-${++payeeSequence}`;

    const new_payee = await db
      .insert(payees)
      .values({
        name,
        slug,
        workspaceId,
        notes: faker.lorem.text(),
      })
      .returning();

    const payee = new_payee[0];
    if (!payee) {
      throw new Error(`Failed to create payee: ${name}`);
    }

    payees_collection.push(payee);
  }

  return payees_collection;
};
