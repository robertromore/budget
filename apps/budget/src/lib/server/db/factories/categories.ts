import slugify from "@sindresorhus/slugify";
import { categories, type Category } from "$lib/schema";
import { db } from "..";
import { faker } from "@faker-js/faker";

let categorySequence = 0;

/**
 * Creates category/categories for a specific workspace
 *
 * @param workspaceId - The workspace ID these categories belong to (REQUIRED)
 * @param count - Number of categories to create (default: random 1-10)
 * @returns Promise<Category[]> - Array of created categories
 *
 * @example
 * ```typescript
 * // Create categories for workspace 1
 * const categories = await categoryFactory(1, 5);
 *
 * // Create random number of categories
 * const categories = await categoryFactory(1);
 * ```
 */
export const categoryFactory = async (
  workspaceId: number,
  count: number = faker.number.int({ min: 1, max: 10 })
): Promise<Category[]> => {
  const categories_collection: Category[] = [];

  for (let i = 0; i < count; i++) {
    const name = faker.lorem.words({ min: 1, max: 3 });
    const slug = `${slugify(name)}-${++categorySequence}`;

    const new_category = await db
      .insert(categories)
      .values({
        name,
        slug,
        workspaceId,
        notes: faker.lorem.text(),
      })
      .returning();

    const category = new_category[0];
    if (!category) {
      throw new Error(`Failed to create category: ${name}`);
    }

    categories_collection.push(category);
  }

  return categories_collection;
};
