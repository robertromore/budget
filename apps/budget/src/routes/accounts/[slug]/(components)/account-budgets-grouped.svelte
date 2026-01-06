<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import * as Collapsible from '$lib/components/ui/collapsible';
import type { BudgetWithRelations } from '$lib/server/domains/budgets';
import type { GroupedAccountBudgets } from '$lib/server/domains/budgets/services';
import Calendar from '@lucide/svelte/icons/calendar';
import ChevronDown from '@lucide/svelte/icons/chevron-down';
import Target from '@lucide/svelte/icons/target';
import Wallet from '@lucide/svelte/icons/wallet';
import AccountBudgetsTable from './account-budgets-table.svelte';
import AccountBudgetsEmptyState from './account-budgets-empty-state.svelte';

interface Props {
  groupedBudgets: GroupedAccountBudgets;
  accountId: number;
  accountSlug: string;
  onView: (budget: BudgetWithRelations) => void;
  onEdit: (budget: BudgetWithRelations) => void;
  onDuplicate: (budget: BudgetWithRelations) => void;
  onArchive: (budget: BudgetWithRelations) => void;
  onDelete: (budget: BudgetWithRelations) => void;
  onBulkDelete: (budgets: BudgetWithRelations[]) => void;
  onBulkArchive: (budgets: BudgetWithRelations[]) => void;
}

let {
  groupedBudgets,
  accountId,
  accountSlug,
  onView,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  onBulkDelete,
  onBulkArchive,
}: Props = $props();

const sections = [
  {
    key: 'spendingLimits' as const,
    title: 'Spending Limits',
    icon: Wallet,
    description: 'Monthly spending caps for this account',
    iconClass: 'text-blue-500',
  },
  {
    key: 'savingsGoals' as const,
    title: 'Savings Goals',
    icon: Target,
    description: 'Savings targets using this account',
    iconClass: 'text-green-500',
  },
  {
    key: 'recurringExpenses' as const,
    title: 'Recurring Expenses',
    icon: Calendar,
    description: 'Scheduled expenses from this account',
    iconClass: 'text-orange-500',
  },
];

// Track which sections are open
let openSections = $state<Record<string, boolean>>({
  spendingLimits: true,
  savingsGoals: true,
  recurringExpenses: true,
});

const hasAnyBudgets = $derived(groupedBudgets.totalCount > 0);

// Get budgets for a section
function getBudgetsForSection(key: keyof GroupedAccountBudgets): BudgetWithRelations[] {
  const budgets = groupedBudgets[key];
  return Array.isArray(budgets) ? budgets : [];
}
</script>

{#if hasAnyBudgets}
  <div class="space-y-4">
    {#each sections as section}
      {@const budgets = getBudgetsForSection(section.key)}
      {#if budgets.length > 0}
        {@const Icon = section.icon}
        <Collapsible.Root bind:open={openSections[section.key]}>
          <div class="rounded-lg border">
            <Collapsible.Trigger class="flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors">
              <div class="flex items-center gap-3">
                <Icon class="h-5 w-5 {section.iconClass}" />
                <div class="flex flex-col items-start">
                  <div class="flex items-center gap-2">
                    <span class="font-medium">{section.title}</span>
                    <Badge variant="secondary" class="text-xs">{budgets.length}</Badge>
                  </div>
                  <span class="text-xs text-muted-foreground">{section.description}</span>
                </div>
              </div>
              <ChevronDown
                class="h-4 w-4 text-muted-foreground transition-transform duration-200 {openSections[section.key] ? 'rotate-180' : ''}"
              />
            </Collapsible.Trigger>
            <Collapsible.Content>
              <div class="border-t p-4">
                <AccountBudgetsTable
                  {budgets}
                  {accountId}
                  {accountSlug}
                  {onView}
                  {onEdit}
                  {onDuplicate}
                  {onArchive}
                  {onDelete}
                  {onBulkDelete}
                  {onBulkArchive}
                />
              </div>
            </Collapsible.Content>
          </div>
        </Collapsible.Root>
      {/if}
    {/each}
  </div>
{:else}
  <AccountBudgetsEmptyState {accountId} {accountSlug} />
{/if}
