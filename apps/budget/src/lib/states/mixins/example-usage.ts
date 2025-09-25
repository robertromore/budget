// Example Usage - Demonstrates how to integrate mixins with Svelte 5 reactive state
// This file shows patterns for using mixins in .svelte.ts files with runes

import { SvelteMap, SvelteSet } from "svelte/reactivity";
import {
  createEntityStore,
  createSelectionMixin,
  createSortPersistence,
  SORT_CONFIGS,
  type Entity,
  type EntityStoreMixin,
  type SelectionMixin,
  type SortPersistenceMixin
} from './index';

// Example entity interface
interface ExampleEntity extends Entity {
  id: number;
  name: string;
  category: string;
  amount: number;
  createdAt: string;
}

/**
 * Example reactive state class showing mixin integration patterns
 * This would typically be in a .svelte.ts file with runes
 */
export class ExampleEntityState {
  // Reactive state using Svelte 5 runes
  private entities = $state(new SvelteMap<number, ExampleEntity>());
  private selection = $state(new SvelteSet<string>());
  private sortField = $state<'name' | 'amount' | 'createdAt'>('name');
  private sortDirection = $state<'asc' | 'desc'>('asc');

  // Mixin instances (plain TypeScript, no rune dependencies)
  private entityMixin: EntityStoreMixin<ExampleEntity>;
  private selectionMixin: SelectionMixin<string>;
  private sortMixin: SortPersistenceMixin<'name' | 'amount' | 'createdAt', 'asc' | 'desc'>;

  constructor(storageKey = 'example-sort') {
    // Initialize mixins with reactive state instances
    this.entityMixin = createEntityStore(this.entities);
    this.selectionMixin = createSelectionMixin(this.selection);

    // Sort persistence with getter/setter callbacks for reactivity
    this.sortMixin = createSortPersistence(
      storageKey,
      () => this.sortField,
      (field) => { this.sortField = field; },
      () => this.sortDirection,
      (direction) => { this.sortDirection = direction; },
      {
        validFields: ['name', 'amount', 'createdAt'],
        validDirections: ['asc', 'desc'],
        defaultField: 'name',
        defaultDirection: 'asc'
      }
    );
  }

  // Entity operations (delegated to mixin)
  addEntity = (entity: ExampleEntity) => this.entityMixin.add(entity);
  updateEntity = (entity: ExampleEntity) => this.entityMixin.update(entity);
  removeEntity = (id: number) => this.entityMixin.remove(id);
  getEntity = (id: number) => this.entityMixin.getById(id);
  getAllEntities = () => this.entityMixin.getAll();

  // Selection operations (delegated to mixin)
  selectEntity = (id: string) => this.selectionMixin.add(id);
  deselectEntity = (id: string) => this.selectionMixin.remove(id);
  toggleSelection = (id: string) => this.selectionMixin.toggle(id);
  clearSelection = () => this.selectionMixin.selectNone();
  getSelectedIds = () => this.selectionMixin.getSelected();

  // Sort operations (delegated to mixin)
  setSortField = (field: 'name' | 'amount' | 'createdAt') => this.sortMixin.setSortField(field);
  setSortDirection = (direction: 'asc' | 'desc') => this.sortMixin.setSortDirection(direction);
  toggleSort = (field: 'name' | 'amount' | 'createdAt') => this.sortMixin.toggleSortField(field);

  // Computed properties using $derived
  sortedEntities = $derived.by(() => {
    const entities = this.entityMixin.getAll();
    const comparator = this.sortMixin.createFieldComparator<ExampleEntity>();
    return entities.sort(comparator);
  });

  selectedEntities = $derived.by(() => {
    const selectedIds = this.selectionMixin.getSelected();
    const allEntities = this.entityMixin.getAll();
    return allEntities.filter(entity => selectedIds.includes(entity.id.toString()));
  });

  // Advanced computed properties
  selectionSummary = $derived.by(() => ({
    total: this.entityMixin.count(),
    selected: this.selectionMixin.size,
    hasSelection: this.selectionMixin.isNotEmpty()
  }));

  sortInfo = $derived.by(() => ({
    field: this.sortField,
    direction: this.sortDirection,
    hasPersistence: this.sortMixin.hasPersistedState()
  }));
}

/**
 * AccountsState Example - How existing AccountsState could integrate mixins
 *
 * This shows how the current AccountsState (accounts.svelte.ts) could be
 * enhanced with mixins for additional functionality like multi-select,
 * without breaking existing functionality.
 */
export class AccountsStateExample {
  // Existing reactive state (unchanged)
  accounts = $state(new SvelteMap<number, any>()) as SvelteMap<number, any>;
  sortField = $state<'name' | 'balance' | 'dateOpened' | 'status' | 'createdAt'>('name');
  sortDirection = $state<'asc' | 'desc'>('asc');

  // Optional mixin enhancements
  private entityMixin: EntityStoreMixin<any>;
  private selectionMixin: SelectionMixin<number>;

  constructor(accounts?: any[]) {
    // Initialize mixins with existing reactive state
    this.entityMixin = createEntityStore(this.accounts);
    this.selectionMixin = createSelectionMixin(new SvelteSet<number>());

    if (accounts) {
      this.init(accounts);
    }
  }

  // Existing methods remain unchanged
  init(accounts: any[]) {
    this.accounts.clear();
    accounts.forEach((account) => this.accounts.set(account.id, account));
  }

  get all(): any[] {
    return Array.from(this.accounts.values());
  }

  // Enhanced methods using mixins
  getById(id: number): any | undefined {
    return this.entityMixin.getById(id);
  }

  // New selection capabilities from mixin
  get selectedIds() {
    return this.selectionMixin.getSelected();
  }

  selectAccount(id: number) {
    this.selectionMixin.add(id);
  }

  selectAll() {
    const allIds = this.all.map(account => account.id);
    this.selectionMixin.selectAll(allIds);
  }

  clearSelection() {
    this.selectionMixin.selectNone();
  }

  // Enhanced sorting (could use sort persistence mixin)
  setSorting(field: 'name' | 'balance' | 'dateOpened' | 'status' | 'createdAt', direction: 'asc' | 'desc') {
    this.sortField = field;
    this.sortDirection = direction;
    // Could use sort persistence mixin for automatic localStorage handling
  }

  // Computed properties with mixin integration
  selectedAccounts = $derived.by(() => {
    const selected = this.selectionMixin.getSelected();
    return this.all.filter(account => selected.includes(account.id));
  });

  selectionSummary = $derived.by(() => ({
    total: this.all.length,
    selected: this.selectionMixin.size,
    hasSelection: this.selectionMixin.isNotEmpty()
  }));
}

/**
 * Usage patterns for different scenarios
 */
export const USAGE_PATTERNS = {
  // Basic entity management
  basicCRUD: `
    const entityStore = createEntityStore(new SvelteMap<number, MyEntity>());
    entityStore.add({ id: 1, name: 'Example' });
    entityStore.update({ id: 1, name: 'Updated Example' });
    const entity = entityStore.getById(1);
    entityStore.remove(1);
  `,

  // Multi-select with SvelteSet reactivity
  multiSelect: `
    const selection = new SvelteSet<string>();
    const selectionMixin = createSelectionMixin(selection);
    selectionMixin.add('item1');
    selectionMixin.toggle('item2');
    const selected = selectionMixin.getSelected();
  `,

  // Sort persistence with callbacks
  sortPersistence: `
    const sortField = $state('name');
    const sortDirection = $state('asc');

    const sortMixin = createSortPersistence(
      'my-sort-key',
      () => sortField,
      (field) => { sortField = field; },
      () => sortDirection,
      (direction) => { sortDirection = direction; },
      SORT_CONFIGS.transactions
    );
  `,

  // Integration with derived values
  reactiveIntegration: `
    const entities = $state(new SvelteMap<number, Entity>());
    const entityMixin = createEntityStore(entities);

    const sortedData = $derived.by(() => {
      const items = entityMixin.getAll();
      return items.sort(sortMixin.createFieldComparator());
    });
  `,

  // AccountsState integration example
  accountsStateIntegration: `
    // How existing AccountsState could be enhanced:
    export class EnhancedAccountsState {
      accounts = $state(new SvelteMap<number, Account>());

      private entityMixin = createEntityStore(this.accounts);
      private selectionMixin = createSelectionMixin(new SvelteSet<number>());

      // All existing methods work unchanged
      getById(id: number) { return this.entityMixin.getById(id); }

      // New capabilities from mixins
      selectAccount = (id: number) => this.selectionMixin.add(id);
      getSelectedAccounts = () => this.selectionMixin.getSelected();
    }
  `
};