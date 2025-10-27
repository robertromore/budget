import {categories, type Category} from "$lib/schema";
import {db} from "..";
import {faker} from "@faker-js/faker";

export const categoryFactory = async (
  count: number = faker.number.int({min: 1, max: 10})
): Promise<Category[]> => {
  const categories_collection: Category[] = [];
  for (let i = 0; i < count; i++) {
    const new_category = await db
      .insert(categories)
      .values({
        name: faker.lorem.words({
          min: 1,
          max: 3,
        }),
        notes: faker.lorem.text(),
      })
      .returning();
    const category = new_category[0];
    if (category) {
      categories_collection.push(category);
    }
  }
  return categories_collection;
};
