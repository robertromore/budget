<script lang="ts">
import * as Card from '$lib/components/ui/card';
import { Button } from '$lib/components/ui/button';
import { Progress } from '$lib/components/ui/progress';
import { Badge } from '$lib/components/ui/badge';
import {
  Calendar,
  Plus,
  TrendingUp,
  AlertCircle,
  Check,
  Clock,
  Edit,
  ChevronRight
} from '@lucide/svelte/icons';
import { parseISOString, formatDateDisplay, currentDate } from '$lib/utils/dates';
import { formatCurrency } from '$lib/utils';
import type { CalendarDate } from '@internationalized/date';

interface BudgetPeriodTemplate {
  id: number;
  budgetId: number;
  periodType: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  interval: number;
  startDayOfWeek?: number;
  startDayOfMonth?: number;
  startMonth?: number;
  customDuration?: number;
}

interface BudgetPeriodInstance {
  id: number;
  budgetId: number;
  templateId: number;
  startDate: string;
  endDate: string;
  allocated: number;
  spent: number;
  remaining: number;
  status: 'upcoming' | 'active' | 'completed';
  rolloverFrom?: number;
  rolloverAmount?: number;
}

interface Props {
  budgetId: number;
  budgetName: string;
  template?: BudgetPeriodTemplate;
  instances?: BudgetPeriodInstance[];
  onGenerateNext?: () => void;
  onEditPeriod?: (instanceId: number) => void;
  onEditTemplate?: () => void;
}

let {
  budgetId,
  budgetName,
  template,
  instances = [],
  onGenerateNext,
  onEditPeriod,
  onEditTemplate
}: Props = $props();

// Format period type for display
function formatPeriodType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

// Get period type description
function getPeriodDescription(template: BudgetPeriodTemplate): string {
  const intervalText = template.interval === 1
    ? template.periodType.slice(0, -2) // Remove 'ly' ending
    : `${template.interval} ${template.periodType}`;

  switch (template.periodType) {
    case 'weekly':
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return `Every ${intervalText}, starting on ${days[template.startDayOfWeek || 1]}`;
    case 'monthly':
      return `Every ${intervalText}, starting on day ${template.startDayOfMonth || 1}`;
    case 'quarterly':
      return `Every ${intervalText}`;
    case 'yearly':
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `Every ${intervalText}, starting ${months[(template.startMonth || 1) - 1]} ${template.startDayOfMonth || 1}`;
    case 'custom':
      return `Every ${template.customDuration} days`;
    default:
      return 'Custom period';
  }
}

// Get current period instance
const currentPeriod = $derived.by(() => {
  return instances.find(p => p.status === 'active');
});

// Get upcoming periods
const upcomingPeriods = $derived.by(() => {
  return instances.filter(p => p.status === 'upcoming').slice(0, 3);
});

// Get past periods (last 5)
const pastPeriods = $derived.by(() => {
  return instances.filter(p => p.status === 'completed').slice(0, 5);
});

// Calculate period progress percentage
function calculateProgress(spent: number, allocated: number): number {
  if (allocated === 0) return 0;
  return Math.min((spent / allocated) * 100, 100);
}

// Get status badge variant
function getStatusVariant(status: string): 'default' | 'secondary' | 'outline' {
  switch (status) {
    case 'active':
      return 'default';
    case 'upcoming':
      return 'secondary';
    case 'completed':
      return 'outline';
    default:
      return 'outline';
  }
}

// Get progress color class
function getProgressColorClass(spent: number, allocated: number): string {
  if (allocated === 0) return '';

  const percentage = (spent / allocated) * 100;

  if (percentage >= 100) return 'bg-destructive';
  if (percentage >= 90) return 'bg-orange-500';
  if (percentage >= 75) return 'bg-yellow-500';
  return 'bg-primary';
}
</script>

<div class="space-y-6">
  <!-- Template Configuration Card -->
  <Card.Root>
    <Card.Header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Calendar class="h-5 w-5 text-muted-foreground" />
          <div>
            <Card.Title>Period Configuration</Card.Title>
            <Card.Description>
              {template ? getPeriodDescription(template) : 'No period template configured'}
            </Card.Description>
          </div>
        </div>
        {#if onEditTemplate}
          <Button variant="ghost" size="sm" onclick={onEditTemplate}>
            <Edit class="h-4 w-4" />
            Edit
          </Button>
        {/if}
      </div>
    </Card.Header>
    {#if template}
      <Card.Content>
        <div class="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span class="text-muted-foreground">Type:</span>
            <span class="ml-2 font-medium">{formatPeriodType(template.periodType)}</span>
          </div>
          <div>
            <span class="text-muted-foreground">Interval:</span>
            <span class="ml-2 font-medium">
              Every {template.interval} {template.interval === 1 ? template.periodType.slice(0, -2) : template.periodType}
            </span>
          </div>
          <div>
            <span class="text-muted-foreground">Total Periods:</span>
            <span class="ml-2 font-medium">{instances.length}</span>
          </div>
        </div>
      </Card.Content>
    {/if}
  </Card.Root>

  <!-- Current Period -->
  {#if currentPeriod}
    <Card.Root class="border-primary">
      <Card.Header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Clock class="h-5 w-5 text-primary" />
            <div>
              <Card.Title class="text-primary">Current Period</Card.Title>
              <Card.Description>
                {formatDateDisplay(parseISOString(currentPeriod.startDate), 'short')}
                →
                {formatDateDisplay(parseISOString(currentPeriod.endDate), 'short')}
              </Card.Description>
            </div>
          </div>
          <Badge variant="default">Active</Badge>
        </div>
      </Card.Header>
      <Card.Content class="space-y-4">
        <!-- Spending Overview -->
        <div class="grid grid-cols-3 gap-4">
          <div class="space-y-1">
            <p class="text-sm text-muted-foreground">Allocated</p>
            <p class="text-2xl font-bold">{formatCurrency(currentPeriod.allocated)}</p>
          </div>
          <div class="space-y-1">
            <p class="text-sm text-muted-foreground">Spent</p>
            <p class="text-2xl font-bold">{formatCurrency(currentPeriod.spent)}</p>
          </div>
          <div class="space-y-1">
            <p class="text-sm text-muted-foreground">Remaining</p>
            <p class="text-2xl font-bold" class:text-destructive={currentPeriod.remaining < 0}>
              {formatCurrency(currentPeriod.remaining)}
            </p>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-muted-foreground">Progress</span>
            <span class="font-medium">
              {calculateProgress(currentPeriod.spent, currentPeriod.allocated).toFixed(1)}%
            </span>
          </div>
          <Progress
            value={calculateProgress(currentPeriod.spent, currentPeriod.allocated)}
            class="h-3 {getProgressColorClass(currentPeriod.spent, currentPeriod.allocated)}"
          />
        </div>

        <!-- Rollover Info -->
        {#if currentPeriod.rolloverAmount && currentPeriod.rolloverAmount !== 0}
          <div class="flex items-center gap-2 p-3 rounded-md bg-muted/30 text-sm">
            <TrendingUp class="h-4 w-4 text-green-600" />
            <span>
              Rolled over {formatCurrency(currentPeriod.rolloverAmount)} from previous period
            </span>
          </div>
        {/if}

        <!-- Action Button -->
        {#if onEditPeriod}
          <Button variant="outline" class="w-full" onclick={() => onEditPeriod?.(currentPeriod.id)}>
            View Details
            <ChevronRight class="ml-2 h-4 w-4" />
          </Button>
        {/if}
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Upcoming Periods -->
  {#if upcomingPeriods.length > 0}
    <Card.Root>
      <Card.Header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Calendar class="h-5 w-5 text-muted-foreground" />
            <Card.Title>Upcoming Periods</Card.Title>
          </div>
          {#if onGenerateNext}
            <Button variant="outline" size="sm" onclick={onGenerateNext}>
              <Plus class="h-4 w-4 mr-2" />
              Generate Next
            </Button>
          {/if}
        </div>
      </Card.Header>
      <Card.Content>
        <div class="space-y-3">
          {#each upcomingPeriods as period}
            <div class="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/5 transition-colors">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <Badge variant="secondary">Upcoming</Badge>
                  <span class="text-sm font-medium">
                    {formatDateDisplay(parseISOString(period.startDate), 'short')}
                    →
                    {formatDateDisplay(parseISOString(period.endDate), 'short')}
                  </span>
                </div>
                <p class="text-sm text-muted-foreground">
                  Allocated: {formatCurrency(period.allocated)}
                </p>
              </div>
              {#if onEditPeriod}
                <Button variant="ghost" size="sm" onclick={() => onEditPeriod?.(period.id)}>
                  <Edit class="h-4 w-4" />
                </Button>
              {/if}
            </div>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Past Periods -->
  {#if pastPeriods.length > 0}
    <Card.Root>
      <Card.Header>
        <div class="flex items-center gap-2">
          <Check class="h-5 w-5 text-muted-foreground" />
          <Card.Title>Past Periods</Card.Title>
        </div>
      </Card.Header>
      <Card.Content>
        <div class="space-y-3">
          {#each pastPeriods as period}
            <div class="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/5 transition-colors">
              <div class="flex-1 space-y-1">
                <div class="flex items-center gap-2">
                  <Badge variant="outline">Completed</Badge>
                  <span class="text-sm font-medium">
                    {formatDateDisplay(parseISOString(period.startDate), 'short')}
                    →
                    {formatDateDisplay(parseISOString(period.endDate), 'short')}
                  </span>
                </div>
                <div class="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Spent: {formatCurrency(period.spent)}</span>
                  <span>Budget: {formatCurrency(period.allocated)}</span>
                  <span class:text-green-600={period.remaining > 0} class:text-destructive={period.remaining < 0}>
                    {period.remaining >= 0 ? 'Under' : 'Over'} by {formatCurrency(Math.abs(period.remaining))}
                  </span>
                </div>
              </div>
              {#if onEditPeriod}
                <Button variant="ghost" size="sm" onclick={() => onEditPeriod?.(period.id)}>
                  <ChevronRight class="h-4 w-4" />
                </Button>
              {/if}
            </div>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- No Periods State -->
  {#if instances.length === 0}
    <Card.Root>
      <Card.Content class="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle class="h-12 w-12 text-muted-foreground mb-4" />
        <h3 class="text-lg font-semibold mb-2">No Periods Yet</h3>
        <p class="text-sm text-muted-foreground mb-6 max-w-md">
          Create a period template to start tracking your budget over time.
          Periods will be automatically generated based on your configuration.
        </p>
        {#if onEditTemplate}
          <Button onclick={onEditTemplate}>
            <Plus class="h-4 w-4 mr-2" />
            Configure Period Template
          </Button>
        {/if}
      </Card.Content>
    </Card.Root>
  {/if}
</div>
