<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import * as Card from "$lib/components/ui/card";
  import { Progress } from "$lib/components/ui/progress";
  import { cn, formatPercent } from "$lib/utils";
  import Activity from "@lucide/svelte/icons/activity";
  import Brain from "@lucide/svelte/icons/brain";
  import Gauge from "@lucide/svelte/icons/gauge";
  import TrendingUp from "@lucide/svelte/icons/trending-up";
  import Zap from "@lucide/svelte/icons/zap";

  interface ServiceStatus {
    name: string;
    status: "healthy" | "degraded" | "error" | "offline" | "no_data" | (string & {});
    lastCheck: string;
    responseTime: number;
    errorRate: number;
  }

  interface Props {
    overall: "healthy" | "degraded" | "critical" | (string & {});
    score: number;
    services: ServiceStatus[];
    metrics: {
      totalPredictions: number;
      averageAccuracy: number;
      averageResponseTime: number;
      errorRate: number;
    };
    class?: string;
  }

  let { overall, score, services, metrics, class: className }: Props = $props();

  const overallConfig = {
    healthy: {
      label: "All Systems Operational",
      color: "text-green-500",
      badgeVariant: "default" as const,
    },
    degraded: {
      label: "Some Systems Degraded",
      color: "text-yellow-500",
      badgeVariant: "secondary" as const,
    },
    critical: {
      label: "Critical Issues Detected",
      color: "text-red-500",
      badgeVariant: "destructive" as const,
    },
    // Fallback for unknown status
    unknown: {
      label: "Status Unknown",
      color: "text-muted-foreground",
      badgeVariant: "outline" as const,
    },
  } as const;

  type OverallKey = keyof typeof overallConfig;
  const config = $derived(
    overallConfig[overall as OverallKey] ?? overallConfig.unknown
  );
  const healthyServices = $derived(
    services.filter((s) => s.status === "healthy").length
  );
  const totalServices = $derived(services.length);

  // Helper to format service names: "anomalyDetection" → "Anomaly Detection"
  function formatServiceName(name: string): string {
    return name
      .replace(/([A-Z])/g, " $1") // Add space before capitals
      .replace(/^./, (c) => c.toUpperCase()) // Capitalize first letter
      .trim();
  }
</script>

<Card.Root class={cn("", className)}>
  <Card.Header>
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Brain class="text-primary h-5 w-5" />
        <Card.Title>ML System Health</Card.Title>
      </div>
      <Badge variant={config.badgeVariant}>{config.label}</Badge>
    </div>
    <Card.Description>
      {healthyServices}/{totalServices} services operational
    </Card.Description>
  </Card.Header>

  <Card.Content class="space-y-6">
    <!-- Health Score -->
    <div class="space-y-2">
      <div class="flex items-center justify-between text-sm">
        <span class="text-muted-foreground">Health Score</span>
        <span class="font-medium">{formatPercent(score)}</span>
      </div>
      <Progress value={score * 100} class="h-2" />
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
      <div class="space-y-1">
        <div class="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Zap class="h-3 w-3" />
          <span>Predictions</span>
        </div>
        <p class="text-lg font-semibold">{metrics.totalPredictions.toLocaleString()}</p>
      </div>

      <div class="space-y-1">
        <div class="text-muted-foreground flex items-center gap-1.5 text-xs">
          <TrendingUp class="h-3 w-3" />
          <span>Accuracy</span>
        </div>
        <p class="text-lg font-semibold">{formatPercent(metrics.averageAccuracy, 1)}</p>
      </div>

      <div class="space-y-1">
        <div class="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Gauge class="h-3 w-3" />
          <span>Avg Response</span>
        </div>
        <p class="text-lg font-semibold">{metrics.averageResponseTime}ms</p>
      </div>

      <div class="space-y-1">
        <div class="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Activity class="h-3 w-3" />
          <span>Error Rate</span>
        </div>
        <p class="text-lg font-semibold">{formatPercent(metrics.errorRate, 2)}</p>
      </div>
    </div>

    <!-- Service Status Grid -->
    <div class="space-y-2">
      <h4 class="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        Service Status
      </h4>
      <div class="grid grid-cols-2 gap-2">
        {#each services as service}
          {@const statusColors: Record<string, string> = {
            healthy: "bg-green-500",
            degraded: "bg-yellow-500",
            error: "bg-red-500",
            offline: "bg-red-500",
            no_data: "bg-muted-foreground",
          }}
          <div class="bg-muted/50 flex items-center gap-2 rounded-md px-3 py-2">
            <div class={cn("h-2 w-2 rounded-full", statusColors[service.status] ?? "bg-muted-foreground")}></div>
            <span class="text-sm">{formatServiceName(service.name)}</span>
          </div>
        {/each}
      </div>
    </div>
  </Card.Content>
</Card.Root>
