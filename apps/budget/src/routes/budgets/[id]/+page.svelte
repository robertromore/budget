<script lang="ts">
  import { page } from '$app/stores';
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { Separator } from '$lib/components/ui/separator';
  import { BudgetProgress, BudgetPeriodPicker } from '$lib/components/budgets';
  import { managingBudgetId, newBudgetDialog } from '$lib/states/ui/global.svelte';
  import { BudgetsState } from '$lib/states/budgets.svelte';
  import { formatCurrency } from '$lib/utils/formatters';
  import { ArrowLeft, Edit, Settings, TrendingUp, TrendingDown, Calendar, Target, Wallet, Repeat } from '@lucide/svelte';

  // Get budget ID from URL
  const budgetId = $derived(() => {
    const id = $page.params.id;
    return id ? parseInt(id) : null;
  });

  // Get budgets state
  const budgetsState = BudgetsState.get();

  // Get current budget
  const budget = $derived.by(() => {
    if (!budgetId) return null;
    return budgetsState.getById(budgetId);
  });

  // Mock budget progress data (will be replaced with real data from queries)
  const mockProgress = $derived.by(() => {
    if (!budget) return null;

    return {
      allocated: 2000,
      spent: 1250,
      remaining: 750,
      percentUsed: 62.5,
      isOverBudget: false,
      daysInPeriod: 30,
      daysRemaining: 12,
    };
  });

  // Mock periods data (will be replaced with real data from queries)
  const mockPeriods = [
    {
      id: 1,
      name: 'January 2025',
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      status: 'active' as const,
    },
    {
      id: 2,
      name: 'December 2024',
      startDate: '2024-12-01',
      endDate: '2024-12-31',
      status: 'completed' as const,
    },
    {
      id: 3,
      name: 'February 2025',
      startDate: '2025-02-01',
      endDate: '2025-02-28',
      status: 'upcoming' as const,
    },
  ];

  let selectedPeriodId = $state(1);

  // Budget type info
  function getBudgetTypeInfo(type: string) {
    switch (type) {
      case 'account-monthly':
        return {
          label: 'Monthly Budget',
          icon: Calendar,
          color: 'hsl(var(--blue))',
          description: 'Monthly spending limit per account'
        };
      case 'category-envelope':
        return {
          label: 'Envelope Budget',
          icon: Wallet,
          color: 'hsl(var(--green))',
          description: 'YNAB-style category allocation'
        };
      case 'goal-based':
        return {
          label: 'Goal Budget',
          icon: Target,
          color: 'hsl(var(--purple))',
          description: 'Savings or spending goal tracking'
        };
      case 'scheduled-expense':
        return {
          label: 'Scheduled Budget',
          icon: Repeat,
          color: 'hsl(var(--orange))',
          description: 'Recurring expense planning'
        };
      default:
        return {
          label: 'Budget',
          icon: Wallet,
          color: 'hsl(var(--muted-foreground))',
          description: 'Budget'
        };
    }
  }

  function getEnforcementInfo(level: string) {
    switch (level) {
      case 'strict':
        return { label: 'Strict', variant: 'destructive' as const, description: 'Blocks transactions when over budget' };
      case 'warning':
        return { label: 'Warning', variant: 'outline' as const, description: 'Shows warnings when approaching limit' };
      case 'none':
        return { label: 'Tracking', variant: 'secondary' as const, description: 'Tracks spending without enforcement' };
      default:
        return { label: 'Tracking', variant: 'secondary' as const, description: 'Tracks spending without enforcement' };
    }
  }

  function handlePeriodSelect(periodId: number | null) {
    if (periodId) {
      selectedPeriodId = periodId;
    }
  }
</script>

{#if !budget}
  <div class="container mx-auto p-6">
    <div class="text-center">
      <h1 class="text-2xl font-semibold mb-2">Budget not found</h1>
      <p class="text-muted-foreground mb-4">The budget you're looking for doesn't exist or has been deleted.</p>
      <Button href="/budgets">
        <ArrowLeft class="h-4 w-4 mr-2" />
        Back to Budgets
      </Button>
    </div>
  </div>
{:else}
  {@const typeInfo = getBudgetTypeInfo(budget.type)}
  {@const enforcementInfo = getEnforcementInfo(budget.enforcementLevel)}

  <div class="container mx-auto p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-4">
        <Button variant="ghost" size="icon" href="/budgets">
          <ArrowLeft class="h-4 w-4" />
        </Button>
        <div>
          <div class="flex items-center gap-2 mb-1">
            <typeInfo.icon class="h-6 w-6" style="color: {typeInfo.color}" />
            <h1 class="text-3xl font-bold tracking-tight">{budget.name}</h1>
          </div>
          <div class="flex items-center gap-2">
            <Badge variant="outline" style="border-color: {typeInfo.color}; color: {typeInfo.color}">
              {typeInfo.label}
            </Badge>
            <Badge variant={budget.status === 'active' ? 'default' : 'secondary'}>
              {budget.status}
            </Badge>
            <Badge variant={enforcementInfo.variant}>
              {enforcementInfo.label}
            </Badge>
          </div>
        </div>
      </div>

      <div class="flex gap-2">
        <Button variant="outline" size="icon">
          <Settings class="h-4 w-4" />
        </Button>
        <Button
          onclick={() => {
            managingBudgetId.current = budget.id;
            newBudgetDialog.current = true;
          }}
        >
          <Edit class="h-4 w-4 mr-2" />
          Edit Budget
        </Button>
      </div>
    </div>

    <!-- Budget Description -->
    {#if budget.description}
      <Card.Root class="mb-6">
        <Card.Content class="pt-6">
          <p class="text-muted-foreground">{budget.description}</p>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Period Selector -->
    <Card.Root class="mb-6">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Calendar class="h-5 w-5" />
          Budget Period
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <BudgetPeriodPicker
          periods={mockPeriods}
          bind:selectedPeriodId
          onSelect={handlePeriodSelect}
          showNavigation={true}
          showCreateButton={true}
        />
      </Card.Content>
    </Card.Root>

    <!-- Budget Progress -->
    {#if mockProgress}
      <div class="mb-6">
        <BudgetProgress
          budgetName={budget.name}
          budgetType={budget.type}
          progress={mockProgress}
          enforcementLevel={budget.enforcementLevel}
          showDetails={true}
          showTrend={true}
          size="lg"
        />
      </div>
    {/if}

    <!-- Budget Details Grid -->
    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
      <!-- Budget Information -->
      <Card.Root>
        <Card.Header>
          <Card.Title class="text-lg">Budget Information</Card.Title>
        </Card.Header>
        <Card.Content class="space-y-4">
          <div class="flex justify-between">
            <span class="text-muted-foreground">Type:</span>
            <span class="font-medium">{typeInfo.label}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Scope:</span>
            <span class="font-medium capitalize">{budget.scope}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Enforcement:</span>
            <span class="font-medium">{enforcementInfo.label}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Status:</span>
            <span class="font-medium capitalize">{budget.status}</span>
          </div>
          <Separator />
          <div class="flex justify-between">
            <span class="text-muted-foreground">Created:</span>
            <span class="font-medium">{new Date(budget.createdAt).toLocaleDateString()}</span>
          </div>
          {#if budget.updatedAt !== budget.createdAt}
            <div class="flex justify-between">
              <span class="text-muted-foreground">Updated:</span>
              <span class="font-medium">{new Date(budget.updatedAt).toLocaleDateString()}</span>
            </div>
          {/if}
        </Card.Content>
      </Card.Root>

      <!-- Quick Stats -->
      <Card.Root>
        <Card.Header>
          <Card.Title class="text-lg">Quick Stats</Card.Title>
        </Card.Header>
        <Card.Content class="space-y-4">
          {#if mockProgress}
            <div class="flex justify-between">
              <span class="text-muted-foreground">Daily Average:</span>
              <span class="font-medium">{formatCurrency(mockProgress.spent / (mockProgress.daysInPeriod - mockProgress.daysRemaining))}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Projected Total:</span>
              <span class="font-medium">{formatCurrency((mockProgress.spent / (mockProgress.daysInPeriod - mockProgress.daysRemaining)) * mockProgress.daysInPeriod)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Budget Utilization:</span>
              <span class="font-medium">{mockProgress.percentUsed.toFixed(1)}%</span>
            </div>
          {/if}
          <Separator />
          <div class="flex justify-between">
            <span class="text-muted-foreground">Active Periods:</span>
            <span class="font-medium">1</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Total Periods:</span>
            <span class="font-medium">{mockPeriods.length}</span>
          </div>
        </Card.Content>
      </Card.Root>

      <!-- Actions -->
      <Card.Root>
        <Card.Header>
          <Card.Title class="text-lg">Actions</Card.Title>
        </Card.Header>
        <Card.Content class="space-y-3">
          <Button variant="outline" class="w-full justify-start">
            <TrendingUp class="h-4 w-4 mr-2" />
            View Analytics
          </Button>
          <Button variant="outline" class="w-full justify-start">
            <Calendar class="h-4 w-4 mr-2" />
            Manage Periods
          </Button>
          <Button variant="outline" class="w-full justify-start">
            <Settings class="h-4 w-4 mr-2" />
            Configure Settings
          </Button>
          <Separator />
          <Button variant="outline" class="w-full justify-start">
            <Target class="h-4 w-4 mr-2" />
            Set Goals
          </Button>
        </Card.Content>
      </Card.Root>
    </div>

    <!-- Type-specific Metadata -->
    {#if budget.metadata && Object.keys(budget.metadata).length > 0}
      <Card.Root>
        <Card.Header>
          <Card.Title class="text-lg">Advanced Settings</Card.Title>
          <Card.Description>Type-specific configuration for this {typeInfo.label.toLowerCase()}</Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="space-y-2">
            {#each Object.entries(budget.metadata) as [key, value]}
              <div class="flex justify-between items-center">
                <span class="text-sm text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                <span class="text-sm font-medium">{JSON.stringify(value)}</span>
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}
  </div>
{/if}