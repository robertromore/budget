<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import * as Card from "$lib/components/ui/card";
  import { cn, formatPercent } from "$lib/utils";
  import Activity from "@lucide/svelte/icons/activity";
  import AlertTriangle from "@lucide/svelte/icons/alert-triangle";
  import CheckCircle2 from "@lucide/svelte/icons/check-circle-2";
  import CircleDashed from "@lucide/svelte/icons/circle-dashed";
  import Clock from "@lucide/svelte/icons/clock";
  import WifiOff from "@lucide/svelte/icons/wifi-off";
  import XCircle from "@lucide/svelte/icons/x-circle";

  interface Props {
    serviceName: string;
    status: "healthy" | "degraded" | "error" | "offline" | "no_data" | (string & {});
    metrics?: {
      modelsLoaded?: number;
      predictionLatencyMs?: number;
      errorRate?: number;
      accuracy?: number;
    };
    issues?: string[];
    lastCheck?: string;
    class?: string;
  }

  let {
    serviceName,
    status,
    metrics,
    issues = [],
    lastCheck,
    class: className,
  }: Props = $props();

  const statusConfig = {
    healthy: {
      icon: CheckCircle2,
      variant: "default" as const,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      label: "Healthy",
    },
    degraded: {
      icon: AlertTriangle,
      variant: "secondary" as const,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      label: "Degraded",
    },
    error: {
      icon: XCircle,
      variant: "destructive" as const,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      label: "Error",
    },
    offline: {
      icon: WifiOff,
      variant: "outline" as const,
      color: "text-muted-foreground",
      bgColor: "bg-muted/10",
      label: "Offline",
    },
    no_data: {
      icon: CircleDashed,
      variant: "outline" as const,
      color: "text-muted-foreground",
      bgColor: "bg-muted/10",
      label: "No Data",
    },
    // Fallback for unknown status values
    unknown: {
      icon: Activity,
      variant: "outline" as const,
      color: "text-muted-foreground",
      bgColor: "bg-muted/10",
      label: "Unknown",
    },
  } as const;

  type StatusKey = keyof typeof statusConfig;
  const config = $derived(
    statusConfig[status as StatusKey] ?? statusConfig.unknown
  );
</script>

<Card.Root class={cn("relative overflow-hidden", className)}>
  <div class={cn("absolute inset-0 opacity-5", config.bgColor)}></div>
  <Card.Header class="relative pb-2">
    <div class="flex items-center justify-between">
      <Card.Title class="text-sm font-medium">{serviceName}</Card.Title>
      <Badge variant={config.variant}>
        <config.icon class="mr-1 h-3 w-3" />
        {config.label}
      </Badge>
    </div>
  </Card.Header>

  <Card.Content class="relative space-y-3">
    {#if metrics}
      <div class="grid grid-cols-2 gap-2 text-xs">
        {#if metrics.modelsLoaded !== undefined}
          <div class="flex items-center gap-1.5">
            <Activity class="text-muted-foreground h-3 w-3" />
            <span class="text-muted-foreground">Models:</span>
            <span class="font-medium">{metrics.modelsLoaded}</span>
          </div>
        {/if}

        {#if metrics.predictionLatencyMs !== undefined}
          <div class="flex items-center gap-1.5">
            <Clock class="text-muted-foreground h-3 w-3" />
            <span class="text-muted-foreground">Latency:</span>
            <span class="font-medium">{metrics.predictionLatencyMs}ms</span>
          </div>
        {/if}

        {#if metrics.accuracy !== undefined}
          <div class="flex items-center gap-1.5">
            <CheckCircle2 class="text-muted-foreground h-3 w-3" />
            <span class="text-muted-foreground">Accuracy:</span>
            <span class="font-medium">{formatPercent(metrics.accuracy, 1)}</span>
          </div>
        {/if}

        {#if metrics.errorRate !== undefined}
          <div class="flex items-center gap-1.5">
            <AlertTriangle class="text-muted-foreground h-3 w-3" />
            <span class="text-muted-foreground">Errors:</span>
            <span class="font-medium">{formatPercent(metrics.errorRate, 1)}</span>
          </div>
        {/if}
      </div>
    {/if}

    {#if issues.length > 0}
      <div class="border-t pt-2">
        <p class="text-muted-foreground mb-1 text-xs font-medium">Issues:</p>
        <ul class="text-muted-foreground space-y-0.5 text-xs">
          {#each issues.slice(0, 3) as issue}
            <li class="flex items-start gap-1">
              <span class="text-destructive">•</span>
              <span>{issue}</span>
            </li>
          {/each}
          {#if issues.length > 3}
            <li class="text-muted-foreground/60">+{issues.length - 3} more</li>
          {/if}
        </ul>
      </div>
    {/if}

    {#if lastCheck}
      <p class="text-muted-foreground/60 text-xs">
        Last checked: {new Date(lastCheck).toLocaleTimeString()}
      </p>
    {/if}
  </Card.Content>
</Card.Root>
