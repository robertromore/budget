<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { Progress } from '$lib/components/ui/progress';
import { rpc } from '$lib/query';
import { GOAL_TYPE_LABELS } from '$core/query/financial-goals';
import { currencyFormatter } from '$lib/utils/formatters';
import Target from '@lucide/svelte/icons/target';

let { config }: { config: DashboardWidget } = $props();

// svelte-ignore state_referenced_locally
const goalsQuery = $derived(rpc.financialGoals.listGoals().options());
const allGoals = $derived(goalsQuery.data ?? []);
const isLoading = $derived(goalsQuery.isLoading);

const customLimit = $derived(Number((config.settings as any)?.limit) || 0);
const limit = $derived.by(() => {
  if (customLimit > 0) return customLimit;
  switch (config.size) {
    case 'small':
      return 0;
    case 'medium':
      return 3;
    case 'large':
      return 6;
    default:
      return 12;
  }
});

const goals = $derived(allGoals.slice(0, limit));
const remaining = $derived(allGoals.length - goals.length);

// Closest-to-completion goal — most useful single-line summary at small.
const closest = $derived.by(() => {
  if (allGoals.length === 0) return null;
  return [...allGoals].sort((a, b) => b.percentComplete - a.percentComplete)[0]!;
});
const totalSaved = $derived(allGoals.reduce((s, g) => s + (g.currentAmount ?? 0), 0));
const totalTarget = $derived(allGoals.reduce((s, g) => s + (g.targetAmount ?? 0), 0));
const overallPct = $derived(totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0);
</script>

{#if isLoading}
  <div class="space-y-3 py-2">
    {#each Array(Math.max(limit, 2)) as _}
      <div class="space-y-1.5">
        <div class="bg-muted h-3 w-32 animate-pulse rounded"></div>
        <div class="bg-muted h-2 w-full animate-pulse rounded-full"></div>
      </div>
    {/each}
  </div>
{:else if allGoals.length === 0}
  <div class="flex flex-col items-center gap-2 py-6 text-center">
    <Target class="text-muted-foreground h-8 w-8"></Target>
    <p class="text-muted-foreground text-sm">No active goals</p>
    <a href="/goals" class="text-primary text-xs hover:underline">Create a goal</a>
  </div>
{:else if config.size === 'small'}
  <div class="flex items-start gap-3">
    <div class="bg-primary/10 rounded-lg p-2.5 shrink-0">
      <Target class="text-primary h-5 w-5"></Target>
    </div>
    <div class="min-w-0 flex-1">
      <div class="text-xl font-bold tabular-nums">{allGoals.length}</div>
      <p class="text-muted-foreground text-xs">
        {#if closest}
          Closest: <span class="font-medium">{closest.name}</span>
          {closest.percentComplete.toFixed(0)}%
        {:else}
          {allGoals.length} goal{allGoals.length === 1 ? '' : 's'}
        {/if}
      </p>
    </div>
  </div>
{:else}
  <div class="space-y-3">
    {#if config.size === 'full'}
      <div class="text-muted-foreground flex items-baseline justify-between border-b pb-1.5 text-xs uppercase tracking-wider">
        <span>{allGoals.length} goals · {overallPct.toFixed(0)}%</span>
        <span class="tabular-nums">
          {currencyFormatter.format(totalSaved)} / {currencyFormatter.format(totalTarget)}
        </span>
      </div>
    {/if}

    {#each goals as goal (goal.id)}
      <div class="space-y-1">
        <div class="flex items-center justify-between gap-2 text-sm">
          <div class="min-w-0">
            <span class="truncate font-medium">{goal.name}</span>
            {#if (config.size === 'large' || config.size === 'full') && goal.goalType}
              <span class="text-muted-foreground ml-1 text-xs">
                · {GOAL_TYPE_LABELS[goal.goalType as keyof typeof GOAL_TYPE_LABELS] ?? goal.goalType}
              </span>
            {/if}
          </div>
          <span class="text-muted-foreground shrink-0 text-xs tabular-nums">
            {goal.percentComplete.toFixed(0)}%
          </span>
        </div>
        <Progress value={goal.percentComplete} class="h-1.5"></Progress>
        <div class="text-muted-foreground flex items-center justify-between text-xs tabular-nums">
          <span>{currencyFormatter.format(goal.currentAmount)}</span>
          <span>{currencyFormatter.format(goal.targetAmount)}</span>
        </div>
        {#if config.size === 'full' && goal.targetDate}
          <p class="text-muted-foreground/80 text-[10px]">Target: {goal.targetDate}</p>
        {/if}
      </div>
    {/each}

    {#if remaining > 0}
      <p class="text-muted-foreground pt-1 text-center text-xs">+{remaining} more</p>
    {/if}

    <a
      href="/goals"
      class="text-muted-foreground hover:text-foreground mt-1 block pt-1 text-center text-xs transition-colors hover:underline">
      View all goals →
    </a>
  </div>
{/if}
