<script lang="ts">
import type {Account} from '$lib/schema/accounts';
import {AVAILABLE_METRICS, getEnabledMetrics, type MetricId} from '$lib/utils/credit-card-metrics';
import * as Dialog from '$lib/components/ui/dialog';
import {Button} from '$lib/components/ui/button';
import {Checkbox} from '$lib/components/ui/checkbox';
import {Label} from '$lib/components/ui/label';
import * as Separator from '$lib/components/ui/separator';
import CreditCard from '@lucide/svelte/icons/credit-card';
import DollarSign from '@lucide/svelte/icons/dollar-sign';
import Percent from '@lucide/svelte/icons/percent';
import Calendar from '@lucide/svelte/icons/calendar';
import TrendingUp from '@lucide/svelte/icons/trending-up';

interface Props {
  account: Account;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onSave?: (enabledMetrics: MetricId[]) => void;
}

let {account, open = $bindable(false), onOpenChange, onSave}: Props = $props();

// Initialize selected metrics from account or defaults
let selectedMetrics = $state<Set<MetricId>>(new Set(getEnabledMetrics(account)));

// Group metrics by category
const metricsByCategory = $derived(() => {
  const categories = new Map<string, typeof AVAILABLE_METRICS>();
  AVAILABLE_METRICS.forEach((metric) => {
    const existing = categories.get(metric.category) || [];
    categories.set(metric.category, [...existing, metric]);
  });
  return categories;
});

// Category metadata
const categoryInfo = {
  'credit-health': {
    title: 'Credit Health',
    description: 'Monitor your credit usage and limits',
    icon: CreditCard,
  },
  payment: {
    title: 'Payment Information',
    description: 'Track payment due dates and amounts',
    icon: Calendar,
  },
  balance: {
    title: 'Balance Information',
    description: 'View current balance and credit limit',
    icon: DollarSign,
  },
  spending: {
    title: 'Spending Metrics',
    description: 'Analyze your spending patterns',
    icon: TrendingUp,
  },
  financial: {
    title: 'Financial Health',
    description: 'Understand interest and payoff timeline',
    icon: Percent,
  },
} as const;

function toggleMetric(metricId: MetricId) {
  if (selectedMetrics.has(metricId)) {
    selectedMetrics.delete(metricId);
  } else {
    selectedMetrics.add(metricId);
  }
  selectedMetrics = new Set(selectedMetrics); // Trigger reactivity
}

function handleSave() {
  onSave?.(Array.from(selectedMetrics));
  open = false;
}

function handleOpenChange(newOpen: boolean) {
  open = newOpen;
  onOpenChange?.(newOpen);
}

// Check if metric is available (account has required fields)
function isMetricAvailable(metric: (typeof AVAILABLE_METRICS)[number]): boolean {
  if (!metric.requiresField) return true;
  return account[metric.requiresField] !== null && account[metric.requiresField] !== undefined;
}

// Reset to defaults
function resetToDefaults() {
  selectedMetrics = new Set(AVAILABLE_METRICS.filter((m) => m.defaultEnabled).map((m) => m.id));
}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
  <Dialog.Content class="max-h-[80vh] max-w-2xl overflow-y-auto">
    <Dialog.Header>
      <Dialog.Title>Configure Credit Card Metrics</Dialog.Title>
      <Dialog.Description>
        Choose which metrics to display on your credit card account page. Metrics requiring
        additional account information are marked as unavailable.
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-6 py-4">
      {#each Array.from(metricsByCategory()) as [categoryKey, metrics]}
        {@const category = categoryInfo[categoryKey as keyof typeof categoryInfo]}
        {@const CategoryIcon = category.icon}

        <div class="space-y-3">
          <!-- Category Header -->
          <div class="flex items-start gap-3">
            <CategoryIcon class="text-muted-foreground mt-0.5 h-5 w-5" />
            <div class="flex-1">
              <h4 class="text-sm font-semibold">{category.title}</h4>
              <p class="text-muted-foreground text-xs">{category.description}</p>
            </div>
          </div>

          <!-- Metrics in this category -->
          <div class="ml-8 space-y-2">
            {#each metrics as metric}
              {@const available = isMetricAvailable(metric)}
              {@const checked = selectedMetrics.has(metric.id)}

              <div class="flex items-start gap-3 py-2">
                <Checkbox
                  id={metric.id}
                  {checked}
                  disabled={!available}
                  onCheckedChange={() => toggleMetric(metric.id)} />
                <div class="flex-1 space-y-1">
                  <Label
                    for={metric.id}
                    class="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 {!available
                      ? 'text-muted-foreground'
                      : ''}">
                    {metric.label}
                    {#if !available}
                      <span class="text-muted-foreground ml-2 text-xs">(Unavailable)</span>
                    {/if}
                  </Label>
                  <p class="text-muted-foreground text-xs">
                    {metric.description}
                    {#if !available && metric.requiresField}
                      <span class="text-xs italic">
                        - Requires {metric.requiresField.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </span>
                    {/if}
                  </p>
                </div>
              </div>
            {/each}
          </div>
        </div>

        {#if Array.from(metricsByCategory()).indexOf( [categoryKey, metrics] ) < Array.from(metricsByCategory()).length - 1}
          <Separator.Root />
        {/if}
      {/each}
    </div>

    <Dialog.Footer class="flex justify-between sm:justify-between">
      <Button variant="outline" onclick={resetToDefaults}>Reset to Defaults</Button>
      <div class="flex gap-2">
        <Button variant="ghost" onclick={() => (open = false)}>Cancel</Button>
        <Button onclick={handleSave}>Save Changes</Button>
      </div>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
