<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { cn, formatCurrency } from "$lib/utils";
  import AlertTriangle from "@lucide/svelte/icons/alert-triangle";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import Copy from "@lucide/svelte/icons/copy";
  import DollarSign from "@lucide/svelte/icons/dollar-sign";
  import PiggyBank from "@lucide/svelte/icons/piggy-bank";
  import TrendingUp from "@lucide/svelte/icons/trending-up";
  import Zap from "@lucide/svelte/icons/zap";

  type OpportunityType =
    | "unused_subscription"
    | "price_increase"
    | "duplicate_service"
    | "spending_increase"
    | "negotiation_candidate";

  type Priority = "low" | "medium" | "high";

  interface Opportunity {
    id: string;
    type: OpportunityType;
    priority: Priority;
    title: string;
    description: string;
    estimatedMonthlySavings: number;
    payeeName?: string;
  }

  interface Props {
    opportunityCount?: number;
    totalMonthlyPotential?: number;
    topOpportunity?: Opportunity | null;
    opportunities?: Opportunity[];
    onViewAll?: () => void;
    class?: string;
  }

  let {
    opportunityCount = 0,
    totalMonthlyPotential = 0,
    topOpportunity = null,
    opportunities = [],
    onViewAll,
    class: className,
  }: Props = $props();

  const typeConfig = {
    unused_subscription: {
      icon: Zap,
      label: "Unused",
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    price_increase: {
      icon: TrendingUp,
      label: "Price Increase",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    duplicate_service: {
      icon: Copy,
      label: "Duplicate",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    spending_increase: {
      icon: AlertTriangle,
      label: "Spending Up",
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    negotiation_candidate: {
      icon: DollarSign,
      label: "Negotiate",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  };

  const priorityConfig = {
    low: { color: "text-gray-500", label: "Low" },
    medium: { color: "text-yellow-500", label: "Medium" },
    high: { color: "text-red-500", label: "High" },
  };

  const displayOpportunities = $derived(
    opportunities.length > 0 ? opportunities : (topOpportunity ? [topOpportunity] : [])
  );
</script>

<Card.Root class={cn("", className)}>
  <Card.Header class="pb-2">
    <div class="flex items-center justify-between">
      <Card.Title class="flex items-center gap-2 text-sm font-medium">
        <PiggyBank class="h-4 w-4" />
        Savings Opportunities
      </Card.Title>
      {#if opportunityCount > 0}
        <Badge variant="outline" class="text-green-500">
          {opportunityCount} found
        </Badge>
      {/if}
    </div>
    <Card.Description>
      Potential ways to reduce spending
    </Card.Description>
  </Card.Header>

  <Card.Content class="space-y-4">
    {#if totalMonthlyPotential > 0}
      <!-- Potential Savings -->
      <div class="space-y-1">
        <p class="text-muted-foreground text-xs">Potential Monthly Savings</p>
        <div class="flex items-baseline gap-2">
          <span class="text-2xl font-bold text-green-500">
            {formatCurrency(totalMonthlyPotential)}
          </span>
          <span class="text-muted-foreground text-sm">
            / month
          </span>
        </div>
        <p class="text-muted-foreground text-xs">
          ~{formatCurrency(totalMonthlyPotential * 12)} / year
        </p>
      </div>

      <!-- Top Opportunities -->
      {#if displayOpportunities.length > 0}
        <div class="space-y-2">
          {#each displayOpportunities.slice(0, 3) as opportunity}
            {@const typeCfg = typeConfig[opportunity.type]}
            {@const priorityCfg = priorityConfig[opportunity.priority]}
            <div class={cn("rounded-lg border p-3", typeCfg.bgColor)}>
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-2">
                  <typeCfg.icon class={cn("h-4 w-4", typeCfg.color)} />
                  <div>
                    <p class="text-sm font-medium">{opportunity.title}</p>
                    <p class="text-muted-foreground text-xs line-clamp-1">
                      {opportunity.description}
                    </p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-sm font-semibold text-green-600">
                    {formatCurrency(opportunity.estimatedMonthlySavings)}
                  </p>
                  <Badge variant="secondary" class={cn("text-xs", priorityCfg.color)}>
                    {priorityCfg.label}
                  </Badge>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {:else}
      <!-- No Opportunities -->
      <div class="py-4 text-center">
        <DollarSign class="text-muted-foreground mx-auto h-8 w-8" />
        <p class="mt-2 text-sm font-medium">No opportunities found</p>
        <p class="text-muted-foreground text-xs">
          Your spending looks optimized
        </p>
      </div>
    {/if}

    {#if onViewAll && opportunityCount > 0}
      <Button variant="ghost" size="sm" class="w-full" onclick={onViewAll}>
        View All Opportunities
        <ChevronRight class="ml-1 h-4 w-4" />
      </Button>
    {/if}
  </Card.Content>
</Card.Root>
