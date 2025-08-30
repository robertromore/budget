import { type Category } from "$lib/schema";
import { orpc } from "$lib/rpc/client";
import { without } from "$lib/utils";
import { Context } from "runed";

export class CategoriesState {
  categories: Category[] = $state() as Category[];

  getById(id: number) {
    return this.categories.find((category) => category.id === id);
  }

  addCategory(category: Category) {
    this.categories.push(category);
  }

  updateCategory(category: Category) {
    const index = this.categories.findIndex((c) => c.id === category.id);
    if (index !== -1) {
      this.categories[index] = category;
    } else {
      this.addCategory(category);
    }
  }

  async deleteCategories(categories: number[], cb?: (id: Category[]) => void) {
    await orpc().categories.removeMany({
      entities: categories,
    });
    const [, removed] = without(this.categories, (category: Category) =>
      categories.includes(category.id)
    );
    if (cb) {
      cb(removed);
    }
  }

  async deleteCategory(category: number, cb?: (id: Category[]) => void) {
    return this.deleteCategories([category], cb);
  }

  constructor(categories: Category[]) {
    this.categories = categories;
  }
}

export const categoriesContext = new Context<CategoriesState>("categories");
