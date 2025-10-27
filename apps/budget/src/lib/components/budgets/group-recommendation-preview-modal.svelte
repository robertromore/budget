<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { Separator } from "$lib/components/ui/separator";
  import {
    Users,
    TrendingUp,
    Calendar,
    DollarSign,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Sparkles
  } from "@lucide/svelte/icons";
  import type { BudgetRecommendation } from "$lib/schema/recommendations";

  interface Budget {
    id: number;
    name: string;
    amount?: number;
    category?: { name: string };
  }

  interface Props {
    open?: boolean;
    recommendation: BudgetRecommendation | null;
    budgets?: Budget[];
    onAccept: (recommendationId: number) => Promise<void>;
    onReject: (recommendationId: number) => Promise<void>;
    onClose: () => void;
  }

  let {
    open = $bindable(false),
    recommendation,
    budgets = [],
    onAccept,
    onReject,
    onClose
  }: Props = $props();

  let isProcessing = $state(false);

  // Get metadata from recommendation
  const metadata = $derived(() => {
    if (!recommendation?.metadata) return null;
    try {
      return typeof recommendation.metadata === "string"
        ? JSON.parse(recommendation.metadata)
        : recommendation.metadata;
    } catch {
      return null;
    }
  });

  // Get budgets that will be affected by this recommendation
  const affectedBudgets = $derived(() => {
    const meta = metadata();
    if (!meta?.budgetIdsToGroup || !budgets.length) return [];

    return budgets.filter(b => meta.budgetIdsToGroup.includes(b.id));
  });

  // Calculate total amount for affected budgets
  const totalAmount = $derived(() => {
    return affectedBudgets().reduce((sum, b) => sum + (b.amount || 0), 0);
  });

  // Get confidence factors
  const confidenceFactors = $derived(() => {
    const meta = metadata();
    return meta?.confidenceFactors || null;
  });

  // Get grouping reason label
  function getGroupingReasonLabel(reason: string | undefined): string {
    switch (reason) {
      case "category_hierarchy":
        return "Category Hierarchy";
      case "account_clustering":
        return "Account Pattern";
      case "spending_pattern":
        return "Spending Pattern";
      case "name_similarity":
        return "Name Similarity";
      default:
        return "Hybrid Analysis";
    }
  }

  // Get action type label
  function getActionLabel(type: string): string {
    switch (type) {
      case "create_budget_group":
        return "Create New Budget Group";
      case "add_to_budget_group":
        return "Add to Existing Group";
      case "merge_budget_groups":
        return "Merge Budget Groups";
      case "adjust_group_limit":
        return "Adjust Group Limit";
      default:
        return type;
    }
  }

  async function handleAccept() {
    if (!recommendation) return;

    isProcessing = true;
    try {
      await onAccept(recommendation.id);
      open = false;
      onClose();
    } catch (error) {
      console.error("Failed to accept recommendation:", error);
    } finally {
      isProcessing = false;
    }
  }

  async function handleReject() {
    if (!recommendation) return;

    isProcessing = true;
    try {
      await onReject(recommendation.id);
      open = false;
      onClose();
    } catch (error) {
      console.error("Failed to reject recommendation:", error);
    } finally {
      isProcessing = false;
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
    {#if recommendation}
      <Dialog.Header>
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <Dialog.Title class="text-xl flex items-center gap-2">
              <Users class="h-5 w-5 text-primary" />
              {getActionLabel(recommendation.type)}
            </Dialog.Title>
            <Dialog.Description class="mt-2">
              {recommendation.description}
            </Dialog.Description>
          </div>
          <Badge
            variant={recommendation.confidence >= 80 ? "default" : "secondary"}
            class="ml-3"
          >
            {recommendation.confidence}% confidence
          </Badge>
        </div>
      </Dialog.Header>

      <div class="space-y-6">
        <!-- Proposed Group Details -->
        {#if metadata()?.suggestedGroupName}
          <Card.Root class="bg-muted/50">
            <Card.Content class="pt-6">
              <div class="space-y-4">
                <div class="flex items-center gap-3">
                  <div
                    class="h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                    style="background-color: {metadata()?.suggestedGroupColor || '#6366f1'}"
                  >
                    {metadata()?.suggestedGroupName?.charAt(0).toUpperCase() || "G"}
                  </div>
                  <div>
                    <h3 class="font-semibold text-lg">
                      {metadata()?.suggestedGroupName || "New Budget Group"}
                    </h3>
                    {#if metadata()?.groupingReason}
                      <p class="text-sm text-muted-foreground">
                        Based on {getGroupingReasonLabel(metadata()?.groupingReason)}
                      </p>
                    {/if}
                  </div>
                </div>

                <!-- Group stats -->
                <div class="grid grid-cols-2 gap-4 mt-4">
                  <div class="flex items-center gap-2">
                    <Users class="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p class="text-xs text-muted-foreground">Budgets</p>
                      <p class="text-sm font-medium">
                        {affectedBudgets().length} items
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <DollarSign class="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p class="text-xs text-muted-foreground">Total Amount</p>
                      <p class="text-sm font-medium">
                        {formatCurrency(totalAmount())}
                      </p>
                    </div>
                  </div>
                </div>

                {#if metadata()?.groupSpendingLimit}
                  <div class="flex items-center gap-2 pt-2 border-t">
                    <TrendingUp class="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p class="text-xs text-muted-foreground">Suggested Group Limit</p>
                      <p class="text-sm font-medium">
                        {formatCurrency(metadata()?.groupSpendingLimit)}
                      </p>
                    </div>
                  </div>
                {/if}
              </div>
            </Card.Content>
          </Card.Root>
        {/if}

        <!-- Affected Budgets List -->
        {#if affectedBudgets().length > 0}
          <div class="space-y-3">
            <h4 class="font-medium text-sm flex items-center gap-2">
              <CheckCircle2 class="h-4 w-4 text-primary" />
              Budgets to be grouped ({affectedBudgets().length})
            </h4>
            <div class="space-y-2">
              {#each affectedBudgets() as budget (budget.id)}
                <div class="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div class="flex-1">
                    <p class="font-medium text-sm">{budget.name}</p>
                    {#if budget.category}
                      <p class="text-xs text-muted-foreground">
                        {budget.category.name}
                      </p>
                    {/if}
                  </div>
                  {#if budget.amount}
                    <Badge variant="outline">
                      {formatCurrency(budget.amount)}
                    </Badge>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Confidence Breakdown -->
        {#if confidenceFactors()}
          <div class="space-y-3">
            <h4 class="font-medium text-sm flex items-center gap-2">
              <Sparkles class="h-4 w-4 text-primary" />
              Analysis Breakdown
            </h4>
            <div class="grid grid-cols-2 gap-3">
              {#if confidenceFactors().categoryMatch !== undefined}
                <div class="p-3 rounded-lg border bg-card">
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-muted-foreground">Category Match</span>
                    <Badge variant="outline" class="text-xs">
                      {confidenceFactors().categoryMatch}/40
                    </Badge>
                  </div>
                  <div class="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      class="h-full bg-primary rounded-full"
                      style="width: {(confidenceFactors().categoryMatch / 40) * 100}%"
                    ></div>
                  </div>
                </div>
              {/if}

              {#if confidenceFactors().accountMatch !== undefined}
                <div class="p-3 rounded-lg border bg-card">
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-muted-foreground">Account Match</span>
                    <Badge variant="outline" class="text-xs">
                      {confidenceFactors().accountMatch}/30
                    </Badge>
                  </div>
                  <div class="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      class="h-full bg-primary rounded-full"
                      style="width: {(confidenceFactors().accountMatch / 30) * 100}%"
                    ></div>
                  </div>
                </div>
              {/if}

              {#if confidenceFactors().amountSimilarity !== undefined}
                <div class="p-3 rounded-lg border bg-card">
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-muted-foreground">Amount Similarity</span>
                    <Badge variant="outline" class="text-xs">
                      {confidenceFactors().amountSimilarity}/20
                    </Badge>
                  </div>
                  <div class="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      class="h-full bg-primary rounded-full"
                      style="width: {(confidenceFactors().amountSimilarity / 20) * 100}%"
                    ></div>
                  </div>
                </div>
              {/if}

              {#if confidenceFactors().nameSimilarity !== undefined}
                <div class="p-3 rounded-lg border bg-card">
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-muted-foreground">Name Similarity</span>
                    <Badge variant="outline" class="text-xs">
                      {confidenceFactors().nameSimilarity}/10
                    </Badge>
                  </div>
                  <div class="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      class="h-full bg-primary rounded-full"
                      style="width: {(confidenceFactors().nameSimilarity / 10) * 100}%"
                    ></div>
                  </div>
                </div>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Impact Warning -->
        {#if recommendation.confidence < 75}
          <Card.Root class="border-yellow-500/50 bg-yellow-500/10">
            <Card.Content class="pt-4">
              <div class="flex gap-3">
                <AlertTriangle class="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div class="space-y-1">
                  <p class="text-sm font-medium">Medium confidence recommendation</p>
                  <p class="text-sm text-muted-foreground">
                    This grouping has moderate confidence. Review the affected budgets carefully
                    before proceeding.
                  </p>
                </div>
              </div>
            </Card.Content>
          </Card.Root>
        {/if}
      </div>

      <Dialog.Footer class="flex gap-2">
        <Button
          variant="outline"
          onclick={handleReject}
          disabled={isProcessing}
          class="gap-2"
        >
          <XCircle class="h-4 w-4" />
          Reject
        </Button>
        <Button
          onclick={handleAccept}
          disabled={isProcessing}
          class="gap-2"
        >
          {#if isProcessing}
            <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Processing...
          {:else}
            <CheckCircle2 class="h-4 w-4" />
            Accept & Create Group
          {/if}
        </Button>
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>
