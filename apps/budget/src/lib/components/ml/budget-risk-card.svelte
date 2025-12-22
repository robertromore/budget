<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { cn, formatCurrency } from "$lib/utils";
  import AlertTriangle from "@lucide/svelte/icons/alert-triangle";
  import CheckCircle from "@lucide/svelte/icons/check-circle";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import TrendingUp from "@lucide/svelte/icons/trending-up";

  interface BudgetRisk {
    budgetId: number;
    budgetName: string;
    risk: "none" | "low" | "medium" | "high" | "critical";
    predictedOverspend: number;
    percentSpent: number;
    recommendation?: string;
  }

  interface Props {
    budgetsAtRisk?: number;
    totalBudgets?: number;
    overallRisk?: "none" | "low" | "medium" | "high" | "critical";
    predictedOverspend?: number;
    topRisks?: BudgetRisk[];
    onViewAll?: () => void;
    class?: string;
  }

  let {
    budgetsAtRisk = 0,
    totalBudgets = 0,
    overallRisk = "none",
    predictedOverspend = 0,
    topRisks = [],
    onViewAll,
    class: className,
  }: Props = $props();

  const riskConfig = {
    none: {
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20",
      label: "On Track",
      icon: CheckCircle,
    },
    low: {
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/20",
      label: "Low Risk",
      icon: TrendingUp,
    },
    medium: {
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/20",
      label: "Medium Risk",
      icon: AlertTriangle,
    },
    high: {
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
      label: "High Risk",
      icon: AlertTriangle,
    },
    critical: {
      color: "text-red-600",
      bgColor: "bg-red-600/10",
      borderColor: "border-red-600/20",
      label: "Critical",
      icon: AlertTriangle,
    },
  };

  const config = $derived(riskConfig[overallRisk]);
  const RiskIcon = $derived(config.icon);
</script>

<Card.Root class={cn("", className)}>
  <Card.Header class="pb-2">
    <div class="flex items-center justify-between">
      <Card.Title class="flex items-center gap-2 text-sm font-medium">
        <TrendingUp class="h-4 w-4" />
        Budget Health
      </Card.Title>
      <Badge variant="outline" class={cn("gap-1", config.color)}>
        <RiskIcon class="h-3 w-3" />
        {config.label}
      </Badge>
    </div>
    <Card.Description>
      {budgetsAtRisk} of {totalBudgets} budgets at risk
    </Card.Description>
  </Card.Header>

  <Card.Content class="space-y-4">
    {#if budgetsAtRisk > 0}
      <!-- Predicted Overspend -->
      <div class="space-y-1">
        <p class="text-muted-foreground text-xs">Predicted Overspend</p>
        <p class="text-2xl font-bold text-red-500">
          {formatCurrency(predictedOverspend)}
        </p>
      </div>

      <!-- Top Risks -->
      {#if topRisks.length > 0}
        <div class="space-y-2">
          <p class="text-muted-foreground text-xs">Top Risks</p>
          {#each topRisks.slice(0, 3) as risk}
            {@const riskCfg = riskConfig[risk.risk]}
            <div class={cn("rounded-lg border p-2", riskCfg.borderColor, riskCfg.bgColor)}>
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium">{risk.budgetName}</span>
                <Badge variant="outline" class={cn("text-xs", riskCfg.color)}>
                  {risk.risk}
                </Badge>
              </div>
              <div class="mt-1 flex items-center justify-between text-xs">
                <span class="text-muted-foreground">
                  {risk.percentSpent.toFixed(0)}% spent
                </span>
                <span class={riskCfg.color}>
                  +{formatCurrency(risk.predictedOverspend)}
                </span>
              </div>
              {#if risk.recommendation}
                <p class="text-muted-foreground mt-1 text-xs">{risk.recommendation}</p>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    {:else}
      <!-- All Clear -->
      <div class="py-4 text-center">
        <CheckCircle class="mx-auto h-8 w-8 text-green-500" />
        <p class="mt-2 text-sm font-medium">All budgets on track</p>
        <p class="text-muted-foreground text-xs">No overspending predicted</p>
      </div>
    {/if}

    {#if onViewAll && totalBudgets > 0}
      <Button variant="ghost" size="sm" class="w-full" onclick={onViewAll}>
        View All Budgets
        <ChevronRight class="ml-1 h-4 w-4" />
      </Button>
    {/if}
  </Card.Content>
</Card.Root>
