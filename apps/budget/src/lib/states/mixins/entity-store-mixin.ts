// Entity Store Mixin - Basic CRUD operations for reactive entity collections
// Plain TypeScript utilities with no rune dependencies

import type { SvelteMap } from "svelte/reactivity";

/**
 * Generic entity interface requiring an id property
 */
export interface Entity {
  id: number;
}

/**
 * Entity store mixin interface - provides basic CRUD operations
 */
export interface EntityStoreMixin<T extends Entity> {
  // Basic CRUD operations
  add(entity: T): void;
  update(entity: T): void;
  remove(id: number): boolean;
  getById(id: number): T | undefined;

  // Bulk operations
  addMany(entities: T[]): void;
  updateMany(entities: T[]): void;
  removeMany(ids: number[]): number;

  // Query operations
  getAll(): T[];
  exists(id: number): boolean;
  findBy<K extends keyof T>(key: K, value: T[K]): T[];
  findOne<K extends keyof T>(key: K, value: T[K]): T | undefined;

  // Collection operations
  clear(): void;
  replace(entities: T[]): void;
  count(): number;
  isEmpty(): boolean;

  // Filtering and searching
  filter(predicate: (entity: T) => boolean): T[];
  search(searchTerm: string, fields: (keyof T)[]): T[];

  // Sorting operations
  sort(compareFn: (a: T, b: T) => number): T[];
  sortBy<K extends keyof T>(field: K, direction?: "asc" | "desc"): T[];
}

/**
 * Creates an entity store mixin that provides basic CRUD operations
 * for a SvelteMap-based entity collection.
 *
 * @param entities - The reactive SvelteMap containing entities
 * @returns EntityStoreMixin interface with CRUD operations
 */
export function createEntityStore<T extends Entity>(
  entities: SvelteMap<number, T>
): EntityStoreMixin<T> {
  return {
    // Basic CRUD operations
    add(entity: T): void {
      entities.set(entity.id, entity);
    },

    update(entity: T): void {
      if (entities.has(entity.id)) {
        entities.set(entity.id, entity);
      }
    },

    remove(id: number): boolean {
      return entities.delete(id);
    },

    getById(id: number): T | undefined {
      return entities.get(id);
    },

    // Bulk operations
    addMany(entitiesToAdd: T[]): void {
      entitiesToAdd.forEach((entity) => entities.set(entity.id, entity));
    },

    updateMany(entitiesToUpdate: T[]): void {
      entitiesToUpdate.forEach((entity) => {
        if (entities.has(entity.id)) {
          entities.set(entity.id, entity);
        }
      });
    },

    removeMany(ids: number[]): number {
      let removed = 0;
      ids.forEach((id) => {
        if (entities.delete(id)) {
          removed++;
        }
      });
      return removed;
    },

    // Query operations
    getAll(): T[] {
      return Array.from(entities.values());
    },

    exists(id: number): boolean {
      return entities.has(id);
    },

    findBy<K extends keyof T>(key: K, value: T[K]): T[] {
      return Array.from(entities.values()).filter((entity) => entity[key] === value);
    },

    findOne<K extends keyof T>(key: K, value: T[K]): T | undefined {
      return Array.from(entities.values()).find((entity) => entity[key] === value);
    },

    // Collection operations
    clear(): void {
      entities.clear();
    },

    replace(newEntities: T[]): void {
      entities.clear();
      newEntities.forEach((entity) => entities.set(entity.id, entity));
    },

    count(): number {
      return entities.size;
    },

    isEmpty(): boolean {
      return entities.size === 0;
    },

    // Filtering and searching
    filter(predicate: (entity: T) => boolean): T[] {
      return Array.from(entities.values()).filter(predicate);
    },

    search(searchTerm: string, fields: (keyof T)[]): T[] {
      const searchLower = searchTerm.toLowerCase();
      return Array.from(entities.values()).filter((entity) => {
        return fields.some((field) => {
          const value = entity[field];
          if (typeof value === "string") {
            return value.toLowerCase().includes(searchLower);
          }
          if (typeof value === "number") {
            return value.toString().includes(searchLower);
          }
          return false;
        });
      });
    },

    // Sorting operations
    sort(compareFn: (a: T, b: T) => number): T[] {
      return Array.from(entities.values()).sort(compareFn);
    },

    sortBy<K extends keyof T>(field: K, direction: "asc" | "desc" = "asc"): T[] {
      return Array.from(entities.values()).sort((a, b) => {
        const aValue = a[field];
        const bValue = b[field];

        if (aValue < bValue) return direction === "asc" ? -1 : 1;
        if (aValue > bValue) return direction === "asc" ? 1 : -1;
        return 0;
      });
    },
  };
}

/**
 * Utility type for extracting entity type from EntityStoreMixin
 */
export type ExtractEntityType<T> = T extends EntityStoreMixin<infer E> ? E : never;
