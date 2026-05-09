<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import { Progress } from '$lib/components/ui/progress';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { rpc } from '$lib/query';
import { GOAL_TYPE_LABELS, type GoalWithProgress } from '$core/query/financial-goals';
import { currencyFormatter } from '$lib/utils/formatters';
import CalendarIcon from '@lucide/svelte/icons/calendar';
import CheckCircle from '@lucide/svelte/icons/circle-check';
import PencilIcon from '@lucide/svelte/icons/pencil';
import Trash2Icon from '@lucide/svelte/icons/trash-2';
import TrendingUpIcon from '@lucide/svelte/icons/trending-up';
import TrendingDownIcon from '@lucide/svelte/icons/trending-down';
import TargetIcon from '@lucide/svelte/icons/target';
import PiggyBankIcon from '@lucide/svelte/icons/piggy-bank';
import WalletIcon from '@lucide/svelte/icons/wallet';
import LightbulbIcon from '@lucide/svelte/icons/lightbulb';

interface Props {
  goal: GoalWithProgress;
  onEdit?: (goal: GoalWithProgress) => void;
}

let { goal, onEdit }: Props = $props();

const deleteMutation = rpc.financialGoals.deleteGoal.options();
const completeMutation = rpc.financialGoals.markGoalComplete.options();

let deleteConfirmOpen = $state(false);

const GOAL_TYPE_ICONS: Record<string, any> = {
  savings_target: PiggyBankIcon,
  debt_payoff: TrendingDownIcon,
  contribution_ramp: TrendingUpIcon,
  balance_target: TargetIcon,
  custom: LightbulbIcon,
};

const GOAL_TYPE_COLORS: Record<string, string> = {
  savings_target: 'bg-success-bg text-success-fg',
  debt_payoff: 'bg-danger-bg text-danger-fg',
  contribution_ramp: 'bg-info-bg text-info-fg',
  balance_target: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  custom: 'bg-muted text-muted-foreground',
};

const GoalIcon = $derived(GOAL_TYPE_ICONS[goal.goalType] ?? LightbulbIcon);
const typeColor = $derived(GOAL_TYPE_COLORS[goal.goalType] ?? GOAL_TYPE_COLORS.custom);

const daysRemaining = $derived.by(() => {
  if (!goal.targetDate) return null;
  const target = new Date(goal.targetDate + 'T00:00:00');
  const diff = Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
});

const daysLabel = $derived.by(() => {
  if (daysRemaining === null) return null;
  if (daysRemaining < 0) return `${Math.abs(daysRemaining)}d overdue`;
  if (daysRemaining === 0) return 'Due today';
  if (daysRemaining === 1) return '1 day left';
  return `${daysRemaining} days left`;
});

async function handleDelete() {
  await deleteMutation.mutateAsync({ id: goal.id });
  deleteConfirmOpen = false;
}

async function handleMarkComplete() {
  await completeMutation.mutateAsync({ id: goal.id });
}
</script>

<Card.Root class="flex flex-col gap-4 p-4">
  <!-- Header row -->
  <div class="flex items-start gap-3">
    <div class="bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
      <GoalIcon class="h-4 w-4"></GoalIcon>
    </div>
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <p class="truncate font-medium">{goal.name}</p>
        {#if goal.isCompleted}
          <Badge variant="outline" class="shrink-0 border-success text-success">
            Completed
          </Badge>
        {/if}
      </div>
      <span class="inline-block rounded-full px-2 py-0.5 text-xs {typeColor}">
        {GOAL_TYPE_LABELS[goal.goalType] ?? goal.goalType}
      </span>
    </div>
    <!-- Actions -->
    {#if !goal.isCompleted}
      <div class="flex shrink-0 gap-1">
        <Button
          variant="ghost"
          size="icon"
          class="h-7 w-7"
          title="Edit goal"
          onclick={() => onEdit?.(goal)}>
          <PencilIcon class="h-3.5 w-3.5"></PencilIcon>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="h-7 w-7"
          title="Delete goal"
          onclick={() => (deleteConfirmOpen = true)}>
          <Trash2Icon class="h-3.5 w-3.5 text-destructive"></Trash2Icon>
        </Button>
      </div>
    {/if}
  </div>

  <!-- Progress -->
  <div class="space-y-1.5">
    <div class="flex items-center justify-between text-sm">
      <span class="font-medium">{currencyFormatter.format(goal.currentAmount)}</span>
      <span class="text-muted-foreground">
        of {currencyFormatter.format(goal.targetAmount)}
      </span>
    </div>
    <Progress value={goal.percentComplete} class="h-2" />
    <div class="flex items-center justify-between text-xs">
      <span
        class:text-success={goal.isOnTrack && !goal.isCompleted}
        class:text-destructive={!goal.isOnTrack && !goal.isCompleted}
        class:text-muted-foreground={goal.isCompleted}>
        {goal.isCompleted
          ? '100% complete'
          : `${goal.percentComplete.toFixed(1)}% — ${currencyFormatter.format(goal.remaining)} to go`}
      </span>
      {#if !goal.isOnTrack && !goal.isCompleted && goal.targetDate}
        <span class="text-destructive text-xs">Behind pace</span>
      {:else if goal.isOnTrack && !goal.isCompleted && goal.targetDate}
        <span class="text-success text-xs">On track</span>
      {/if}
    </div>
  </div>

  <!-- Footer row: date + complete button -->
  {#if goal.targetDate || !goal.isCompleted}
    <div class="flex items-center justify-between border-t pt-2">
      {#if goal.targetDate}
        <div class="text-muted-foreground flex items-center gap-1 text-xs">
          <CalendarIcon class="h-3 w-3"></CalendarIcon>
          <span>{daysLabel}</span>
        </div>
      {:else}
        <span></span>
      {/if}
      {#if !goal.isCompleted}
        <Button
          variant="ghost"
          size="sm"
          class="h-6 gap-1 px-2 text-xs text-success hover:text-success/80"
          disabled={completeMutation.isPending}
          onclick={handleMarkComplete}>
          <CheckCircle class="h-3 w-3"></CheckCircle>
          Mark complete
        </Button>
      {/if}
    </div>
  {/if}
</Card.Root>

<!-- Delete confirmation -->
<AlertDialog.Root bind:open={deleteConfirmOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete goal?</AlertDialog.Title>
      <AlertDialog.Description>
        "{goal.name}" will be permanently deleted. This action cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        onclick={handleDelete}
        disabled={deleteMutation.isPending}>
        Delete
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
