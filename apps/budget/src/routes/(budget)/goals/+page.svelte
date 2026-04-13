<script lang="ts">
import { Button } from '$lib/components/ui/button';
import * as Tabs from '$lib/components/ui/tabs';
import { Skeleton } from '$lib/components/ui/skeleton';
import { rpc } from '$lib/query';
import type { GoalWithProgress } from '$core/query/financial-goals';
import Plus from '@lucide/svelte/icons/plus';
import Target from '@lucide/svelte/icons/target';
import GoalCard from './(components)/goal-card.svelte';
import GoalForm from './(components)/goal-form.svelte';

// Queries
// svelte-ignore state_referenced_locally
const activeQuery = $derived(rpc.financialGoals.listGoals().options());
// svelte-ignore state_referenced_locally
const allQuery = $derived(rpc.financialGoals.listGoals(true).options());

const activeGoals = $derived(activeQuery.data ?? []);
const allGoals = $derived(allQuery.data ?? []);
const completedGoals = $derived(allGoals.filter((g) => g.isCompleted));
const isLoading = $derived(activeQuery.isLoading);

// UI state
let formOpen = $state(false);
let editingGoal = $state<GoalWithProgress | null>(null);

function openNewGoal() {
  editingGoal = null;
  formOpen = true;
}

function openEditGoal(goal: GoalWithProgress) {
  editingGoal = goal;
  formOpen = true;
}
</script>

<svelte:head>
  <title>Financial Goals</title>
</svelte:head>

<div class="container mx-auto max-w-5xl space-y-6 py-6">
  <!-- Header -->
  <div class="flex items-start justify-between">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Financial Goals</h1>
      <p class="text-muted-foreground mt-1">
        Track savings targets, debt payoff, and balance milestones.
      </p>
    </div>
    <Button onclick={openNewGoal} class="gap-2">
      <Plus class="h-4 w-4"></Plus>
      New goal
    </Button>
  </div>

  <Tabs.Root value="active">
    <Tabs.List>
      <Tabs.Trigger value="active">
        Active
        {#if activeGoals.length > 0}
          <span class="bg-primary/15 text-primary ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-medium">
            {activeGoals.length}
          </span>
        {/if}
      </Tabs.Trigger>
      <Tabs.Trigger value="completed">Completed</Tabs.Trigger>
    </Tabs.List>

    <!-- Active goals -->
    <Tabs.Content value="active" class="mt-6">
      {#if isLoading}
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {#each Array(3) as _}
            <Skeleton class="h-44 rounded-xl"></Skeleton>
          {/each}
        </div>
      {:else if activeGoals.length === 0}
        <div class="flex flex-col items-center gap-4 py-20 text-center">
          <div class="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
            <Target class="text-muted-foreground h-8 w-8"></Target>
          </div>
          <div>
            <p class="text-lg font-medium">No active goals</p>
            <p class="text-muted-foreground mt-1 text-sm">
              Create a goal to start tracking your financial progress.
            </p>
          </div>
          <Button onclick={openNewGoal} class="gap-2">
            <Plus class="h-4 w-4"></Plus>
            Create your first goal
          </Button>
        </div>
      {:else}
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {#each activeGoals as goal (goal.id)}
            <GoalCard {goal} onEdit={openEditGoal}></GoalCard>
          {/each}
        </div>
      {/if}
    </Tabs.Content>

    <!-- Completed goals -->
    <Tabs.Content value="completed" class="mt-6">
      {#if completedGoals.length === 0}
        <div class="flex flex-col items-center gap-3 py-16 text-center">
          <p class="text-muted-foreground text-sm">No completed goals yet.</p>
        </div>
      {:else}
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {#each completedGoals as goal (goal.id)}
            <GoalCard {goal} onEdit={openEditGoal}></GoalCard>
          {/each}
        </div>
      {/if}
    </Tabs.Content>
  </Tabs.Root>
</div>

<!-- Goal form sheet -->
<GoalForm bind:open={formOpen} goal={editingGoal} onClose={() => (editingGoal = null)}></GoalForm>
