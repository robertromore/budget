// Sort Persistence Mixin - localStorage integration with getter/setter callbacks
// Plain TypeScript utilities with no rune dependencies

/**
 * Sort persistence mixin interface - provides localStorage integration
 * for sort state with reactive getter/setter callbacks
 */
export interface SortPersistenceMixin<TSortField = string, TSortDirection = "asc" | "desc"> {
  // State management
  getSortField(): TSortField;
  setSortField(field: TSortField): void;
  getSortDirection(): TSortDirection;
  setSortDirection(direction: TSortDirection): void;

  // Combined operations
  getSort(): {field: TSortField; direction: TSortDirection};
  setSort(field: TSortField, direction: TSortDirection): void;
  toggleSortDirection(): TSortDirection;
  toggleSortField(field: TSortField): void;

  // Persistence operations
  save(): void;
  load(): void;
  reset(): void;
  clear(): void;

  // Validation and utilities
  isValidField(field: TSortField): boolean;
  isValidDirection(direction: TSortDirection): boolean;
  hasPersistedState(): boolean;
  getStorageKey(): string;

  // Comparison utilities
  createComparator<T>(accessor: (item: T) => any): (a: T, b: T) => number;
  createFieldComparator<T extends Record<string, any>>(): (a: T, b: T) => number;
}

/**
 * Sort state stored in localStorage
 */
export type SortState<TSortField = string, TSortDirection = "asc" | "desc"> = {
  field: TSortField;
  direction: TSortDirection;
  timestamp: number;
};

/**
 * Configuration for sort persistence
 */
export type SortPersistenceConfig<TSortField = string, TSortDirection = "asc" | "desc"> = {
  /** Valid field values for validation */
  validFields?: TSortField[];
  /** Valid direction values for validation */
  validDirections?: TSortDirection[];
  /** Default field when no persisted state exists */
  defaultField: TSortField;
  /** Default direction when no persisted state exists */
  defaultDirection: TSortDirection;
  /** Maximum age in milliseconds for persisted state (default: 30 days) */
  maxAge?: number;
  /** Whether to automatically load persisted state on creation (default: true) */
  autoLoad?: boolean;
  /** Whether to automatically save state on changes (default: true) */
  autoSave?: boolean;
};

/**
 * Creates a sort persistence mixin that provides localStorage integration
 * for sort state using reactive getter/setter callbacks.
 *
 * @param storageKey - The localStorage key for persistence
 * @param getSortField - Reactive getter for current sort field
 * @param setSortField - Reactive setter for sort field
 * @param getSortDirection - Reactive getter for current sort direction
 * @param setSortDirection - Reactive setter for sort direction
 * @param config - Configuration options
 * @returns SortPersistenceMixin interface with persistence operations
 */
export function createSortPersistence<TSortField = string, TSortDirection = "asc" | "desc">(
  storageKey: string,
  getSortField: () => TSortField,
  setSortField: (value: TSortField) => void,
  getSortDirection: () => TSortDirection,
  setSortDirection: (value: TSortDirection) => void,
  config: SortPersistenceConfig<TSortField, TSortDirection>
): SortPersistenceMixin<TSortField, TSortDirection> {
  const fullConfig = {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
    autoLoad: true,
    autoSave: true,
    ...config,
  };

  const mixin: SortPersistenceMixin<TSortField, TSortDirection> = {
    // State management
    getSortField(): TSortField {
      return getSortField();
    },

    setSortField(field: TSortField): void {
      if (mixin.isValidField(field)) {
        setSortField(field);
        if (fullConfig.autoSave) {
          mixin.save();
        }
      }
    },

    getSortDirection(): TSortDirection {
      return getSortDirection();
    },

    setSortDirection(direction: TSortDirection): void {
      if (mixin.isValidDirection(direction)) {
        setSortDirection(direction);
        if (fullConfig.autoSave) {
          mixin.save();
        }
      }
    },

    // Combined operations
    getSort(): {field: TSortField; direction: TSortDirection} {
      return {
        field: getSortField(),
        direction: getSortDirection(),
      };
    },

    setSort(field: TSortField, direction: TSortDirection): void {
      if (mixin.isValidField(field) && mixin.isValidDirection(direction)) {
        setSortField(field);
        setSortDirection(direction);
        if (fullConfig.autoSave) {
          mixin.save();
        }
      }
    },

    toggleSortDirection(): TSortDirection {
      const current = getSortDirection();
      // Default toggle for common string directions
      let newDirection: TSortDirection;
      if (current === ("asc" as TSortDirection)) {
        newDirection = "desc" as TSortDirection;
      } else if (current === ("desc" as TSortDirection)) {
        newDirection = "asc" as TSortDirection;
      } else {
        // For custom directions, use the first valid direction or default
        newDirection = fullConfig.validDirections?.[0] || fullConfig.defaultDirection;
      }

      if (mixin.isValidDirection(newDirection)) {
        setSortDirection(newDirection);
        if (fullConfig.autoSave) {
          mixin.save();
        }
      }
      return newDirection;
    },

    toggleSortField(field: TSortField): void {
      const currentField = getSortField();
      if (currentField === field) {
        mixin.toggleSortDirection();
      } else {
        mixin.setSortField(field);
      }
    },

    // Persistence operations
    save(): void {
      try {
        const sortState: SortState<TSortField, TSortDirection> = {
          field: getSortField(),
          direction: getSortDirection(),
          timestamp: Date.now(),
        };
        localStorage.setItem(storageKey, JSON.stringify(sortState));
      } catch (error) {
        console.warn(`Failed to save sort state to localStorage:`, error);
      }
    },

    load(): void {
      try {
        const stored = localStorage.getItem(storageKey);
        if (!stored) return;

        const sortState: SortState<TSortField, TSortDirection> = JSON.parse(stored);

        // Check if persisted state is expired
        if (fullConfig.maxAge && Date.now() - sortState.timestamp > fullConfig.maxAge) {
          mixin.clear();
          return;
        }

        // Validate and apply persisted state
        if (mixin.isValidField(sortState.field) && mixin.isValidDirection(sortState.direction)) {
          setSortField(sortState.field);
          setSortDirection(sortState.direction);
        }
      } catch (error) {
        console.warn(`Failed to load sort state from localStorage:`, error);
        mixin.clear();
      }
    },

    reset(): void {
      setSortField(fullConfig.defaultField);
      setSortDirection(fullConfig.defaultDirection);
      if (fullConfig.autoSave) {
        mixin.save();
      }
    },

    clear(): void {
      try {
        localStorage.removeItem(storageKey);
      } catch (error) {
        console.warn(`Failed to clear sort state from localStorage:`, error);
      }
    },

    // Validation and utilities
    isValidField(field: TSortField): boolean {
      if (!fullConfig.validFields) return true;
      return fullConfig.validFields.includes(field);
    },

    isValidDirection(direction: TSortDirection): boolean {
      if (!fullConfig.validDirections) return true;
      return fullConfig.validDirections.includes(direction);
    },

    hasPersistedState(): boolean {
      try {
        const stored = localStorage.getItem(storageKey);
        return stored !== null;
      } catch {
        return false;
      }
    },

    getStorageKey(): string {
      return storageKey;
    },

    // Comparison utilities
    createComparator<T>(accessor: (item: T) => any): (a: T, b: T) => number {
      const direction = getSortDirection();
      const isAscending = direction === ("asc" as TSortDirection);

      return (a: T, b: T): number => {
        const aValue = accessor(a);
        const bValue = accessor(b);

        if (aValue === null || aValue === undefined) return isAscending ? 1 : -1;
        if (bValue === null || bValue === undefined) return isAscending ? -1 : 1;

        if (aValue < bValue) return isAscending ? -1 : 1;
        if (aValue > bValue) return isAscending ? 1 : -1;
        return 0;
      };
    },

    createFieldComparator<T extends Record<string, any>>(): (a: T, b: T) => number {
      const field = getSortField() as string;
      return mixin.createComparator<T>((item) => item[field]);
    },
  };

  // Auto-load on creation if enabled
  if (fullConfig.autoLoad) {
    mixin.load();
  }

  return mixin;
}

/**
 * Utility type for extracting sort field type from SortPersistenceMixin
 */
export type ExtractSortFieldType<T> = T extends SortPersistenceMixin<infer F, any> ? F : never;

/**
 * Utility type for extracting sort direction type from SortPersistenceMixin
 */
export type ExtractSortDirectionType<T> = T extends SortPersistenceMixin<any, infer D> ? D : never;

/**
 * Common sort field types for typical use cases
 */
export type CommonSortFields =
  | "name"
  | "date"
  | "amount"
  | "status"
  | "category"
  | "createdAt"
  | "updatedAt";

/**
 * Common sort direction types
 */
export type CommonSortDirections = "asc" | "desc";

/**
 * Predefined sort persistence configurations for common scenarios
 */
export const SORT_CONFIGS = {
  transactions: {
    validFields: ["date", "amount", "payee", "category", "status"] as const,
    validDirections: ["asc", "desc"] as const,
    defaultField: "date" as const,
    defaultDirection: "desc" as const,
  },
  accounts: {
    validFields: ["name", "balance", "type", "createdAt"] as const,
    validDirections: ["asc", "desc"] as const,
    defaultField: "name" as const,
    defaultDirection: "asc" as const,
  },
  categories: {
    validFields: ["name", "type", "createdAt"] as const,
    validDirections: ["asc", "desc"] as const,
    defaultField: "name" as const,
    defaultDirection: "asc" as const,
  },
} as const;

/**
 * Creates a sort persistence mixin with predefined configuration
 */
export function createPredefinedSortPersistence<
  TConfig extends keyof typeof SORT_CONFIGS,
  TSortField extends (typeof SORT_CONFIGS)[TConfig]["validFields"][number],
  TSortDirection extends (typeof SORT_CONFIGS)[TConfig]["validDirections"][number],
>(
  configKey: TConfig,
  storageKey: string,
  getSortField: () => TSortField,
  setSortField: (value: TSortField) => void,
  getSortDirection: () => TSortDirection,
  setSortDirection: (value: TSortDirection) => void,
  overrides?: Partial<SortPersistenceConfig<TSortField, TSortDirection>>
) {
  const baseConfig = SORT_CONFIGS[configKey];
  const config: SortPersistenceConfig<TSortField, TSortDirection> = {
    validFields: baseConfig.validFields as TSortField[],
    validDirections: baseConfig.validDirections as TSortDirection[],
    defaultField: baseConfig.defaultField as TSortField,
    defaultDirection: baseConfig.defaultDirection as TSortDirection,
    ...overrides,
  };

  return createSortPersistence(
    storageKey,
    getSortField,
    setSortField,
    getSortDirection,
    setSortDirection,
    config
  );
}
