<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { cn } from "$lib/utils";
  import AlertCircle from "@lucide/svelte/icons/alert-circle";
  import AlertTriangle from "@lucide/svelte/icons/alert-triangle";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import Info from "@lucide/svelte/icons/info";
  import ShieldAlert from "@lucide/svelte/icons/shield-alert";
  import XCircle from "@lucide/svelte/icons/x-circle";

  interface AnomalyDimension {
    score: number;
    reason: string;
  }

  interface Props {
    transactionId: number;
    overallScore: number;
    riskLevel: "low" | "medium" | "high" | "critical" | (string & {});
    explanation: string;
    recommendedActions?: string[];
    dimensions?: {
      amount?: AnomalyDimension;
      timing?: AnomalyDimension;
      frequency?: AnomalyDimension;
      category?: AnomalyDimension;
      payee?: AnomalyDimension;
    };
    onDismiss?: () => void;
    onViewTransaction?: () => void;
    class?: string;
  }

  let {
    transactionId,
    overallScore,
    riskLevel,
    explanation,
    recommendedActions = [],
    dimensions,
    onDismiss,
    onViewTransaction,
    class: className,
  }: Props = $props();

  const riskConfig = {
    low: {
      icon: Info,
      variant: "secondary" as const,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
      label: "Low Risk",
    },
    medium: {
      icon: AlertCircle,
      variant: "outline" as const,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/20",
      label: "Medium Risk",
    },
    high: {
      icon: AlertTriangle,
      variant: "secondary" as const,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/20",
      label: "High Risk",
    },
    critical: {
      icon: ShieldAlert,
      variant: "destructive" as const,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
      label: "Critical",
    },
    // Fallback for unknown risk levels
    unknown: {
      icon: AlertCircle,
      variant: "outline" as const,
      color: "text-muted-foreground",
      bgColor: "bg-muted/10",
      borderColor: "border-muted",
      label: "Unknown",
    },
  } as const;

  type RiskKey = keyof typeof riskConfig;
  const config = $derived(
    riskConfig[riskLevel as RiskKey] ?? riskConfig.unknown
  );

  // Get top contributing dimensions
  const topDimensions = $derived(() => {
    if (!dimensions) return [];
    return Object.entries(dimensions)
      .filter(([_, dim]) => dim && dim.score > 0.3)
      .sort((a, b) => (b[1]?.score ?? 0) - (a[1]?.score ?? 0))
      .slice(0, 3);
  });
</script>

<Card.Root class={cn("relative overflow-hidden", config.borderColor, "border-l-4", className)}>
  <div class={cn("absolute inset-0 opacity-5", config.bgColor)}></div>

  <Card.Header class="relative pb-2">
    <div class="flex items-start justify-between gap-4">
      <div class="flex items-center gap-2">
        <div class={cn("rounded-full p-1.5", config.bgColor)}>
          <config.icon class={cn("h-4 w-4", config.color)} />
        </div>
        <div>
          <Card.Title class="text-sm font-medium">
            Transaction #{transactionId}
          </Card.Title>
          <p class="text-muted-foreground text-xs">
            Anomaly Score: {(overallScore * 100).toFixed(0)}%
          </p>
        </div>
      </div>
      <Badge variant={config.variant}>{config.label}</Badge>
    </div>
  </Card.Header>

  <Card.Content class="relative space-y-3">
    <!-- Explanation -->
    <p class="text-sm">{explanation}</p>

    <!-- Top Contributing Factors -->
    {#if topDimensions().length > 0}
      <div class="space-y-1.5">
        <p class="text-muted-foreground text-xs font-medium">Contributing Factors:</p>
        <div class="space-y-1">
          {#each topDimensions() as [name, dim]}
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground capitalize">{name}</span>
              <div class="flex items-center gap-2">
                <div class="bg-muted h-1.5 w-16 overflow-hidden rounded-full">
                  <div
                    class={cn("h-full rounded-full", {
                      "bg-blue-500": dim.score < 0.4,
                      "bg-yellow-500": dim.score >= 0.4 && dim.score < 0.7,
                      "bg-orange-500": dim.score >= 0.7 && dim.score < 0.9,
                      "bg-red-500": dim.score >= 0.9,
                    })}
                    style="width: {dim.score * 100}%"
                  ></div>
                </div>
                <span class="w-8 text-right font-medium">{(dim.score * 100).toFixed(0)}%</span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Recommended Actions -->
    {#if recommendedActions.length > 0}
      <div class="space-y-1.5">
        <p class="text-muted-foreground text-xs font-medium">Recommended Actions:</p>
        <ul class="space-y-0.5 text-xs">
          {#each recommendedActions.slice(0, 2) as action}
            <li class="text-muted-foreground flex items-start gap-1">
              <ChevronRight class="mt-0.5 h-3 w-3 shrink-0" />
              <span>{action}</span>
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    <!-- Actions -->
    <div class="flex items-center gap-2 pt-1">
      {#if onViewTransaction}
        <Button variant="outline" size="sm" onclick={onViewTransaction}>
          View Transaction
        </Button>
      {/if}
      {#if onDismiss}
        <Button variant="ghost" size="sm" onclick={onDismiss}>
          <XCircle class="mr-1 h-3 w-3" />
          Dismiss
        </Button>
      {/if}
    </div>
  </Card.Content>
</Card.Root>
