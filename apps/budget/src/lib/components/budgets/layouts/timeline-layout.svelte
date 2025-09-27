<script lang="ts">
  import {SvelteMap} from "svelte/reactivity";
  import * as Card from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import {
    Calendar,
    TrendingUp,
    TrendingDown,
    Target,
    AlertCircle,
    Clock,
    DollarSign,
    Activity,
    CheckCircle2,
    AlertTriangle
  } from "@lucide/svelte/icons";
  import BudgetMetricCard from "../budget-metric-card.svelte";
  import type { BudgetWithRelations } from "$lib/server/domains/budgets";
  import type { Category } from "$lib/schema/categories";
  import type { BudgetHealthStatus } from "$lib/schema/budgets";

  interface Props {
    budget: BudgetWithRelations;
    categories: Category[];
    class?: string;
  }

  let {
    budget,
    categories,
    class: className,
  }: Props = $props();

  // Budget metrics as individual derived variables
  const allocated = $derived(Math.abs((budget.metadata as any)?.allocatedAmount ?? 0));
  const latest = $derived(budget.periodTemplates?.[0]?.periods?.[0]);
  const spent = $derived(Math.abs(latest?.actualAmount ?? 0));
  const remaining = $derived(allocated - spent);
  const progressPercentage = $derived(allocated > 0 ? (spent / allocated) * 100 : 0);

  const daysInPeriod = $derived(30);
  const daysElapsed = $derived(15);
  const daysRemaining = $derived(daysInPeriod - daysElapsed);
  const burnRate = $derived(daysElapsed > 0 ? spent / daysElapsed : 0);

  const status = $derived.by((): BudgetHealthStatus => {
    if (progressPercentage > 100) return "danger";
    if (progressPercentage > 90) return "warning";
    if (progressPercentage > 75) return "good";
    return "excellent";
  });

  // Mock timeline data - in real implementation, this would come from transaction history
  const timelineEvents = $derived([
    {
      id: 1,
      type: "budget-created",
      title: "Budget Created",
      description: `Monthly budget of $${allocated.toFixed(2)} established`,
      amount: allocated,
      date: "2024-01-01",
      status: "success"
    },
    {
      id: 2,
      type: "spending",
      title: "Grocery Shopping",
      description: "Weekly grocery expenses",
      amount: -125.50,
      date: "2024-01-03",
      status: "normal"
    },
    {
      id: 3,
      type: "spending",
      title: "Gas Station",
      description: "Fuel expense",
      amount: -45.20,
      date: "2024-01-05",
      status: "normal"
    },
    {
      id: 4,
      type: "milestone",
      title: "25% Budget Used",
      description: "Reached quarter milestone",
      amount: allocated * 0.25,
      date: "2024-01-08",
      status: "info"
    },
    {
      id: 5,
      type: "spending",
      title: "Restaurant",
      description: "Dining out expense",
      amount: -67.80,
      date: "2024-01-10",
      status: "normal"
    },
    {
      id: 6,
      type: "alert",
      title: "High Spending Day",
      description: "Daily limit exceeded",
      amount: -200.00,
      date: "2024-01-12",
      status: "warning"
    },
    {
      id: 7,
      type: "milestone",
      title: "50% Budget Used",
      description: "Halfway through budget",
      amount: allocated * 0.5,
      date: "2024-01-15",
      status: "warning"
    }
  ]);

  const eventIconMap = new SvelteMap([
    ["budget-created", Target],
    ["spending", DollarSign],
    ["milestone", CheckCircle2],
    ["alert", AlertTriangle],
  ]);

  const eventColorMap = new SvelteMap([
    ["success", "text-green-500"],
    ["warning", "text-yellow-500"],
    ["danger", "text-red-500"],
    ["info", "text-blue-500"],
  ]);

  const getEventIcon = $derived((type: string) => eventIconMap.get(type) ?? Activity);
  const getEventColor = $derived((status: string) => eventColorMap.get(status) ?? "text-muted-foreground");
</script>

<div class="space-y-6 {className}">
  <!-- Current Status Summary -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
    <BudgetMetricCard
      title="Current Period"
      value={progressPercentage}
      format="percentage"
      subtitle="Budget used"
      icon={Target}
      status={status}
    />

    <BudgetMetricCard
      title="Daily Rate"
      value={burnRate}
      format="currency"
      subtitle="Average spending"
      icon={TrendingDown}
      status="good"
    />

    <BudgetMetricCard
      title="Days Remaining"
      value={daysRemaining}
      format="days"
      subtitle="In current period"
      icon={Calendar}
      status="good"
    />

    <BudgetMetricCard
      title="Projected End"
      value={burnRate * 30}
      format="currency"
      subtitle="Estimated total"
      icon={TrendingUp}
      status={burnRate * 30 <= allocated ? "good" : "warning"}
    />
  </div>

  <!-- Timeline View -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Timeline Events -->
    <div class="lg:col-span-2">
      <Card.Root>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <Clock class="h-5 w-5" />
            Budget Activity Timeline
          </Card.Title>
          <Card.Description>Chronological view of budget events and spending patterns</Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="relative">
            <!-- Timeline line -->
            <div class="absolute left-4 top-0 bottom-0 w-0.5 bg-border"></div>

            <!-- Timeline events -->
            <div class="space-y-6">
              {#each timelineEvents as event (event.id)}
                {@const Icon = getEventIcon(event.type)}
                <div class="relative flex items-start gap-4">
                  <!-- Timeline dot -->
                  <div class="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-card shadow">
                    {#if Icon}
                      <Icon class="h-4 w-4 {getEventColor(event.status)}" />
                    {/if}
                  </div>

                  <!-- Event content -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <h4 class="font-medium text-sm">{event.title}</h4>
                        <Badge variant={event.status === 'warning' ? 'destructive' : event.status === 'success' ? 'default' : 'secondary'} class="text-xs">
                          {event.type.replace('-', ' ')}
                        </Badge>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="text-sm {event.amount < 0 ? 'text-red-600' : 'text-green-600'}">
                          {event.amount < 0 ? '-' : '+'}${Math.abs(event.amount).toFixed(2)}
                        </span>
                        <span class="text-xs text-muted-foreground">{event.date}</span>
                      </div>
                    </div>
                    <p class="text-sm text-muted-foreground mt-1">{event.description}</p>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </Card.Content>
      </Card.Root>
    </div>

    <!-- Progress Insights Sidebar -->
    <div class="space-y-6">
      <!-- Progress Overview -->
      <Card.Root>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <Activity class="h-5 w-5" />
            Progress Insights
          </Card.Title>
        </Card.Header>
        <Card.Content class="space-y-4">
          <div class="space-y-3">
            <div>
              <div class="flex justify-between text-sm">
                <span>Budget Progress</span>
                <span>{progressPercentage.toFixed(1)}%</span>
              </div>
              <div class="w-full bg-secondary rounded-full h-2 mt-1">
                <div
                  class="h-2 rounded-full {status === 'danger' ? 'bg-red-500' : status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'}"
                  style="width: {Math.min(progressPercentage, 100)}%"
                ></div>
              </div>
            </div>

            <div>
              <div class="flex justify-between text-sm">
                <span>Time Progress</span>
                <span>{Math.round(((30 - daysRemaining) / 30) * 100)}%</span>
              </div>
              <div class="w-full bg-secondary rounded-full h-2 mt-1">
                <div
                  class="bg-blue-500 h-2 rounded-full"
                  style="width: {((30 - daysRemaining) / 30) * 100}%"
                ></div>
              </div>
            </div>
          </div>

          <div class="pt-4 border-t space-y-3">
            <div class="flex items-center gap-2">
              <AlertCircle class="h-4 w-4 text-blue-500" />
              <div class="text-sm">
                <p class="font-medium">Spending Pattern</p>
                <p class="text-muted-foreground">
                  {burnRate > (allocated / 30)
                    ? 'Above average daily spending'
                    : 'On track with spending goals'}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <TrendingUp class="h-4 w-4 text-green-500" />
              <div class="text-sm">
                <p class="font-medium">Recommendation</p>
                <p class="text-muted-foreground">
                  {remaining > 0
                    ? `$${(remaining / daysRemaining).toFixed(2)}/day available`
                    : 'Consider reducing spending'}
                </p>
              </div>
            </div>
          </div>
        </Card.Content>
      </Card.Root>

      <!-- Quick Actions -->
      <Card.Root>
        <Card.Header>
          <Card.Title>Quick Actions</Card.Title>
        </Card.Header>
        <Card.Content class="space-y-2">
          <Button variant="outline" size="sm" class="w-full justify-start">
            <DollarSign class="h-4 w-4 mr-2" />
            Add Transaction
          </Button>
          <Button variant="outline" size="sm" class="w-full justify-start">
            <Target class="h-4 w-4 mr-2" />
            Adjust Budget
          </Button>
          <Button variant="outline" size="sm" class="w-full justify-start">
            <Calendar class="h-4 w-4 mr-2" />
            View Calendar
          </Button>
        </Card.Content>
      </Card.Root>
    </div>
  </div>
</div>