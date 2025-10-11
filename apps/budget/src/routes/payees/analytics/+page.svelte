<script lang="ts">
import PayeeAnalyticsDashboard from '../(components)/analytics/payee-analytics-dashboard.svelte';
import {Button} from '$lib/components/ui/button';
import {Badge} from '$lib/components/ui/badge';
import * as Card from '$lib/components/ui/card';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
import Brain from '@lucide/svelte/icons/brain';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import Users from '@lucide/svelte/icons/users';

// Page metadata
const title = 'Payee Analytics Dashboard';
const description = 'Comprehensive analytics and insights across all payees with ML-powered recommendations';
</script>

<svelte:head>
  <title>{title} - Budget App</title>
  <meta name="description" content={description} />
</svelte:head>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="sm" href="/payees" class="p-2">
        <ArrowLeft class="h-4 w-4" />
        <span class="sr-only">Back to Payees</span>
      </Button>
      <div>
        <h1 class="text-3xl font-bold tracking-tight">{title}</h1>
        <p class="text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
    <Badge variant="secondary" class="flex items-center gap-2">
      <Brain class="h-4 w-4" />
      AI-Powered Analytics
    </Badge>
  </div>

  <!-- Overview Cards -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Total Insights</Card.Title>
        <BarChart3 class="h-4 w-4 text-muted-foreground" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">Comprehensive</div>
        <p class="text-xs text-muted-foreground">
          ML-powered payee intelligence
        </p>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Analytics Scope</Card.Title>
        <Users class="h-4 w-4 text-muted-foreground" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">All Payees</div>
        <p class="text-xs text-muted-foreground">
          Cross-payee pattern analysis
        </p>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Intelligence Level</Card.Title>
        <TrendingUp class="h-4 w-4 text-muted-foreground" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">Advanced</div>
        <p class="text-xs text-muted-foreground">
          Real-time ML insights
        </p>
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Main Analytics Dashboard -->
  <PayeeAnalyticsDashboard showOverallAnalytics={true} timeframe="12" />
</div>