import { type Category } from "$lib/schema";
import { trpc } from "$lib/trpc/client";
import { SvelteMap } from "svelte/reactivity";
import { getContext, setContext } from "svelte";

const KEY = Symbol("categories");

export class CategoriesState {
  categories = $state(new SvelteMap<number, Category>()) as SvelteMap<number, Category>;

  constructor(categories?: Category[]) {
    if (categories) {
      this.init(categories);
    }
  }

  // Initialize/reinitialize the store with new data
  init(categories: Category[]) {
    this.categories.clear();
    categories.forEach((category) => this.categories.set(category.id, category));
  }

  // Context management
  static get() {
    return getContext<CategoriesState>(KEY);
  }

  static set(categories: Category[]) {
    return setContext(KEY, new CategoriesState(categories));
  }

  // Getters
  get all(): Category[] {
    return this.categories.values().toArray();
  }

  get count(): number {
    return this.categories.size;
  }

  // Find operations
  getById(id: number): Category | undefined {
    return this.categories.get(id);
  }

  findBy(predicate: (category: Category) => boolean): Category | undefined {
    return this.categories.values().find(predicate);
  }

  filterBy(predicate: (category: Category) => boolean): Category[] {
    return this.categories.values().filter(predicate).toArray();
  }

  // Domain-specific methods
  getByName(name: string): Category | undefined {
    return this.findBy(category => category.name === name);
  }

  getActiveCategories(): Category[] {
    return this.filterBy(category => !category.deletedAt);
  }

  getParentCategories(): Category[] {
    return this.filterBy(category => !category.parentId);
  }

  getChildCategories(parentId: number): Category[] {
    return this.filterBy(category => category.parentId === parentId);
  }

  // CRUD operations
  addCategory(category: Category) {
    this.categories.set(category.id, category);
  }

  updateCategory(category: Category) {
    this.categories.set(category.id, category);
  }

  removeCategory(id: number): Category | undefined {
    const category = this.categories.get(id);
    if (category) {
      this.categories.delete(id);
      return category;
    }
    return undefined;
  }

  removeCategories(ids: number[]): Category[] {
    const removed: Category[] = [];
    ids.forEach(id => {
      const category = this.categories.get(id);
      if (category) {
        this.categories.delete(id);
        removed.push(category);
      }
    });
    return removed;
  }

  // API operations
  async saveCategory(category: Category): Promise<Category> {
    const result = await trpc().categoriesRoutes.save.mutate(category);
    this.addCategory(result);
    return result;
  }

  async deleteCategory(id: number): Promise<void> {
    await trpc().categoriesRoutes.delete.mutate({ entities: [id] });
    this.removeCategory(id);
  }

  async deleteCategories(ids: number[]): Promise<void> {
    await trpc().categoriesRoutes.delete.mutate({ entities: ids });
    this.removeCategories(ids);
  }

  // Utility methods
  has(id: number): boolean {
    return this.categories.has(id);
  }

  clear(): void {
    this.categories.clear();
  }
}
