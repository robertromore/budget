import { rpc } from "$lib/query";
import { type PayeeCategory } from "$lib/schema/payee-categories";
import { getContext, setContext } from "svelte";
import { SvelteMap } from "svelte/reactivity";

const KEY = Symbol("payee-categories");

export class PayeeCategoriesState {
  categories = $state(new SvelteMap<number, PayeeCategory>()) as SvelteMap<number, PayeeCategory>;

  constructor(categories?: PayeeCategory[]) {
    if (categories) {
      this.init(categories);
    }
  }

  // Initialize/reinitialize the store with new data
  init(categories: PayeeCategory[]) {
    this.categories.clear();
    categories.forEach((category) => this.categories.set(category.id, category));
  }

  // Context management
  static get() {
    return getContext<PayeeCategoriesState>(KEY);
  }

  static set(categories: PayeeCategory[]) {
    return setContext(KEY, new PayeeCategoriesState(categories));
  }

  // Getters
  get all(): PayeeCategory[] {
    return Array.from(this.categories.values());
  }

  get count(): number {
    return this.categories.size;
  }

  // Find operations
  getById(id: number): PayeeCategory | undefined {
    return this.categories.get(id);
  }

  getBySlug(slug: string): PayeeCategory | undefined {
    return this.findBy((category) => category.slug === slug);
  }

  findBy(predicate: (category: PayeeCategory) => boolean): PayeeCategory | undefined {
    return Array.from(this.categories.values()).find(predicate);
  }

  filterBy(predicate: (category: PayeeCategory) => boolean): PayeeCategory[] {
    return Array.from(this.categories.values()).filter(predicate);
  }

  // Domain-specific methods
  getByName(name: string): PayeeCategory | undefined {
    return this.findBy((category) => category.name === name);
  }

  getActiveCategories(): PayeeCategory[] {
    return this.filterBy((category) => category.isActive && !category.deletedAt);
  }

  getSortedCategories(): PayeeCategory[] {
    return this.all
      .filter((category) => !category.deletedAt)
      .sort((a, b) => {
        // Sort by displayOrder first
        if (a.displayOrder !== b.displayOrder) {
          return a.displayOrder - b.displayOrder;
        }
        // Then by name
        return (a.name || "").localeCompare(b.name || "");
      });
  }

  // CRUD operations
  addCategory(category: PayeeCategory) {
    this.categories.set(category.id, category);
  }

  updateCategory(category: PayeeCategory) {
    this.categories.set(category.id, category);
  }

  removeCategory(id: number): PayeeCategory | undefined {
    const category = this.categories.get(id);
    if (category) {
      this.categories.delete(id);
      return category;
    }
    return undefined;
  }

  removeCategories(ids: number[]): PayeeCategory[] {
    const removed: PayeeCategory[] = [];
    ids.forEach((id) => {
      const category = this.categories.get(id);
      if (category) {
        this.categories.delete(id);
        removed.push(category);
      }
    });
    return removed;
  }

  // API operations
  async saveCategory(category: PayeeCategory): Promise<PayeeCategory> {
    const result = await rpc.payeeCategories.savePayeeCategory.execute(category);
    this.addCategory(result);
    return result;
  }

  async deleteCategory(id: number): Promise<void> {
    await rpc.payeeCategories.deletePayeeCategory.execute(id);
    this.removeCategory(id);
  }

  async deleteCategories(ids: number[]): Promise<void> {
    await rpc.payeeCategories.bulkDeletePayeeCategories.execute(ids);
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
