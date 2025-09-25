<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import {Badge} from "$lib/components/ui/badge";
  import {Progress} from "$lib/components/ui/progress";
  import {TrendingUp, TrendingDown, Minus} from "@lucide/svelte/icons";
  import {currencyFormatter} from "$lib/utils/formatters";
  import {cn} from "$lib/utils";

  interface Props {
    title: string;
    value: number;
    subtitle?: string;
    format?: "currency" | "percentage" | "number" | "days";
    trend?: {
      value: number;
      direction: "up" | "down" | "neutral";
      period?: string;
    };
    progress?: {
      current: number;
      total: number;
    };
    status?: "excellent" | "good" | "warning" | "danger";
    icon?: any;
    class?: string;
  }

  let {
    title,
    value,
    subtitle,
    format = "currency",
    trend,
    progress,
    status,
    icon: Icon,
    class: className,
  }: Props = $props();

  function formatValue(val: number, fmt: string) {
    switch (fmt) {
      case "currency": return currencyFormatter.format(val);
      case "percentage": return `${val.toFixed(1)}%`;
      case "days": return `${Math.round(val)} days`;
      case "number": return val.toLocaleString();
      default: return val.toString();
    }
  }

  function getTrendIcon(direction: string) {
    switch (direction) {
      case "up": return TrendingUp;
      case "down": return TrendingDown;
      default: return Minus;
    }
  }

  function getTrendColor(direction: string) {
    switch (direction) {
      case "up": return "text-green-600";
      case "down": return "text-red-600";
      default: return "text-muted-foreground";
    }
  }

  function getStatusColor(stat?: string) {
    switch (stat) {
      case "excellent": return "text-green-600";
      case "good": return "text-blue-600";
      case "warning": return "text-yellow-600";
      case "danger": return "text-red-600";
      default: return "text-foreground";
    }
  }

  const progressPercentage = $derived(
    progress ? Math.min((progress.current / progress.total) * 100, 100) : 0
  );
</script>

<Card.Root class={cn("p-6", className)}>
  <Card.Content class="p-0">
    <div class="flex items-center justify-between">
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          {#if Icon}
            <Icon class="h-4 w-4 text-muted-foreground" />
          {/if}
          <p class="text-sm font-medium text-muted-foreground">{title}</p>
        </div>

        <div class="flex items-baseline gap-2">
          <p class="text-2xl font-bold {getStatusColor(status)}">
            {formatValue(value, format)}
          </p>

          {#if trend}
            {@const TrendIcon = getTrendIcon(trend.direction)}
            <div class="flex items-center gap-1">
              <TrendIcon class="h-3 w-3 {getTrendColor(trend.direction)}" />
              <span class="text-xs font-medium {getTrendColor(trend.direction)}">
                {formatValue(Math.abs(trend.value), trend.direction === "neutral" ? "number" : "percentage")}
                {#if trend.period}
                  <span class="text-muted-foreground"> {trend.period}</span>
                {/if}
              </span>
            </div>
          {/if}
        </div>

        {#if subtitle}
          <p class="text-xs text-muted-foreground">{subtitle}</p>
        {/if}
      </div>

      {#if status}
        <Badge
          variant={status === "excellent" || status === "good" ? "default" :
                  status === "warning" ? "secondary" : "destructive"}
          class="capitalize"
        >
          {status}
        </Badge>
      {/if}
    </div>

    {#if progress}
      <div class="mt-4 space-y-2">
        <Progress
          value={progressPercentage}
          class="h-2"
        />
        <div class="flex justify-between text-xs text-muted-foreground">
          <span>{formatValue(progress.current, format)}</span>
          <span>{formatValue(progress.total, format)}</span>
        </div>
      </div>
    {/if}
  </Card.Content>
</Card.Root>