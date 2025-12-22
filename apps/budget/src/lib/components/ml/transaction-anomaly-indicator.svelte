<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { cn } from "$lib/utils";
  import AlertCircle from "@lucide/svelte/icons/alert-circle";
  import AlertTriangle from "@lucide/svelte/icons/alert-triangle";
  import Info from "@lucide/svelte/icons/info";
  import ShieldAlert from "@lucide/svelte/icons/shield-alert";

  interface Props {
    score: number;
    riskLevel: "low" | "medium" | "high" | "critical" | (string & {});
    explanation?: string;
    compact?: boolean;
    showScore?: boolean;
    class?: string;
  }

  let {
    score,
    riskLevel,
    explanation,
    compact = false,
    showScore = false,
    class: className,
  }: Props = $props();

  const riskConfig = {
    low: {
      icon: Info,
      variant: "secondary" as const,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      label: "Low",
    },
    medium: {
      icon: AlertCircle,
      variant: "outline" as const,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      label: "Medium",
    },
    high: {
      icon: AlertTriangle,
      variant: "secondary" as const,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      label: "High",
    },
    critical: {
      icon: ShieldAlert,
      variant: "destructive" as const,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      label: "Critical",
    },
    // Fallback for unknown risk levels
    unknown: {
      icon: AlertCircle,
      variant: "outline" as const,
      color: "text-muted-foreground",
      bgColor: "bg-muted/10",
      label: "Unknown",
    },
  } as const;

  type RiskKey = keyof typeof riskConfig;
  const config = $derived(
    riskConfig[riskLevel as RiskKey] ?? riskConfig.unknown
  );
</script>

{#if compact}
  <Tooltip.Provider>
    <Tooltip.Root>
      <Tooltip.Trigger>
        <div class={cn("rounded-full p-1", config.bgColor, className)}>
          <config.icon class={cn("h-3 w-3", config.color)} />
        </div>
      </Tooltip.Trigger>
      <Tooltip.Content side="top" class="max-w-xs">
        <div class="space-y-1">
          <p class="font-medium">{config.label} Risk Detected</p>
          {#if explanation}
            <p class="text-muted-foreground text-xs">{explanation}</p>
          {/if}
          <p class="text-muted-foreground text-xs">
            Anomaly Score: {(score * 100).toFixed(0)}%
          </p>
        </div>
      </Tooltip.Content>
    </Tooltip.Root>
  </Tooltip.Provider>
{:else}
  <Tooltip.Provider>
    <Tooltip.Root>
      <Tooltip.Trigger>
        <Badge variant={config.variant} class={cn("gap-1", className)}>
          <config.icon class="h-3 w-3" />
          {#if showScore}
            <span>{(score * 100).toFixed(0)}%</span>
          {:else}
            <span>{config.label}</span>
          {/if}
        </Badge>
      </Tooltip.Trigger>
      {#if explanation}
        <Tooltip.Content side="top" class="max-w-xs">
          <p class="text-xs">{explanation}</p>
        </Tooltip.Content>
      {/if}
    </Tooltip.Root>
  </Tooltip.Provider>
{/if}
