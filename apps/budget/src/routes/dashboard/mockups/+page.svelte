<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as Tabs from '$lib/components/ui/tabs';
import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
import Calendar from '@lucide/svelte/icons/calendar';
import CalendarDays from '@lucide/svelte/icons/calendar-days';
import Clock from '@lucide/svelte/icons/clock';
import Columns2 from '@lucide/svelte/icons/columns-2';
import FileText from '@lucide/svelte/icons/file-text';
import LayoutGrid from '@lucide/svelte/icons/layout-grid';
import LayoutList from '@lucide/svelte/icons/layout-list';
import Sparkles from '@lucide/svelte/icons/sparkles';
import Smartphone from '@lucide/svelte/icons/smartphone';
import TableIcon from '@lucide/svelte/icons/table';
import Target from '@lucide/svelte/icons/target';
import Wallet from '@lucide/svelte/icons/wallet';

let activeMockup = $state('executive');

const headlineCards = [
  { label: 'Cash Position', value: '$24,860', delta: '+4.2% vs last month', tone: 'positive' },
  { label: 'Budget Coverage', value: '87%', delta: '3 categories near limit', tone: 'warning' },
  { label: 'Scheduled Outflow', value: '$3,140', delta: 'Next 14 days', tone: 'neutral' },
  { label: 'Savings Momentum', value: '$1,320', delta: 'On pace for goal', tone: 'positive' },
] as const;

const budgetLanes = [
  { name: 'Housing', spent: 1640, limit: 1800 },
  { name: 'Food', spent: 620, limit: 750 },
  { name: 'Transportation', spent: 290, limit: 400 },
  { name: 'Fun', spent: 480, limit: 450 },
] as const;

const alertStream = [
  { level: 'high', message: 'Fun budget is over by $30' },
  { level: 'medium', message: 'Insurance auto-pay in 3 days' },
  { level: 'low', message: '2 uncategorized transactions need review' },
] as const;

const dailyFlow = [120, 190, 170, 220, 160, 145, 210];

const flowBands = [
  { label: 'Recurring', amount: '$2,460', variance: '-2.1%' },
  { label: 'Variable', amount: '$1,890', variance: '+8.4%' },
  { label: 'Transfers', amount: '$840', variance: '+0.5%' },
] as const;

const operatorQueue = [
  { title: 'Category cleanup', owner: 'Rules engine', eta: '8 min' },
  { title: 'Duplicate payees', owner: 'Assistant', eta: '12 min' },
  { title: 'Budget rebalance', owner: 'Budget planner', eta: '15 min' },
] as const;

const goalTracks = [
  { name: 'Emergency fund', current: 8600, target: 12000, deadline: 'Sep 2026' },
  { name: 'Vacation', current: 2200, target: 3500, deadline: 'Jul 2026' },
  { name: 'Debt payoff', current: 4100, target: 6000, deadline: 'Nov 2026' },
] as const;

const timelineMilestones = [
  { week: 'W1', title: 'Rent + utilities', amount: '$2,150', state: 'locked' },
  { week: 'W2', title: 'Insurance + debt payment', amount: '$940', state: 'planned' },
  { week: 'W3', title: 'Travel sinking fund', amount: '$380', state: 'optional' },
  { week: 'W4', title: 'Month-end sweep', amount: '$510', state: 'planned' },
] as const;

const spendingHeatmap = [
  [1, 2, 0, 1, 3, 2, 1],
  [0, 1, 1, 2, 4, 3, 1],
  [2, 2, 1, 1, 3, 2, 0],
  [1, 0, 2, 3, 4, 2, 1],
] as const;

const consoleRows = [
  { workflow: 'Categorization', queue: 24, successRate: 98, lag: '1m' },
  { workflow: 'Budget alerts', queue: 9, successRate: 95, lag: '45s' },
  { workflow: 'Recurring sync', queue: 5, successRate: 100, lag: '12s' },
  { workflow: 'Anomaly scan', queue: 2, successRate: 93, lag: '2m' },
] as const;

const mobileCards = [
  { label: 'Needs Attention', value: '3 items', detail: '2 over-budget, 1 uncategorized' },
  { label: 'Today to Review', value: '$162', detail: '7 transactions since midnight' },
  { label: 'Safe to Spend', value: '$410', detail: 'After fixed costs through Friday' },
] as const;

const kpiWallTiles = [
  {
    title: 'Liquidity Runway',
    metric: '142 days',
    signal: 'Stable',
    tone: 'cool',
  },
  {
    title: 'Expense Volatility',
    metric: '11.8%',
    signal: 'Watch',
    tone: 'warm',
  },
  {
    title: 'Goal Funding Ratio',
    metric: '0.73',
    signal: 'Rising',
    tone: 'cool',
  },
  {
    title: 'Debt Pressure Index',
    metric: '31',
    signal: 'Contained',
    tone: 'neutral',
  },
  {
    title: 'Automation Coverage',
    metric: '89%',
    signal: 'Healthy',
    tone: 'cool',
  },
  {
    title: 'Manual Review Load',
    metric: '26 txns',
    signal: 'Elevated',
    tone: 'warm',
  },
] as const;

const narrativeSections = [
  {
    heading: 'Executive Summary',
    body: 'Cash remains healthy while discretionary spend accelerated during the last two weeks. Your fixed obligations are fully covered this period.',
  },
  {
    heading: 'What Changed',
    body: 'Dining and entertainment categories climbed 14% month-over-month. Recurring payments stayed flat and expected.',
  },
  {
    heading: 'Recommended Response',
    body: 'Shift $120 from discretionary envelopes into grocery and transportation. Keep savings transfer cadence unchanged.',
  },
  {
    heading: 'Risk Outlook',
    body: 'No immediate liquidity risk. The main watch item is entertainment spend crossing budget caps in the next 6-9 days.',
  },
] as const;

const kanbanColumns = [
  {
    title: 'Needs Triage',
    cards: [
      { title: 'Uncategorized grocery split', owner: 'Rule engine', impact: 'Medium' },
      { title: 'ATM withdrawal label', owner: 'Manual', impact: 'Low' },
    ],
  },
  {
    title: 'In Progress',
    cards: [
      { title: 'Rebalance food envelope', owner: 'Budget planner', impact: 'High' },
      { title: 'Recurring utility check', owner: 'Automation', impact: 'Medium' },
    ],
  },
  {
    title: 'Ready to Apply',
    cards: [
      { title: 'Increase insurance cap +5%', owner: 'Assistant', impact: 'High' },
      { title: 'Merge duplicate payees', owner: 'Assistant', impact: 'Medium' },
    ],
  },
  {
    title: 'Done',
    cards: [
      { title: 'Schedule sync complete', owner: 'Automation', impact: 'Low' },
      { title: 'Debt payment posted', owner: 'System', impact: 'High' },
    ],
  },
] as const;

function toPercent(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.round((value / max) * 100));
}

function meterTone(percent: number): string {
  if (percent >= 100) return 'bg-red-500';
  if (percent >= 85) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function deltaClass(tone: string): string {
  if (tone === 'positive') return 'text-emerald-600';
  if (tone === 'warning') return 'text-amber-600';
  return 'text-muted-foreground';
}

function heatClass(value: number): string {
  if (value >= 4) return 'bg-emerald-600/90';
  if (value === 3) return 'bg-emerald-500/70';
  if (value === 2) return 'bg-emerald-400/55';
  if (value === 1) return 'bg-emerald-300/40';
  return 'bg-muted';
}

function tileClass(tone: string): string {
  if (tone === 'cool') return 'from-emerald-500/20 to-sky-500/20 border-emerald-500/40';
  if (tone === 'warm') return 'from-amber-500/20 to-orange-500/20 border-amber-500/40';
  return 'from-muted/40 to-muted/20 border-border';
}
</script>

<svelte:head>
  <title>Dashboard Mockups - Budget App</title>
  <meta
    name="description"
    content="Alternate dashboard configuration mockups for layout exploration and user testing." />
</svelte:head>

<div class="space-y-6">
  <section
    class="dark:via-background relative overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-6 dark:from-emerald-950/20 dark:to-sky-950/20">
    <div class="absolute top-0 right-0 h-24 w-24 rounded-full bg-emerald-300/20 blur-2xl"></div>
    <div class="absolute bottom-0 left-0 h-28 w-28 rounded-full bg-sky-300/20 blur-2xl"></div>
    <div class="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
          <LayoutGrid class="h-8 w-8 text-emerald-600" />
          Dashboard Mockups
        </h1>
        <p class="text-muted-foreground mt-1">
          Ten alternate dashboard configurations for information hierarchy testing.
        </p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" href="/">
          <ArrowLeft class="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    </div>
  </section>

  <Tabs.Root bind:value={activeMockup} class="w-full">
    <Tabs.List class="grid w-full grid-cols-2 gap-1 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-10">
      <Tabs.Trigger value="executive" class="flex items-center gap-2">
        <Sparkles class="h-4 w-4" />
        Executive Snapshot
      </Tabs.Trigger>
      <Tabs.Trigger value="operator" class="flex items-center gap-2">
        <LayoutGrid class="h-4 w-4" />
        Operator Grid
      </Tabs.Trigger>
      <Tabs.Trigger value="planner" class="flex items-center gap-2">
        <LayoutList class="h-4 w-4" />
        Goal Planner
      </Tabs.Trigger>
      <Tabs.Trigger value="finalist" class="flex items-center gap-2">
        <Sparkles class="h-4 w-4" />
        Hybrid Finalist
      </Tabs.Trigger>
      <Tabs.Trigger value="timeline" class="flex items-center gap-2">
        <CalendarDays class="h-4 w-4" />
        Timeline Board
      </Tabs.Trigger>
      <Tabs.Trigger value="console" class="flex items-center gap-2">
        <TableIcon class="h-4 w-4" />
        Command Console
      </Tabs.Trigger>
      <Tabs.Trigger value="mobile" class="flex items-center gap-2">
        <Smartphone class="h-4 w-4" />
        Mobile Stack
      </Tabs.Trigger>
      <Tabs.Trigger value="kpiwall" class="flex items-center gap-2">
        <BarChart3 class="h-4 w-4" />
        KPI Wall
      </Tabs.Trigger>
      <Tabs.Trigger value="narrative" class="flex items-center gap-2">
        <FileText class="h-4 w-4" />
        Narrative Report
      </Tabs.Trigger>
      <Tabs.Trigger value="kanban" class="flex items-center gap-2">
        <Columns2 class="h-4 w-4" />
        Kanban Workflow
      </Tabs.Trigger>
    </Tabs.List>

    <Tabs.Content value="executive" class="mt-4 space-y-4">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {#each headlineCards as card, idx}
          <Card.Root class="mockup-rise" style={`animation-delay: ${idx * 45}ms`}>
            <Card.Header class="pb-2">
              <Card.Title class="text-sm font-medium">{card.label}</Card.Title>
            </Card.Header>
            <Card.Content>
              <div class="text-2xl font-bold">{card.value}</div>
              <p class={`mt-1 text-xs ${deltaClass(card.tone)}`}>{card.delta}</p>
            </Card.Content>
          </Card.Root>
        {/each}
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card.Root class="lg:col-span-2">
          <Card.Header>
            <Card.Title class="flex items-center gap-2">
              <Wallet class="h-4 w-4 text-emerald-600" />
              Budget Lanes
            </Card.Title>
            <Card.Description>At-a-glance consumption by major spend groups.</Card.Description>
          </Card.Header>
          <Card.Content class="space-y-4">
            {#each budgetLanes as lane}
              {@const usage = toPercent(lane.spent, lane.limit)}
              <div class="space-y-1.5">
                <div class="flex items-center justify-between text-sm">
                  <span class="font-medium">{lane.name}</span>
                  <span class="text-muted-foreground">${lane.spent} / ${lane.limit}</span>
                </div>
                <div class="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    class={`h-full rounded-full transition-all duration-300 ${meterTone(usage)}`}
                    style={`width: ${usage}%`}>
                  </div>
                </div>
              </div>
            {/each}
          </Card.Content>
        </Card.Root>

        <Card.Root>
          <Card.Header>
            <Card.Title class="flex items-center gap-2">
              <AlertTriangle class="h-4 w-4 text-amber-600" />
              Alert Stream
            </Card.Title>
            <Card.Description>Priority events for the next 72 hours.</Card.Description>
          </Card.Header>
          <Card.Content class="space-y-2">
            {#each alertStream as item}
              <div class="bg-muted/40 rounded-lg border px-3 py-2">
                <div class="flex items-center justify-between">
                  <Badge variant={item.level === 'high' ? 'destructive' : 'secondary'}>
                    {item.level}
                  </Badge>
                  <Clock class="text-muted-foreground h-3.5 w-3.5" />
                </div>
                <p class="mt-2 text-sm">{item.message}</p>
              </div>
            {/each}
          </Card.Content>
        </Card.Root>
      </div>

      <Card.Root>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <BarChart3 class="h-4 w-4 text-sky-600" />
            7-Day Cash Pulse
          </Card.Title>
          <Card.Description>Simple trend lane for quick morning review.</Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="grid grid-cols-7 gap-2">
            {#each dailyFlow as point}
              <div class="flex flex-col items-center gap-2">
                <div class="bg-muted relative h-28 w-full overflow-hidden rounded-md">
                  <div
                    class="absolute bottom-0 w-full bg-gradient-to-t from-sky-500 to-emerald-400"
                    style={`height: ${toPercent(point, 240)}%`}>
                  </div>
                </div>
                <span class="text-muted-foreground text-xs">${point}</span>
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    </Tabs.Content>

    <Tabs.Content value="operator" class="mt-4 space-y-4">
      <div class="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card.Root class="xl:col-span-5">
          <Card.Header>
            <Card.Title class="flex items-center gap-2">
              <BarChart3 class="h-4 w-4 text-emerald-600" />
              Flow Bands
            </Card.Title>
            <Card.Description>Dense panel for daily operating checks.</Card.Description>
          </Card.Header>
          <Card.Content class="space-y-3">
            {#each flowBands as band}
              <div class="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div class="text-sm font-medium">{band.label}</div>
                  <div class="text-muted-foreground text-xs">Current month</div>
                </div>
                <div class="text-right">
                  <div class="font-semibold">{band.amount}</div>
                  <div class="text-xs text-emerald-600">{band.variance}</div>
                </div>
              </div>
            {/each}
          </Card.Content>
        </Card.Root>

        <Card.Root class="xl:col-span-4">
          <Card.Header>
            <Card.Title class="flex items-center gap-2">
              <Calendar class="h-4 w-4 text-sky-600" />
              Action Queue
            </Card.Title>
            <Card.Description>Tasks prioritized by automation confidence.</Card.Description>
          </Card.Header>
          <Card.Content class="space-y-2">
            {#each operatorQueue as task}
              <div class="bg-muted/40 rounded-md border p-3">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium">{task.title}</span>
                  <Badge variant="outline">{task.eta}</Badge>
                </div>
                <p class="text-muted-foreground mt-1 text-xs">{task.owner}</p>
              </div>
            {/each}
          </Card.Content>
        </Card.Root>

        <Card.Root class="xl:col-span-3">
          <Card.Header>
            <Card.Title class="flex items-center gap-2">
              <Sparkles class="h-4 w-4 text-amber-600" />
              Suggested Actions
            </Card.Title>
            <Card.Description>Quick wins generated from trend shifts.</Card.Description>
          </Card.Header>
          <Card.Content class="space-y-2 text-sm">
            <div class="rounded-md border p-3">Move $120 from Fun to Food.</div>
            <div class="rounded-md border p-3">Increase Utilities cap by 8%.</div>
            <div class="rounded-md border p-3">Enable weekly category sweep.</div>
            <Button class="mt-1 w-full" variant="outline">Apply Top Recommendation</Button>
          </Card.Content>
        </Card.Root>
      </div>
    </Tabs.Content>

    <Tabs.Content value="planner" class="mt-4 space-y-4">
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card.Root class="lg:col-span-2">
          <Card.Header>
            <Card.Title class="flex items-center gap-2">
              <Target class="h-4 w-4 text-emerald-600" />
              Goal Tracks
            </Card.Title>
            <Card.Description>Long-range planning view with target pacing.</Card.Description>
          </Card.Header>
          <Card.Content class="space-y-4">
            {#each goalTracks as goal}
              {@const progress = toPercent(goal.current, goal.target)}
              <div class="space-y-1.5">
                <div class="flex items-center justify-between text-sm">
                  <span class="font-medium">{goal.name}</span>
                  <span class="text-muted-foreground">{goal.deadline}</span>
                </div>
                <div class="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    class="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500"
                    style={`width: ${progress}%`}>
                  </div>
                </div>
                <div class="text-muted-foreground flex items-center justify-between text-xs">
                  <span>${goal.current.toLocaleString()} saved</span>
                  <span>${goal.target.toLocaleString()} target</span>
                </div>
              </div>
            {/each}
          </Card.Content>
        </Card.Root>

        <Card.Root>
          <Card.Header>
            <Card.Title class="flex items-center gap-2">
              <Wallet class="h-4 w-4 text-sky-600" />
              Planning Controls
            </Card.Title>
            <Card.Description>Scenario cards for monthly planning meetings.</Card.Description>
          </Card.Header>
          <Card.Content class="space-y-3">
            <div class="rounded-lg border p-3">
              <div class="text-sm font-medium">Base Plan</div>
              <div class="text-muted-foreground text-xs">
                Current allocations with no transfers.
              </div>
            </div>
            <div
              class="rounded-lg border border-emerald-500/40 bg-emerald-50/50 p-3 dark:bg-emerald-950/10">
              <div class="text-sm font-medium">Deficit Recovery</div>
              <div class="text-xs text-emerald-700 dark:text-emerald-400">
                Pause discretionary spend, restore in 2 periods.
              </div>
            </div>
            <div class="rounded-lg border p-3">
              <div class="text-sm font-medium">Acceleration</div>
              <div class="text-muted-foreground text-xs">Add 6% to savings contribution rate.</div>
            </div>
          </Card.Content>
        </Card.Root>
      </div>
    </Tabs.Content>

    <Tabs.Content value="finalist" class="mt-4 space-y-4">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {#each headlineCards as card}
          <Card.Root>
            <Card.Header class="pb-2">
              <Card.Title class="text-sm font-medium">{card.label}</Card.Title>
            </Card.Header>
            <Card.Content>
              <div class="text-2xl font-bold">{card.value}</div>
              <p class={`mt-1 text-xs ${deltaClass(card.tone)}`}>{card.delta}</p>
            </Card.Content>
          </Card.Root>
        {/each}
      </div>

      <div class="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card.Root class="xl:col-span-5">
          <Card.Header>
            <Card.Title class="flex items-center gap-2">
              <Target class="h-4 w-4 text-emerald-600" />
              Goal Progress
            </Card.Title>
            <Card.Description>Planner-style targets with deadline visibility.</Card.Description>
          </Card.Header>
          <Card.Content class="space-y-4">
            {#each goalTracks as goal}
              {@const progress = toPercent(goal.current, goal.target)}
              <div class="space-y-1.5">
                <div class="flex items-center justify-between text-sm">
                  <span class="font-medium">{goal.name}</span>
                  <span class="text-muted-foreground">{goal.deadline}</span>
                </div>
                <div class="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    class="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500"
                    style={`width: ${progress}%`}>
                  </div>
                </div>
                <div class="text-muted-foreground flex items-center justify-between text-xs">
                  <span>${goal.current.toLocaleString()} saved</span>
                  <span>${goal.target.toLocaleString()} target</span>
                </div>
              </div>
            {/each}
          </Card.Content>
        </Card.Root>

        <Card.Root class="xl:col-span-7">
          <Card.Header>
            <Card.Title class="flex items-center gap-2">
              <FileText class="h-4 w-4 text-sky-600" />
              Narrative Summary
            </Card.Title>
            <Card.Description>Briefing blocks for fast weekly context.</Card.Description>
          </Card.Header>
          <Card.Content class="space-y-3">
            {#each narrativeSections.slice(0, 3) as section}
              <section class="bg-muted/30 rounded-lg border p-3">
                <h3 class="text-sm font-semibold">{section.heading}</h3>
                <p class="text-muted-foreground mt-1 text-sm">{section.body}</p>
              </section>
            {/each}
          </Card.Content>
        </Card.Root>
      </div>

      <Card.Root>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <Columns2 class="h-4 w-4 text-emerald-600" />
            Action Board
          </Card.Title>
          <Card.Description>Kanban lane for operational next steps.</Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="grid grid-cols-1 gap-3 xl:grid-cols-4">
            {#each kanbanColumns as column}
              <div class="bg-muted/40 rounded-xl border p-3">
                <div class="mb-2 flex items-center justify-between">
                  <h3 class="text-sm font-semibold">{column.title}</h3>
                  <Badge variant="outline">{column.cards.length}</Badge>
                </div>
                <div class="space-y-2">
                  {#each column.cards.slice(0, 1) as card}
                    <div class="bg-background rounded-lg border p-3">
                      <div class="text-sm font-medium">{card.title}</div>
                      <div class="text-muted-foreground mt-1 text-xs">{card.owner}</div>
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    </Tabs.Content>

    <Tabs.Content value="timeline" class="mt-4 space-y-4">
      <div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card.Root class="xl:col-span-2">
          <Card.Header>
            <Card.Title class="flex items-center gap-2">
              <CalendarDays class="h-4 w-4 text-emerald-600" />
              Monthly Timeline Board
            </Card.Title>
            <Card.Description
              >Week-by-week obligations and flex-spend checkpoints.</Card.Description>
          </Card.Header>
          <Card.Content class="space-y-3">
            {#each timelineMilestones as milestone}
              <div class="flex items-center justify-between rounded-lg border p-3">
                <div class="flex items-center gap-3">
                  <Badge variant="outline">{milestone.week}</Badge>
                  <div>
                    <div class="text-sm font-medium">{milestone.title}</div>
                    <div class="text-muted-foreground text-xs capitalize">{milestone.state}</div>
                  </div>
                </div>
                <div class="font-semibold">{milestone.amount}</div>
              </div>
            {/each}
          </Card.Content>
        </Card.Root>

        <Card.Root>
          <Card.Header>
            <Card.Title class="flex items-center gap-2">
              <BarChart3 class="h-4 w-4 text-sky-600" />
              Spend Intensity
            </Card.Title>
            <Card.Description>Calendar heat blocks for daily outflow.</Card.Description>
          </Card.Header>
          <Card.Content class="space-y-2">
            {#each spendingHeatmap as row}
              <div class="grid grid-cols-7 gap-1">
                {#each row as cell}
                  <div class={`h-7 rounded ${heatClass(cell)}`}></div>
                {/each}
              </div>
            {/each}
            <div class="text-muted-foreground pt-2 text-xs">
              Darker blocks indicate heavier spend.
            </div>
          </Card.Content>
        </Card.Root>
      </div>
    </Tabs.Content>

    <Tabs.Content value="console" class="mt-4 space-y-4">
      <Card.Root>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <TableIcon class="h-4 w-4 text-emerald-600" />
            Workflow Command Console
          </Card.Title>
          <Card.Description>Table-first operations view for power users.</Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="overflow-x-auto rounded-lg border">
            <table class="w-full min-w-[640px] text-sm">
              <thead class="bg-muted/60 text-left">
                <tr>
                  <th class="px-3 py-2 font-medium">Workflow</th>
                  <th class="px-3 py-2 font-medium">Queue</th>
                  <th class="px-3 py-2 font-medium">Success</th>
                  <th class="px-3 py-2 font-medium">Lag</th>
                  <th class="px-3 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {#each consoleRows as row}
                  <tr class="border-t">
                    <td class="px-3 py-2 font-medium">{row.workflow}</td>
                    <td class="px-3 py-2">{row.queue}</td>
                    <td class="px-3 py-2">
                      <span class="text-emerald-600">{row.successRate}%</span>
                    </td>
                    <td class="px-3 py-2">{row.lag}</td>
                    <td class="px-3 py-2">
                      <Button variant="outline" size="sm">Inspect</Button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </Card.Content>
      </Card.Root>

      <Card.Root class="border-dashed">
        <Card.Header>
          <Card.Title class="text-sm">Operator Notes</Card.Title>
          <Card.Description
            >Console variant keeps navigation minimal and action density high.</Card.Description>
        </Card.Header>
      </Card.Root>
    </Tabs.Content>

    <Tabs.Content value="mobile" class="mt-4 space-y-4">
      <div class="mx-auto max-w-sm space-y-3">
        <Card.Root
          class="border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-50 to-sky-50 dark:from-emerald-950/20 dark:to-sky-950/20">
          <Card.Header class="pb-2">
            <Card.Title class="flex items-center gap-2 text-base">
              <Smartphone class="h-4 w-4 text-emerald-600" />
              Mobile Priority Feed
            </Card.Title>
          </Card.Header>
          <Card.Content class="space-y-2">
            {#each mobileCards as card}
              <div class="bg-background/80 rounded-lg border p-3">
                <div class="text-muted-foreground text-xs">{card.label}</div>
                <div class="text-lg font-semibold">{card.value}</div>
                <div class="text-muted-foreground text-xs">{card.detail}</div>
              </div>
            {/each}
            <div class="grid grid-cols-2 gap-2 pt-1">
              <Button size="sm">Review</Button>
              <Button size="sm" variant="outline">Defer</Button>
            </div>
          </Card.Content>
        </Card.Root>
      </div>
    </Tabs.Content>

    <Tabs.Content value="kpiwall" class="mt-4 space-y-4">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {#each kpiWallTiles as tile}
          <Card.Root class={`border bg-gradient-to-br ${tileClass(tile.tone)}`}>
            <Card.Header class="pb-2">
              <Card.Title class="text-sm font-medium">{tile.title}</Card.Title>
            </Card.Header>
            <Card.Content>
              <div class="text-3xl font-black tracking-tight">{tile.metric}</div>
              <div class="text-muted-foreground mt-1 text-xs">{tile.signal}</div>
            </Card.Content>
          </Card.Root>
        {/each}
      </div>

      <Card.Root class="border-dashed">
        <Card.Header>
          <Card.Title>Wall Notes</Card.Title>
          <Card.Description>
            This concept prioritizes top-level health indicators over drill-down detail.
          </Card.Description>
        </Card.Header>
      </Card.Root>
    </Tabs.Content>

    <Tabs.Content value="narrative" class="mt-4 space-y-4">
      <Card.Root
        class="dark:via-background border-2 border-sky-500/40 bg-gradient-to-br from-sky-50 via-white to-emerald-50 dark:from-sky-950/20 dark:to-emerald-950/20">
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <FileText class="h-4 w-4 text-sky-600" />
            Narrative Report View
          </Card.Title>
          <Card.Description>
            A briefing-style dashboard for weekly review and decision-making.
          </Card.Description>
        </Card.Header>
        <Card.Content class="space-y-3">
          {#each narrativeSections as section}
            <section class="bg-background/70 rounded-lg border p-4">
              <h3 class="text-sm font-semibold tracking-wide">{section.heading}</h3>
              <p class="text-muted-foreground mt-1 text-sm leading-relaxed">{section.body}</p>
            </section>
          {/each}
          <div class="flex flex-wrap gap-2 pt-2">
            <Button size="sm">Generate Full Brief</Button>
            <Button size="sm" variant="outline">Share Snapshot</Button>
          </div>
        </Card.Content>
      </Card.Root>
    </Tabs.Content>

    <Tabs.Content value="kanban" class="mt-4 space-y-4">
      <Card.Root>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <Columns2 class="h-4 w-4 text-emerald-600" />
            Kanban Workflow Board
          </Card.Title>
          <Card.Description>Task-state layout for operational budgeting teams.</Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="grid grid-cols-1 gap-3 xl:grid-cols-4">
            {#each kanbanColumns as column}
              <div class="bg-muted/40 rounded-xl border p-3">
                <div class="mb-2 flex items-center justify-between">
                  <h3 class="text-sm font-semibold">{column.title}</h3>
                  <Badge variant="outline">{column.cards.length}</Badge>
                </div>
                <div class="space-y-2">
                  {#each column.cards as card}
                    <div class="bg-background rounded-lg border p-3">
                      <div class="text-sm font-medium">{card.title}</div>
                      <div class="text-muted-foreground mt-1 text-xs">{card.owner}</div>
                      <div class="pt-2">
                        <Badge variant="secondary">{card.impact}</Badge>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    </Tabs.Content>
  </Tabs.Root>
</div>

<style>
.mockup-rise {
  animation: rise 320ms ease-out both;
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
