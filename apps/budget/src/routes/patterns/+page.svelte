<script lang="ts">
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import { Badge } from '$lib/components/ui/badge';
import { PatternList } from '$lib/components/patterns';
import { detectPatterns, listPatterns, deleteAllPatterns } from '$lib/query/patterns';
import { trpc } from '$lib/trpc/client';
import { SchedulesState } from '$lib/states/entities';
import Sparkles from '@lucide/svelte/icons/sparkles';
import RotateCw from '@lucide/svelte/icons/rotate-cw';
import TrendingUp from '@lucide/svelte/icons/trending-up';

// Pattern detection mutation
const detectMutation = detectPatterns.options();

// Delete all patterns mutation
const deleteAllMutation = deleteAllPatterns.options();

// Get patterns query
const patternsQuery = listPatterns().options();
const patterns = $derived(patternsQuery.data || []);

// Get schedules state for updating when patterns are converted
const schedulesState = SchedulesState.get();

// Run pattern detection
async function runPatternDetection() {
  await detectMutation.mutateAsync({});
  await patternsQuery.refetch();
}

// Clear all patterns and regenerate
async function clearAndRegeneratePatterns() {
  await deleteAllMutation.mutateAsync({});
  await detectMutation.mutateAsync({});
  await patternsQuery.refetch();
}

// Handle pattern conversion
async function handlePatternConvert(scheduleId: number) {
  await patternsQuery.refetch();

  // Fetch the newly created schedule and add it to the state
  const newSchedule = await trpc().scheduleRoutes.load.query({ id: scheduleId });
  schedulesState.addSchedule(newSchedule as any);
}

// Handle pattern dismissal
async function handlePatternDismiss() {
  await patternsQuery.refetch();
}
</script>

<svelte:head>
  <title>Pattern Detection - Budget App</title>
  <meta name="description" content="Detect and manage recurring patterns" />
</svelte:head>

<div class="container mx-auto p-6">
  <div class="mb-8">
    <h1 class="mb-2 text-3xl font-bold tracking-tight">Pattern Detection</h1>
    <p class="text-muted-foreground">
      Analyze your data to discover recurring patterns and insights
    </p>
  </div>

  <!-- Schedule Patterns - Active Feature -->
  <Card.Root class="border-primary/50 mb-8">
    <Card.Header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="bg-primary/10 rounded-lg p-2">
            <RotateCw class="text-primary h-6 w-6" />
          </div>
          <div>
            <Card.Title class="text-2xl">Schedule Patterns</Card.Title>
            <Card.Description class="mt-1">
              Discover recurring transactions and convert them to schedules
            </Card.Description>
          </div>
        </div>
        <div class="flex gap-2">
          <Button
            variant="outline"
            onclick={clearAndRegeneratePatterns}
            disabled={detectMutation.isPending || deleteAllMutation.isPending}>
            <RotateCw class="mr-2 h-4 w-4" />
            {detectMutation.isPending || deleteAllMutation.isPending
              ? 'Regenerating...'
              : 'Regenerate'}
          </Button>
          <Button onclick={runPatternDetection} disabled={detectMutation.isPending}>
            <Sparkles class="mr-2 h-4 w-4" />
            {detectMutation.isPending ? 'Detecting...' : 'Detect Patterns'}
          </Button>
        </div>
      </div>
    </Card.Header>
    <Card.Content class="pt-0">
      {#if patternsQuery.isLoading}
        <div class="p-8 text-center">
          <div
            class="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent">
          </div>
          <p class="text-muted-foreground text-sm">Loading patterns...</p>
        </div>
      {:else if patterns.length === 0 && !detectMutation.isPending}
        <div class="p-8 text-center">
          <TrendingUp class="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          <h3 class="mb-2 text-lg font-semibold">No patterns detected yet</h3>
          <p class="text-muted-foreground mb-4">
            Run pattern detection to analyze your transaction history and discover recurring
            patterns
          </p>
          <Button onclick={runPatternDetection} disabled={detectMutation.isPending}>
            <Sparkles class="mr-2 h-4 w-4" />
            {detectMutation.isPending ? 'Detecting...' : 'Detect Patterns'}
          </Button>
        </div>
      {:else}
        <PatternList
          {patterns}
          isLoading={patternsQuery.isLoading}
          onConvert={handlePatternConvert}
          onDismiss={handlePatternDismiss} />
      {/if}
    </Card.Content>
  </Card.Root>

  <!-- Coming Soon Patterns -->
  <div>
    <h2 class="mb-4 text-xl font-semibold">More Pattern Types Coming Soon</h2>
    <div class="grid gap-6 md:grid-cols-3">
      <!-- Spending Patterns -->
      <Card.Root class="relative overflow-hidden">
        <div class="absolute top-3 right-3">
          <Badge variant="outline" class="text-xs">Coming Soon</Badge>
        </div>
        <Card.Header>
          <div class="bg-muted mb-2 w-fit rounded-lg p-2">
            <TrendingUp class="text-muted-foreground h-5 w-5" />
          </div>
          <Card.Title class="text-lg">Spending Patterns</Card.Title>
          <Card.Description class="text-sm">
            Identify unusual spending habits and category trends
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <p class="text-muted-foreground text-sm">
            Analyze your spending to identify trends, anomalies, and opportunities to save
          </p>
        </Card.Content>
      </Card.Root>

      <!-- Budget Patterns -->
      <Card.Root class="relative overflow-hidden">
        <div class="absolute top-3 right-3">
          <Badge variant="outline" class="text-xs">Coming Soon</Badge>
        </div>
        <Card.Header>
          <div class="bg-muted mb-2 w-fit rounded-lg p-2">
            <TrendingUp class="text-muted-foreground h-5 w-5" />
          </div>
          <Card.Title class="text-lg">Budget Patterns</Card.Title>
          <Card.Description class="text-sm">
            Suggest budget adjustments based on spending history
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <p class="text-muted-foreground text-sm">
            Get intelligent budget recommendations based on your historical spending patterns
          </p>
        </Card.Content>
      </Card.Root>

      <!-- Category Patterns -->
      <Card.Root class="relative overflow-hidden">
        <div class="absolute top-3 right-3">
          <Badge variant="outline" class="text-xs">Coming Soon</Badge>
        </div>
        <Card.Header>
          <div class="bg-muted mb-2 w-fit rounded-lg p-2">
            <TrendingUp class="text-muted-foreground h-5 w-5" />
          </div>
          <Card.Title class="text-lg">Category Patterns</Card.Title>
          <Card.Description class="text-sm">
            Automatic transaction categorization suggestions
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <p class="text-muted-foreground text-sm">
            Learn from your categorization habits to auto-categorize similar transactions
          </p>
        </Card.Content>
      </Card.Root>
    </div>
  </div>
</div>
