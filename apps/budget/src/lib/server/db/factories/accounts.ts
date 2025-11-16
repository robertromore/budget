import slugify from "@sindresorhus/slugify";
import { db } from "..";
import { accounts, type Account } from "$lib/schema";
import { faker } from "@faker-js/faker";
import { transactionFactory } from "./transactions";

let accountSequence = 0;

/**
 * Creates account(s) for a specific workspace with transactions
 *
 * Each account is automatically populated with random transactions (1-50 per account)
 *
 * @param count - Number of accounts to create (default: random 1-10)
 * @param workspaceId - The workspace ID these accounts belong to (REQUIRED)
 * @returns Promise<Account[]> - Array of created accounts
 *
 * @example
 * ```typescript
 * // Create accounts for workspace 1
 * const accounts = await accountFactory(3, 1);
 *
 * // Create random number of accounts
 * const accounts = await accountFactory(undefined, 1);
 * ```
 */
export const accountFactory = async (
  count: number = faker.number.int({ min: 1, max: 10 }),
  workspaceId: number
): Promise<Account[]> => {
  const accounts_collection: Account[] = [];

  for (let i = 0; i < count; i++) {
    const name: string = faker.finance.accountName();
    const slug = `${slugify(name)}-${++accountSequence}`;

    const account = (
      await db
        .insert(accounts)
        .values({
          name,
          slug,
          notes: faker.lorem.text(),
          workspaceId,
        })
        .returning()
    )[0];

    if (!account) {
      throw new Error(`Failed to create account: ${name}`);
    }

    // Create transactions for this account
    await transactionFactory(account, workspaceId);

    accounts_collection.push(account);
  }

  return accounts_collection;
};
