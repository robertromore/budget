<script lang="ts">
  import {SvelteMap} from "svelte/reactivity";
  import * as Card from "$lib/components/ui/card";
  import {Badge} from "$lib/components/ui/badge";
  import {Progress} from "$lib/components/ui/progress";
  import {TrendingUp, TrendingDown, Minus} from "@lucide/svelte/icons";
  import {currencyFormatter, numberFormatter, percentageFormatter, daysFormatter} from "$lib/utils/formatters";
  import {cn} from "$lib/utils";
  import type {BudgetHealthStatus} from "$lib/schema/budgets";

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
    status?: BudgetHealthStatus;
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

  const formatValueMap = new SvelteMap([
    ["currency", (val: number) => currencyFormatter.format(val)],
    ["percentage", (val: number) => percentageFormatter.format(val)],
    ["days", (val: number) => daysFormatter.format(val)],
    ["number", (val: number) => numberFormatter.format(val)],
  ]);

  const formatValue = $derived((val: number, fmt: string) =>
    formatValueMap.get(fmt)?.(val) ?? val.toString()
  );

  const trendIconMap = new SvelteMap([
    ["up", TrendingUp],
    ["down", TrendingDown],
  ]);

  const trendColorMap = new SvelteMap([
    ["up", "text-green-600"],
    ["down", "text-red-600"],
  ]);

  const statusColorMap = new SvelteMap([
    ["excellent", "text-green-600"],
    ["good", "text-blue-600"],
    ["warning", "text-yellow-600"],
    ["danger", "text-red-600"],
  ]);

  const getTrendIcon = $derived((direction: string) => trendIconMap.get(direction) ?? Minus);
  const getTrendColor = $derived((direction: string) => trendColorMap.get(direction) ?? "text-muted-foreground");
  const getStatusColor = $derived((stat?: string) => statusColorMap.get(stat ?? "") ?? "text-foreground");

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