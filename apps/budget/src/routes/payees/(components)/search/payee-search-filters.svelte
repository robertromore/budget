<script lang="ts">
import * as Select from '$lib/components/ui/select';
import type {PayeeSearchFilters} from '$lib/server/domains/payees/repository';
import type {PayeeType, PaymentFrequency} from '$lib/schema/payees';

interface Props {
  filters: PayeeSearchFilters;
  onFilterChange: (key: keyof PayeeSearchFilters, value: any) => void;
}

let {filters, onFilterChange}: Props = $props();

const payeeTypeOptions: Array<{value: PayeeType; label: string}> = [
  {value: 'person', label: 'Person'},
  {value: 'company', label: 'Company'},
  {value: 'merchant', label: 'Merchant'},
  {value: 'government', label: 'Government'},
  {value: 'other', label: 'Other'},
];

const frequencyOptions: Array<{value: PaymentFrequency; label: string}> = [
  {value: 'one_time', label: 'One Time'},
  {value: 'weekly', label: 'Weekly'},
  {value: 'bi_weekly', label: 'Bi-Weekly'},
  {value: 'monthly', label: 'Monthly'},
  {value: 'quarterly', label: 'Quarterly'},
  {value: 'annual', label: 'Annual'},
  {value: 'irregular', label: 'Irregular'},
];
</script>

<!-- Basic Filters Section -->
<div class="space-y-3">
  <h5 class="text-muted-foreground text-xs font-medium tracking-wide uppercase">Basic Filters</h5>

  <div class="grid grid-cols-2 gap-3">
    <!-- Payee Type Filter -->
    <div class="space-y-1.5">
      <label for="payee-type-filter" class="text-xs font-medium">Type</label>
      <Select.Root
        type="single"
        value={filters.payeeType || ''}
        onValueChange={(value) => {
          onFilterChange('payeeType', (value as PayeeType) || undefined);
        }}>
        <Select.Trigger id="payee-type-filter" class="h-9 w-full">
          {filters.payeeType
            ? payeeTypeOptions.find((opt) => opt.value === filters.payeeType)?.label || 'All'
            : 'All'}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="">All types</Select.Item>
          {#each payeeTypeOptions as option}
            <Select.Item value={option.value}>{option.label}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>

    <!-- Status Filter -->
    <div class="space-y-1.5">
      <label for="status-filter" class="text-xs font-medium">Status</label>
      <Select.Root
        type="single"
        value={filters.isActive?.toString() || ''}
        onValueChange={(value) => {
          onFilterChange(
            'isActive',
            value === 'true' ? true : value === 'false' ? false : undefined
          );
        }}>
        <Select.Trigger id="status-filter" class="h-9 w-full">
          {filters.isActive === true ? 'Active' : filters.isActive === false ? 'Inactive' : 'All'}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="">All</Select.Item>
          <Select.Item value="true">Active</Select.Item>
          <Select.Item value="false">Inactive</Select.Item>
        </Select.Content>
      </Select.Root>
    </div>
  </div>

  <div class="grid grid-cols-2 gap-3">
    <!-- Tax Relevance Filter -->
    <div class="space-y-1.5">
      <label for="tax-relevance-filter" class="text-xs font-medium">Tax</label>
      <Select.Root
        type="single"
        value={filters.taxRelevant?.toString() || ''}
        onValueChange={(value) => {
          onFilterChange(
            'taxRelevant',
            value === 'true' ? true : value === 'false' ? false : undefined
          );
        }}>
        <Select.Trigger id="tax-relevance-filter" class="h-9 w-full">
          {filters.taxRelevant === true
            ? 'Relevant'
            : filters.taxRelevant === false
              ? 'Not Relevant'
              : 'All'}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="">All</Select.Item>
          <Select.Item value="true">Tax Relevant</Select.Item>
          <Select.Item value="false">Not Tax Relevant</Select.Item>
        </Select.Content>
      </Select.Root>
    </div>

    <!-- Payment Frequency Filter -->
    <div class="space-y-1.5">
      <label for="payment-frequency-filter" class="text-xs font-medium">Frequency</label>
      <Select.Root
        type="single"
        value={filters.paymentFrequency || ''}
        onValueChange={(value) => {
          onFilterChange('paymentFrequency', (value as PaymentFrequency) || undefined);
        }}>
        <Select.Trigger id="payment-frequency-filter" class="h-9 w-full">
          {filters.paymentFrequency
            ? frequencyOptions.find((opt) => opt.value === filters.paymentFrequency)?.label || 'All'
            : 'All'}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="">All frequencies</Select.Item>
          {#each frequencyOptions as option}
            <Select.Item value={option.value}>{option.label}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>
  </div>
</div>
