# New State Store

Generate Svelte 5 state stores following project patterns.

## Usage

```
/state simple dialog-visibility          # Simple boolean/number state
/state class chart-filters               # Class-based with getters/setters
/state preference user-settings          # Preference store with persistence
/state context page-breadcrumbs          # Context-based state
```

## Arguments

Parse from `$ARGUMENTS`:
- First arg: State type (`simple`, `class`, `preference`, `context`)
- Second arg: State name in kebab-case (e.g., `dialog-visibility`, `chart-filters`)
- Optional flags:
  - `--boolean` or `-b`: Simple boolean state (default for simple)
  - `--number` or `-n`: Simple number state
  - `--array` or `-a`: Array-based state
  - `--sync`: Include backend sync for preference stores

## Process

### 1. Validate Arguments

If state type is not provided, ask the user:
- **simple**: For basic UI toggles (dialogs, panels, visibility)
- **class**: For complex state with multiple properties and methods
- **preference**: For user preferences that persist to localStorage/backend
- **context**: For component-tree scoped state

### 2. Determine File Location

| Type | Location |
|------|----------|
| `simple` | `src/lib/states/ui/{name}.svelte.ts` |
| `class` | `src/lib/states/ui/{name}.svelte.ts` |
| `preference` | `src/lib/stores/{name}.svelte.ts` |
| `context` | `src/lib/stores/{name}.svelte.ts` |

### 3. Generate State Store

#### Simple UI State

For basic toggles using existing hooks:

```typescript
// src/lib/states/ui/{name}.svelte.ts
import { UseBoolean } from "$lib/hooks/ui/use-boolean.svelte";

/**
 * {Description of what this state controls}
 */
export const {camelCaseName} = $state(new UseBoolean(false));

// Usage in components:
// import { {camelCaseName} } from "$lib/states/ui/{name}.svelte";
// {camelCaseName}.value    // Get current value
// {camelCaseName}.toggle() // Toggle value
// {camelCaseName}.on()     // Set to true
// {camelCaseName}.off()    // Set to false
```

For number state:

```typescript
// src/lib/states/ui/{name}.svelte.ts
import { UseNumber } from "$lib/hooks/ui/use-number.svelte";

/**
 * {Description of what this state controls}
 */
export const {camelCaseName} = $state(new UseNumber(0, { min: 0, max: 100 }));

// Usage in components:
// {camelCaseName}.value      // Get current value
// {camelCaseName}.set(50)    // Set to specific value
// {camelCaseName}.increment() // Increase by step
// {camelCaseName}.decrement() // Decrease by step
```

#### Class-Based State

For complex state with multiple properties:

```typescript
// src/lib/states/ui/{name}.svelte.ts

export interface {PascalCaseName}Item {
  id: number;
  // Add other properties
}

/**
 * {Description of what this state manages}
 */
class {PascalCaseName}State {
  // Private reactive state
  #items = $state<{PascalCaseName}Item[]>([]);
  #selectedId = $state<number | null>(null);

  // Getters for reactive access
  get items() {
    return this.#items;
  }

  get selectedId() {
    return this.#selectedId;
  }

  get selectedItem() {
    return this.#items.find((item) => item.id === this.#selectedId) ?? null;
  }

  get count() {
    return this.#items.length;
  }

  get isEmpty() {
    return this.#items.length === 0;
  }

  // Mutation methods
  add(item: {PascalCaseName}Item) {
    this.#items = [...this.#items, item];
  }

  remove(id: number) {
    this.#items = this.#items.filter((item) => item.id !== id);
    if (this.#selectedId === id) {
      this.#selectedId = null;
    }
  }

  update(id: number, updates: Partial<{PascalCaseName}Item>) {
    this.#items = this.#items.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
  }

  select(id: number | null) {
    this.#selectedId = id;
  }

  clear() {
    this.#items = [];
    this.#selectedId = null;
  }

  // Bulk operations
  setItems(items: {PascalCaseName}Item[]) {
    this.#items = items;
  }
}

// Singleton export
export const {camelCaseName}State = new {PascalCaseName}State();
```

#### Preference Store

For user preferences with localStorage and optional backend sync:

```typescript
// src/lib/stores/{name}.svelte.ts
import { browser } from "$app/environment";

const STORAGE_KEY = "{kebab-case-name}-preferences";

interface {PascalCaseName}PreferencesData {
  // Define preference properties
  theme: "light" | "dark" | "system";
  itemsPerPage: number;
  showAdvanced: boolean;
}

const DEFAULT_PREFERENCES: {PascalCaseName}PreferencesData = {
  theme: "system",
  itemsPerPage: 25,
  showAdvanced: false,
};

/**
 * {Description of what preferences this store manages}
 * Persists to localStorage and optionally syncs to backend.
 */
class {PascalCaseName}PreferencesStore {
  private preferences = $state<{PascalCaseName}PreferencesData>({
    ...DEFAULT_PREFERENCES,
  });

  constructor() {
    if (browser) {
      this.loadFromStorage();
    }
  }

  // Getters for each preference
  get theme() {
    return this.preferences.theme;
  }

  get itemsPerPage() {
    return this.preferences.itemsPerPage;
  }

  get showAdvanced() {
    return this.preferences.showAdvanced;
  }

  // Get all preferences (for forms/debugging)
  get all() {
    return { ...this.preferences };
  }

  // Setters for each preference
  setTheme(value: {PascalCaseName}PreferencesData["theme"]) {
    this.preferences.theme = value;
    this.saveToStorage();
    this.syncToBackend({ theme: value });
  }

  setItemsPerPage(value: number) {
    this.preferences.itemsPerPage = value;
    this.saveToStorage();
    this.syncToBackend({ itemsPerPage: value });
  }

  setShowAdvanced(value: boolean) {
    this.preferences.showAdvanced = value;
    this.saveToStorage();
    this.syncToBackend({ showAdvanced: value });
  }

  // Bulk update
  update(updates: Partial<{PascalCaseName}PreferencesData>) {
    this.preferences = { ...this.preferences, ...updates };
    this.saveToStorage();
    this.syncToBackend(updates);
  }

  // Reset to defaults
  reset() {
    this.preferences = { ...DEFAULT_PREFERENCES };
    this.saveToStorage();
    this.syncToBackend(this.preferences);
  }

  // Storage operations
  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.preferences = { ...DEFAULT_PREFERENCES, ...parsed };
      }
    } catch (error) {
      console.warn(`Failed to load ${STORAGE_KEY} from localStorage:`, error);
    }
  }

  private saveToStorage() {
    if (!browser) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences));
    } catch (error) {
      console.warn(`Failed to save ${STORAGE_KEY} to localStorage:`, error);
    }
  }

  // Backend sync (implement based on your API)
  private async syncToBackend(
    updates: Partial<{PascalCaseName}PreferencesData>
  ) {
    // Optional: sync to backend
    // await updateUserPreferences.execute(updates);
    void updates; // Remove when implementing
  }

  // Load from backend (call on app init if needed)
  async loadFromBackend() {
    // Optional: load from backend
    // const serverPrefs = await getUserPreferences.execute();
    // if (serverPrefs) {
    //   this.preferences = { ...DEFAULT_PREFERENCES, ...serverPrefs };
    //   this.saveToStorage();
    // }
  }
}

// Singleton export
export const {camelCaseName}Preferences = new {PascalCaseName}PreferencesStore();
```

#### Context-Based State

For component-tree scoped state:

```typescript
// src/lib/stores/{name}.svelte.ts
import { getContext, setContext } from "svelte";

const {SCREAMING_SNAKE_CASE}_KEY = Symbol("{kebab-case-name}");

export interface {PascalCaseName}Data {
  // Define context data properties
  title: string;
  items: string[];
}

/**
 * {Description of what this context provides}
 */
class {PascalCaseName}State {
  #data = $state<{PascalCaseName}Data>({
    title: "",
    items: [],
  });

  get data() {
    return this.#data;
  }

  get title() {
    return this.#data.title;
  }

  get items() {
    return this.#data.items;
  }

  setTitle(title: string) {
    this.#data.title = title;
  }

  addItem(item: string) {
    this.#data.items = [...this.#data.items, item];
  }

  removeItem(index: number) {
    this.#data.items = this.#data.items.filter((_, i) => i !== index);
  }

  reset() {
    this.#data = { title: "", items: [] };
  }
}

/**
 * Set up the context in a parent component.
 * Call this in the parent's <script> block.
 */
export function set{PascalCaseName}Context(
  initialData?: Partial<{PascalCaseName}Data>
): {PascalCaseName}State {
  const state = new {PascalCaseName}State();
  if (initialData) {
    if (initialData.title) state.setTitle(initialData.title);
    if (initialData.items) {
      initialData.items.forEach((item) => state.addItem(item));
    }
  }
  setContext({SCREAMING_SNAKE_CASE}_KEY, state);
  return state;
}

/**
 * Get the context in a child component.
 * Returns undefined if context was not set by a parent.
 */
export function get{PascalCaseName}Context(): {PascalCaseName}State | undefined {
  return getContext<{PascalCaseName}State>({SCREAMING_SNAKE_CASE}_KEY);
}

/**
 * Get the context, throwing an error if not found.
 * Use when the context is required.
 */
export function require{PascalCaseName}Context(): {PascalCaseName}State {
  const context = get{PascalCaseName}Context();
  if (!context) {
    throw new Error(
      "{PascalCaseName}Context not found. Ensure a parent component calls set{PascalCaseName}Context()."
    );
  }
  return context;
}
```

### 4. Update Exports

Add the new state to the appropriate index file:

For UI states (`src/lib/states/ui/index.ts`):
```typescript
export * from "./{name}.svelte";
```

For stores (`src/lib/stores/index.ts`):
```typescript
export * from "./{name}.svelte";
```

## Example Outputs

### Simple Boolean State

```
## Generated State: dialog-visibility

Created `src/lib/states/ui/dialog-visibility.svelte.ts`:

\`\`\`typescript
import { UseBoolean } from "$lib/hooks/ui/use-boolean.svelte";

/**
 * Controls the visibility of the main dialog.
 */
export const dialogVisibility = $state(new UseBoolean(false));
\`\`\`

### Usage

\`\`\`svelte
<script lang="ts">
  import { dialogVisibility } from "$lib/states/ui/dialog-visibility.svelte";
</script>

<Button onclick={() => dialogVisibility.on()}>Open Dialog</Button>

<Dialog open={dialogVisibility.value} onOpenChange={(open) => open ? dialogVisibility.on() : dialogVisibility.off()}>
  <!-- Dialog content -->
</Dialog>
\`\`\`
```

### Class-Based State

```
## Generated State: chart-filters

Created `src/lib/states/ui/chart-filters.svelte.ts`:

\`\`\`typescript
export interface ChartFiltersItem {
  id: number;
  category: string;
  enabled: boolean;
}

class ChartFiltersState {
  #items = $state<ChartFiltersItem[]>([]);
  #selectedId = $state<number | null>(null);

  get items() { return this.#items; }
  get selectedId() { return this.#selectedId; }
  get enabledItems() { return this.#items.filter(item => item.enabled); }

  add(item: ChartFiltersItem) { this.#items = [...this.#items, item]; }
  remove(id: number) { this.#items = this.#items.filter(item => item.id !== id); }
  toggle(id: number) {
    this.#items = this.#items.map(item =>
      item.id === id ? { ...item, enabled: !item.enabled } : item
    );
  }
  select(id: number | null) { this.#selectedId = id; }
  clear() { this.#items = []; this.#selectedId = null; }
}

export const chartFiltersState = new ChartFiltersState();
\`\`\`

### Usage

\`\`\`svelte
<script lang="ts">
  import { chartFiltersState } from "$lib/states/ui/chart-filters.svelte";
</script>

{#each chartFiltersState.items as filter}
  <Checkbox
    checked={filter.enabled}
    onCheckedChange={() => chartFiltersState.toggle(filter.id)}
  >
    {filter.category}
  </Checkbox>
{/each}

<p>Active filters: {chartFiltersState.enabledItems.length}</p>
\`\`\`
```

### Preference Store

```
## Generated State: display-settings

Created `src/lib/stores/display-settings.svelte.ts`:

\`\`\`typescript
class DisplaySettingsPreferencesStore {
  private preferences = $state<DisplaySettingsPreferencesData>({
    compactMode: false,
    showTotals: true,
    dateFormat: "relative",
  });

  get compactMode() { return this.preferences.compactMode; }
  get showTotals() { return this.preferences.showTotals; }
  get dateFormat() { return this.preferences.dateFormat; }

  setCompactMode(value: boolean) {
    this.preferences.compactMode = value;
    this.saveToStorage();
  }
  // ... other setters
}

export const displaySettingsPreferences = new DisplaySettingsPreferencesStore();
\`\`\`

### Usage

\`\`\`svelte
<script lang="ts">
  import { displaySettingsPreferences } from "$lib/stores/display-settings.svelte";
</script>

<Switch
  checked={displaySettingsPreferences.compactMode}
  onCheckedChange={(checked) => displaySettingsPreferences.setCompactMode(checked)}
>
  Compact Mode
</Switch>
\`\`\`
```

## Reference Files

| Pattern | Reference |
|---------|-----------|
| UseBoolean hook | `src/lib/hooks/ui/use-boolean.svelte.ts` |
| UseNumber hook | `src/lib/hooks/ui/use-number.svelte.ts` |
| Class-based state | `src/lib/states/ui/chart-selection.svelte.ts` |
| Preference store | `src/lib/stores/display-preferences.svelte.ts` |
| Context-based | `src/lib/stores/chart-palette.svelte.ts` |

## Naming Conventions

- **File names**: kebab-case with `.svelte.ts` extension
- **Export names**: camelCase for instances, PascalCase for types/classes
- **Context keys**: SCREAMING_SNAKE_CASE Symbol

$ARGUMENTS
