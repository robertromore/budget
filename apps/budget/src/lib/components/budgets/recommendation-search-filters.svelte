<script lang="ts">
import * as Select from '$lib/components/ui/select';
import { Label } from '$lib/components/ui/label';
import { Slider } from '$lib/components/ui/slider';
import type {
  RecommendationType,
  RecommendationStatus,
  RecommendationPriority,
} from '$lib/schema/recommendations';
import type { RecommendationSearchFilters } from '$lib/states/ui/recommendation-search.svelte';

interface Props {
  filters: RecommendationSearchFilters;
  onFilterChange: (key: keyof RecommendationSearchFilters, value: any) => void;
}

let { filters, onFilterChange }: Props = $props();

const statusOptions: Array<{ value: RecommendationStatus; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'applied', label: 'Applied' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'expired', label: 'Expired' },
];

const typeOptions: Array<{ value: RecommendationType; label: string }> = [
  { value: 'create_budget', label: 'Create Budget' },
  { value: 'increase_budget', label: 'Increase Budget' },
  { value: 'decrease_budget', label: 'Decrease Budget' },
  { value: 'merge_budgets', label: 'Merge Budgets' },
  { value: 'seasonal_adjustment', label: 'Seasonal Adjustment' },
  { value: 'missing_category', label: 'Missing Category' },
];

const priorityOptions: Array<{ value: RecommendationPriority; label: string }> = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

let minConfidence = $state(filters.minConfidence ?? 0);
</script>

<!-- Basic Filters Section -->
<div class="space-y-3">
  <h5 class="text-muted-foreground text-xs font-medium tracking-wide uppercase">Basic Filters</h5>

  <div class="grid grid-cols-2 gap-3">
    <!-- Status Filter -->
    <div class="space-y-1.5">
      <Label for="status-filter" class="text-xs">Status</Label>
      <Select.Root
        type="single"
        value={filters.status || ''}
        onValueChange={(value) => {
          onFilterChange('status', (value as RecommendationStatus) || undefined);
        }}>
        <Select.Trigger id="status-filter" class="h-9 w-full">
          {filters.status
            ? statusOptions.find((opt) => opt.value === filters.status)?.label || 'All'
            : 'All'}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="">All statuses</Select.Item>
          {#each statusOptions as option}
            <Select.Item value={option.value}>{option.label}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>

    <!-- Priority Filter -->
    <div class="space-y-1.5">
      <Label for="priority-filter" class="text-xs">Priority</Label>
      <Select.Root
        type="single"
        value={filters.priority || ''}
        onValueChange={(value) => {
          onFilterChange('priority', (value as RecommendationPriority) || undefined);
        }}>
        <Select.Trigger id="priority-filter" class="h-9 w-full">
          {filters.priority
            ? priorityOptions.find((opt) => opt.value === filters.priority)?.label || 'All'
            : 'All'}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="">All priorities</Select.Item>
          {#each priorityOptions as option}
            <Select.Item value={option.value}>{option.label}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>
  </div>

  <!-- Type Filter -->
  <div class="space-y-1.5">
    <Label for="type-filter" class="text-xs">Type</Label>
    <Select.Root
      type="single"
      value={filters.type || ''}
      onValueChange={(value) => {
        onFilterChange('type', (value as RecommendationType) || undefined);
      }}>
      <Select.Trigger id="type-filter" class="h-9 w-full">
        {filters.type
          ? typeOptions.find((opt) => opt.value === filters.type)?.label || 'All'
          : 'All'}
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="">All types</Select.Item>
        {#each typeOptions as option}
          <Select.Item value={option.value}>{option.label}</Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
  </div>

  <!-- Minimum Confidence Filter -->
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <Label for="confidence-filter" class="text-xs">Minimum Confidence</Label>
      <span class="text-muted-foreground text-xs">{minConfidence}%</span>
    </div>
    <Slider
      id="confidence-filter"
      min={0}
      max={100}
      step={5}
      value={[minConfidence]}
      onValueChange={(value) => {
        minConfidence = value[0];
        onFilterChange('minConfidence', value[0] === 0 ? undefined : value[0]);
      }} />
  </div>
</div>
