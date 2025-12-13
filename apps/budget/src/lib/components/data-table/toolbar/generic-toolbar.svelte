<script lang="ts" generics="TData">
import { Button } from '$lib/components/ui/button';
import { Separator } from '$lib/components/ui/separator';
import * as Tabs from '$lib/components/ui/tabs';
import Toggle from '$lib/components/ui/toggle/toggle.svelte';
import type { View } from '$lib/schema/views';
import type { FilterInputOption, TableEntityType } from '$lib/types';
import Pencil from '@lucide/svelte/icons/pencil';
import Plus from '@lucide/svelte/icons/plus';
import X from '@lucide/svelte/icons/x';
import type {
  ColumnFiltersState,
  ColumnPinningState,
  ExpandedState,
  GroupingState,
  SortingState,
  Table,
  VisibilityState,
} from '@tanstack/table-core';
import type { TableDensity } from '../state/types';
import GenericDisplayInput from './generic-display-input.svelte';
import GenericFilterInput from './generic-filter-input.svelte';
import InlineViewForm from './inline-view-form.svelte';

interface Props {
  /** The table instance */
  table: Table<TData>;
  /** Available filter options */
  availableFilters?: FilterInputOption<TData>[];
  /** Current column filters state */
  columnFilters?: ColumnFiltersState;
  /** Handler for column filter changes */
  onColumnFiltersChange?: (filters: ColumnFiltersState) => void;
  /** Current sorting state */
  sorting?: SortingState;
  /** Handler for sorting changes */
  onSortingChange?: (sorting: SortingState) => void;
  /** Current column visibility state */
  columnVisibility?: VisibilityState;
  /** Handler for visibility changes */
  onVisibilityChange?: (visibility: VisibilityState) => void;
  /** Current column pinning state */
  columnPinning?: ColumnPinningState;
  /** Handler for pinning changes */
  onColumnPinningChange?: (pinning: ColumnPinningState) => void;
  /** Current column order */
  columnOrder?: string[];
  /** Handler for column order changes */
  onColumnOrderChange?: (order: string[]) => void;
  /** Current grouping state */
  grouping?: GroupingState;
  /** Handler for grouping changes */
  onGroupingChange?: (grouping: GroupingState) => void;
  /** Current expanded state */
  expanded?: ExpandedState;
  /** Handler for expanded changes */
  onExpandedChange?: (expanded: ExpandedState) => void;
  /** Current density setting */
  density?: TableDensity;
  /** Handler for density changes */
  onDensityChange?: (density: TableDensity) => void;
  /** Current sticky header setting */
  stickyHeader?: boolean;
  /** Handler for sticky header changes */
  onStickyHeaderChange?: (sticky: boolean) => void;
  /** Current view mode */
  viewMode?: 'table' | 'cards';
  /** Handler for view mode changes */
  onViewModeChange?: (mode: 'table' | 'cards') => void;
  /** Current page size */
  pageSize?: number;
  /** Handler for page size changes */
  onPageSizeChange?: (size: number) => void;
  /** Global filter value */
  globalFilter?: string;
  /** Handler for global filter changes */
  onGlobalFilterChange?: (filter: string) => void;
  /** Show reset filters button */
  showResetFilters?: boolean;
  /** Handler for reset filters */
  onResetFilters?: () => void;
  /** Enable view management (save/new view) */
  enableViewManagement?: boolean;
  /** Current view being displayed */
  currentView?: View | undefined;
  /** Entity type for view management */
  entityType?: TableEntityType | undefined;
  /** Handler for view saved */
  onViewSaved?: (view: View) => void;
  /** Available views for tabs */
  availableViews?: View[];
  /** Default (non-editable) views */
  nonEditableViews?: View[];
  /** User-created (editable) views */
  editableViews?: View[];
  /** Current view ID for tabs */
  currentViewId?: string;
  /** Handler for view change */
  onViewChange?: (viewId: string) => void;
}

let {
  table,
  availableFilters = [],
  columnFilters = [],
  onColumnFiltersChange,
  sorting = [],
  onSortingChange,
  columnVisibility = {},
  onVisibilityChange,
  columnPinning = { left: [], right: [] },
  onColumnPinningChange,
  columnOrder = [],
  onColumnOrderChange,
  grouping = [],
  onGroupingChange,
  expanded = {},
  onExpandedChange,
  density = 'normal',
  onDensityChange,
  stickyHeader = false,
  onStickyHeaderChange,
  viewMode = 'table',
  onViewModeChange,
  pageSize = 25,
  onPageSizeChange,
  globalFilter = '',
  onGlobalFilterChange,
  showResetFilters = false,
  onResetFilters,
  enableViewManagement = false,
  currentView,
  entityType,
  onViewSaved,
  availableViews = [],
  nonEditableViews = [],
  editableViews = [],
  currentViewId = '',
  onViewChange,
}: Props = $props();

// Check if any filters are active
const hasActiveFilters = $derived(columnFilters.length > 0 || globalFilter.length > 0);

// View management state
let showViewForm = $state(false);
let editingView = $state<View | undefined>(undefined);

// Prepare current display state for saving
const currentDisplayState = $derived({
  grouping,
  sort: sorting,
  expanded: expanded === true ? {} : expanded,
  visibility: columnVisibility,
  pinning: columnPinning,
  columnOrder,
  density,
  stickyHeader,
  pageSize,
  viewMode,
});

// Prepare filters for saving
const currentFilters = $derived(
  columnFilters.map((filter) => ({
    column: filter.id,
    filter: 'custom',
    value: Array.isArray(filter.value) ? filter.value : [filter.value],
  }))
);

function handleViewSaved(view: View) {
  showViewForm = false;
  editingView = undefined;
  onViewSaved?.(view);
}

function handleEditView() {
  editingView = currentView;
  showViewForm = true;
}

function handleNewView() {
  editingView = undefined;
  showViewForm = true;
}

function handleCancelForm() {
  showViewForm = false;
  editingView = undefined;
}
</script>

<div class="space-y-4">
  <!-- View Tabs Section (if views are provided) -->
  {#if (nonEditableViews.length > 0 || editableViews.length > 0) && onViewChange}
    <div class="flex items-center gap-2 text-sm">
      <!-- Default Views Tabs -->
      {#if nonEditableViews.length > 0}
        <Tabs.Root
          value={currentViewId}
          onValueChange={(value) => {
            if (value) onViewChange(value);
          }}>
          <Tabs.List>
            {#each nonEditableViews as view}
              <Tabs.Trigger value={view.id.toString()} aria-label={view.name}>
                {view.name}
              </Tabs.Trigger>
            {/each}
          </Tabs.List>
        </Tabs.Root>
      {/if}

      {#if editableViews.length > 0 && nonEditableViews.length > 0}
        <Separator orientation="vertical" class="mx-1" />
      {/if}

      <!-- User Created Views Tabs -->
      {#if editableViews.length > 0}
        <Tabs.Root
          value={currentViewId}
          onValueChange={(value) => {
            if (value) onViewChange(value);
          }}>
          <Tabs.List>
            {#each editableViews as view}
              <Tabs.Trigger value={view.id.toString()} aria-label={view.name}>
                {view.name}
              </Tabs.Trigger>
            {/each}
          </Tabs.List>
        </Tabs.Root>
      {/if}

      <!-- View Management Buttons -->
      {#if enableViewManagement && entityType}
        <Separator orientation="vertical" class="mx-1" />
        <div class="flex items-center gap-1">
          {#if currentView && !currentView.isDefault}
            <Toggle
              variant="outline"
              size="sm"
              pressed={showViewForm && editingView !== undefined}
              onPressedChange={(pressed) => {
                if (pressed) {
                  handleEditView();
                } else {
                  handleCancelForm();
                }
              }}
              title="Edit current view">
              <Pencil class="h-4 w-4" />
            </Toggle>
          {/if}
          <Toggle
            variant="outline"
            size="sm"
            pressed={showViewForm && editingView === undefined}
            onPressedChange={(pressed) => {
              if (pressed) {
                handleNewView();
              } else {
                handleCancelForm();
              }
            }}
            title="Create new view with current settings">
            <Plus class="h-4 w-4" />
          </Toggle>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Filter Components and Display Options Row -->
  <div class="flex items-center justify-between">
    <div class="flex flex-1 flex-wrap items-center gap-2">
      <GenericFilterInput {table} {availableFilters} {columnFilters} {onColumnFiltersChange} />
    </div>

    <div class="flex items-center gap-1">
      {#if hasActiveFilters && showResetFilters && onResetFilters}
        <Button variant="ghost" size="sm" onclick={onResetFilters}>
          <X class="h-4 w-4" />
          Reset filters
        </Button>
      {/if}

      <GenericDisplayInput
        {table}
        {sorting}
        {onSortingChange}
        {columnVisibility}
        {onVisibilityChange}
        {columnPinning}
        {onColumnPinningChange}
        {columnOrder}
        {onColumnOrderChange}
        {grouping}
        {onGroupingChange}
        {expanded}
        {onExpandedChange}
        {density}
        {onDensityChange}
        {stickyHeader}
        {onStickyHeaderChange}
        {viewMode}
        {onViewModeChange}
        {pageSize}
        {onPageSizeChange} />
    </div>
  </div>

  <!-- Inline view form -->
  {#if showViewForm && enableViewManagement && entityType}
    <InlineViewForm
      view={editingView}
      {entityType}
      filters={currentFilters}
      display={currentDisplayState}
      onSave={handleViewSaved}
      onCancel={handleCancelForm} />
  {/if}
</div>
