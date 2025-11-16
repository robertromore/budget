// Selection Mixin - Multi-select functionality with SvelteSet reactivity
// Plain TypeScript utilities with no rune dependencies

import type {SvelteSet} from "svelte/reactivity";

/**
 * Selection mixin interface - provides multi-select functionality
 * with SvelteSet reactivity for UI components
 */
export interface SelectionMixin<T = string> {
  // Basic selection operations
  add(id: T): boolean;
  remove(id: T): boolean;
  toggle(id: T): boolean;
  has(id: T): boolean;

  // Bulk operations
  addMany(ids: T[]): number;
  removeMany(ids: T[]): number;
  toggleMany(ids: T[]): number;
  selectAll(ids: T[]): void;
  selectNone(): void;

  // Query operations
  getSelected(): T[];
  getSelectedArray(): T[];
  isSelected(id: T): boolean;
  isEmpty(): boolean;
  isNotEmpty(): boolean;

  // Computed properties
  readonly size: number;
  readonly count: number;

  // Set operations
  union(otherSelection: T[]): T[];
  intersection(otherSelection: T[]): T[];
  difference(otherSelection: T[]): T[];

  // Iteration support
  forEach(callback: (id: T) => void): void;
  map<U>(callback: (id: T) => U): U[];
  filter(predicate: (id: T) => boolean): T[];
  some(predicate: (id: T) => boolean): boolean;
  every(predicate: (id: T) => boolean): boolean;

  // Conversion utilities
  toArray(): T[];
  toSet(): Set<T>;
  values(): IterableIterator<T>;

  // Conditional operations
  addIf(id: T, condition: boolean): boolean;
  removeIf(id: T, condition: boolean): boolean;
  toggleIf(id: T, condition: boolean): boolean;
}

/**
 * Creates a selection mixin that provides multi-select functionality
 * using a SvelteSet for reactive state management.
 *
 * @param selection - The reactive SvelteSet containing selected items
 * @returns SelectionMixin interface with selection operations
 */
export function createSelectionMixin<T = string>(selection: SvelteSet<T>): SelectionMixin<T> {
  return {
    // Basic selection operations
    add(id: T): boolean {
      const sizeBefore = selection.size;
      selection.add(id);
      return selection.size > sizeBefore;
    },

    remove(id: T): boolean {
      return selection.delete(id);
    },

    toggle(id: T): boolean {
      if (selection.has(id)) {
        selection.delete(id);
        return false;
      } else {
        selection.add(id);
        return true;
      }
    },

    has(id: T): boolean {
      return selection.has(id);
    },

    // Bulk operations
    addMany(ids: T[]): number {
      const sizeBefore = selection.size;
      ids.forEach((id) => selection.add(id));
      return selection.size - sizeBefore;
    },

    removeMany(ids: T[]): number {
      let removed = 0;
      ids.forEach((id) => {
        if (selection.delete(id)) {
          removed++;
        }
      });
      return removed;
    },

    toggleMany(ids: T[]): number {
      let toggled = 0;
      ids.forEach((id) => {
        if (selection.has(id)) {
          selection.delete(id);
        } else {
          selection.add(id);
        }
        toggled++;
      });
      return toggled;
    },

    selectAll(ids: T[]): void {
      ids.forEach((id) => selection.add(id));
    },

    selectNone(): void {
      selection.clear();
    },

    // Query operations
    getSelected(): T[] {
      return Array.from(selection);
    },

    getSelectedArray(): T[] {
      return Array.from(selection);
    },

    isSelected(id: T): boolean {
      return selection.has(id);
    },

    isEmpty(): boolean {
      return selection.size === 0;
    },

    isNotEmpty(): boolean {
      return selection.size > 0;
    },

    // Computed properties
    get size(): number {
      return selection.size;
    },

    get count(): number {
      return selection.size;
    },

    // Set operations
    union(otherSelection: T[]): T[] {
      const unionSet = new Set([...selection, ...otherSelection]);
      return Array.from(unionSet);
    },

    intersection(otherSelection: T[]): T[] {
      const otherSet = new Set(otherSelection);
      return Array.from(selection).filter((id) => otherSet.has(id));
    },

    difference(otherSelection: T[]): T[] {
      const otherSet = new Set(otherSelection);
      return Array.from(selection).filter((id) => !otherSet.has(id));
    },

    // Iteration support
    forEach(callback: (id: T) => void): void {
      selection.forEach(callback);
    },

    map<U>(callback: (id: T) => U): U[] {
      return Array.from(selection).map(callback);
    },

    filter(predicate: (id: T) => boolean): T[] {
      return Array.from(selection).filter(predicate);
    },

    some(predicate: (id: T) => boolean): boolean {
      for (const id of selection) {
        if (predicate(id)) return true;
      }
      return false;
    },

    every(predicate: (id: T) => boolean): boolean {
      for (const id of selection) {
        if (!predicate(id)) return false;
      }
      return true;
    },

    // Conversion utilities
    toArray(): T[] {
      return Array.from(selection);
    },

    toSet(): Set<T> {
      return new Set(selection);
    },

    values(): IterableIterator<T> {
      return selection.values();
    },

    // Conditional operations
    addIf(id: T, condition: boolean): boolean {
      if (condition) {
        const sizeBefore = selection.size;
        selection.add(id);
        return selection.size > sizeBefore;
      }
      return false;
    },

    removeIf(id: T, condition: boolean): boolean {
      if (condition) {
        return selection.delete(id);
      }
      return false;
    },

    toggleIf(id: T, condition: boolean): boolean {
      if (condition) {
        if (selection.has(id)) {
          selection.delete(id);
          return false;
        } else {
          selection.add(id);
          return true;
        }
      }
      return selection.has(id);
    },
  };
}

/**
 * Utility type for extracting selection type from SelectionMixin
 */
export type ExtractSelectionType<T> = T extends SelectionMixin<infer S> ? S : never;

/**
 * Selection state configuration options
 */
export type SelectionConfig = {
  /** Allow multiple selections (default: true) */
  multiple?: boolean;
  /** Maximum number of selections allowed (default: unlimited) */
  maxSelections?: number;
  /** Minimum number of selections required (default: 0) */
  minSelections?: number;
};

/**
 * Enhanced selection mixin with configuration options and validation
 */
export interface ConfigurableSelectionMixin<T = string> extends SelectionMixin<T> {
  readonly config: SelectionConfig;
  canAdd(id: T): boolean;
  canRemove(id: T): boolean;
  isValid(): boolean;
  getValidationErrors(): string[];
}

/**
 * Creates a configurable selection mixin with validation and limits
 */
export function createConfigurableSelectionMixin<T = string>(
  selection: SvelteSet<T>,
  config: SelectionConfig = {}
): ConfigurableSelectionMixin<T> {
  const baseConfig: Required<SelectionConfig> = {
    multiple: true,
    maxSelections: Number.MAX_SAFE_INTEGER,
    minSelections: 0,
    ...config,
  };

  const baseMixin = createSelectionMixin(selection);

  return {
    ...baseMixin,
    config: baseConfig,

    canAdd(id: T): boolean {
      if (selection.has(id)) return false;
      if (!baseConfig.multiple && selection.size >= 1) return false;
      return selection.size < baseConfig.maxSelections;
    },

    canRemove(id: T): boolean {
      if (!selection.has(id)) return false;
      return selection.size > baseConfig.minSelections;
    },

    add(id: T): boolean {
      if (!this.canAdd(id)) return false;
      return baseMixin.add(id);
    },

    remove(id: T): boolean {
      if (!this.canRemove(id)) return false;
      return baseMixin.remove(id);
    },

    isValid(): boolean {
      const size = selection.size;
      return size >= baseConfig.minSelections && size <= baseConfig.maxSelections;
    },

    getValidationErrors(): string[] {
      const errors: string[] = [];
      const size = selection.size;

      if (size < baseConfig.minSelections) {
        errors.push(`Minimum ${baseConfig.minSelections} selections required (currently ${size})`);
      }

      if (size > baseConfig.maxSelections) {
        errors.push(`Maximum ${baseConfig.maxSelections} selections allowed (currently ${size})`);
      }

      if (!baseConfig.multiple && size > 1) {
        errors.push("Only single selection allowed");
      }

      return errors;
    },
  };
}
