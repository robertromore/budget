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
const goals = $derived((goalsQuery.data ?? []).slice(0, 3));
const isLoading = $derived(goalsQuery.isLoading);
</script>

{#if isLoading}
  <div class="space-y-3 py-2">
    {#each Array(2) as _}
      <div class="space-y-1.5">
        <div class="bg-muted h-3 w-32 animate-pulse rounded"></div>
        <div class="bg-muted h-2 w-full animate-pulse rounded-full"></div>
      </div>
    {/each}
  </div>
{:else if goals.length === 0}
  <div class="flex flex-col items-center gap-2 py-6 text-center">
    <Target class="text-muted-foreground h-8 w-8"></Target>
    <p class="text-muted-foreground text-sm">No active goals</p>
    <a href="/goals" class="text-primary text-xs hover:underline">Create a goal</a>
  </div>
{:else}
  <div class="space-y-3">
    {#each goals as goal (goal.id)}
      <div class="space-y-1">
        <div class="flex items-center justify-between gap-2 text-sm">
          <span class="truncate font-medium">{goal.name}</span>
          <span class="text-muted-foreground shrink-0 text-xs">
            {goal.percentComplete.toFixed(0)}%
          </span>
        </div>
        <Progress value={goal.percentComplete} class="h-1.5" />
        <div class="text-muted-foreground flex items-center justify-between text-xs">
          <span>{currencyFormatter.format(goal.currentAmount)}</span>
          <span>{currencyFormatter.format(goal.targetAmount)}</span>
        </div>
      </div>
    {/each}

    <a
      href="/goals"
      class="text-muted-foreground hover:text-foreground mt-1 block pt-1 text-center text-xs transition-colors hover:underline">
      View all goals →
    </a>
  </div>
{/if}
