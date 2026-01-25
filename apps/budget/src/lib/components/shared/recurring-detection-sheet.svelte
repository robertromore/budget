<script lang="ts">
  import { createQuery, createMutation, useQueryClient } from "@tanstack/svelte-query";
  import { Badge } from "$ui/lib/components/ui/badge";
  import { Button } from "$ui/lib/components/ui/button";
  import * as Card from "$ui/lib/components/ui/card";
  import * as RadioGroup from "$ui/lib/components/ui/radio-group";
  import * as Sheet from "$ui/lib/components/ui/sheet";
  import { ScrollArea } from "$ui/lib/components/ui/scroll-area";
  import { Separator } from "$ui/lib/components/ui/separator";
  import { toast } from "svelte-sonner";
  import {
    AlertCircle,
    Calendar,
    CheckCircle,
    CreditCard,
    Loader2,
    RefreshCw,
    TrendingUp,
    XCircle,
  } from "@nickschwabby/lucide-svelte";
  import { trpc } from "$lib/trpc/client";
  import { rpc, scheduleKeys, subscriptionKeys } from "$lib/query";
  import type { RecurringPattern } from "$lib/server/domains/shared/recurring-detection";
  import { formatCurrency } from "$lib/utils/formatting/currency";

  // Props
  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workspaceId: number;
    accountIds?: number[];
    onPatternConfirmed?: (pattern: RecurringPattern, action: EntityAction) => void;
  }

  type EntityAction = "subscription" | "schedule" | "budget" | "ignore";

  let { open, onOpenChange, workspaceId, accountIds, onPatternConfirmed }: Props = $props();

  const queryClient = useQueryClient();

  // Track user choices for each pattern
  let patternChoices = $state<Map<string, EntityAction>>(new Map());

  // Track which patterns have been processed
  let processedPatterns = $state<Set<string>>(new Set());

  // Loading state for the detect query
  let isAnalyzing = $state(false);

  // Patterns state
  let patterns = $state<RecurringPattern[]>([]);

  // Detect patterns
  async function analyzePatterns() {
    isAnalyzing = true;
    try {
      const result = await trpc().recurringRoutes?.detect?.query?.({
        accountIds,
        months: 6,
        minTransactions: 3,
        minConfidence: 50,
        minPredictability: 60,
      }) ?? [];
      patterns = result;
      // Reset choices for new analysis
      patternChoices = new Map();
      processedPatterns = new Set();
    } catch (error) {
      console.error("Failed to detect patterns:", error);
      toast.error("Failed to analyze recurring patterns");
    } finally {
      isAnalyzing = false;
    }
  }

  // Get pattern key
  function getPatternKey(pattern: RecurringPattern): string {
    return `${pattern.payeeId}-${pattern.accountId}`;
  }

  // Handle choice selection
  function handleChoiceChange(pattern: RecurringPattern, action: EntityAction) {
    const key = getPatternKey(pattern);
    patternChoices.set(key, action);
    patternChoices = new Map(patternChoices); // Trigger reactivity
  }

  // Confirm a pattern with the selected action
  async function handleConfirm(pattern: RecurringPattern) {
    const key = getPatternKey(pattern);
    const action = patternChoices.get(key);

    if (!action) {
      toast.error("Please select an action for this pattern");
      return;
    }

    try {
      if (action === "subscription" || action === "schedule") {
        // Create schedule with subscription tracking if needed
        await trpc().scheduleRoutes.create.mutate({
          workspaceId,
          name: pattern.payeeName,
          slug: pattern.payeeName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          status: "active",
          amount: Math.abs(pattern.amount.median),
          amount_2: 0,
          amount_type: "exact",
          recurring: true,
          auto_add: false,
          payeeId: pattern.payeeId,
          accountId: pattern.accountId,
          categoryId: pattern.categoryId,
          isSubscription: action === "subscription",
          subscriptionType: action === "subscription" ? pattern.subscriptionType : undefined,
          subscriptionStatus: action === "subscription" ? "active" : undefined,
          detectionConfidence: pattern.overallConfidence / 100,
          isUserConfirmed: true,
          detectedAt: new Date().toISOString(),
        });

        toast.success(`${action === "subscription" ? "Subscription" : "Schedule"} created for ${pattern.payeeName}`);
        queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
      } else if (action === "budget") {
        // Future: Create budget recommendation
        toast.info("Budget creation from detection coming soon");
      } else if (action === "ignore") {
        // Mark as ignored (future: store in user preferences)
        toast.success(`${pattern.payeeName} will be ignored`);
      }

      processedPatterns.add(key);
      processedPatterns = new Set(processedPatterns);
      onPatternConfirmed?.(pattern, action);
    } catch (error) {
      console.error("Failed to process pattern:", error);
      toast.error(`Failed to process ${pattern.payeeName}`);
    }
  }

  // Get frequency display text
  function getFrequencyDisplay(frequency: RecurringPattern["frequency"]): string {
    const labels: Record<RecurringPattern["frequency"], string> = {
      daily: "Daily",
      weekly: "Weekly",
      biweekly: "Every 2 weeks",
      monthly: "Monthly",
      quarterly: "Quarterly",
      semi_annual: "Every 6 months",
      annual: "Yearly",
      irregular: "Irregular",
    };
    return labels[frequency] ?? frequency;
  }

  // Get pattern type badge variant
  function getPatternTypeBadge(type: RecurringPattern["patternType"]): { variant: "default" | "secondary" | "outline"; label: string } {
    const badges: Record<RecurringPattern["patternType"], { variant: "default" | "secondary" | "outline"; label: string }> = {
      subscription: { variant: "default", label: "Subscription" },
      bill: { variant: "secondary", label: "Bill" },
      income: { variant: "outline", label: "Income" },
      transfer: { variant: "outline", label: "Transfer" },
      other: { variant: "outline", label: "Recurring" },
    };
    return badges[type] ?? { variant: "outline", label: type };
  }

  // Count unprocessed patterns
  const unprocessedCount = $derived(
    patterns.filter((p) => !processedPatterns.has(getPatternKey(p))).length
  );

  // Auto-analyze when sheet opens
  $effect(() => {
    if (open && patterns.length === 0) {
      analyzePatterns();
    }
  });
</script>

<Sheet.Root {open} {onOpenChange}>
  <Sheet.Content class="sm:max-w-xl">
    <Sheet.Header>
      <Sheet.Title class="flex items-center gap-2">
        <RefreshCw class="h-5 w-5" />
        Recurring Pattern Detection
      </Sheet.Title>
      <Sheet.Description>
        We found {patterns.length} recurring payment pattern{patterns.length !== 1 ? "s" : ""} in your transactions.
        Choose how to track each one.
      </Sheet.Description>
    </Sheet.Header>

    <div class="py-4">
      {#if isAnalyzing}
        <div class="flex flex-col items-center justify-center py-12">
          <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
          <p class="mt-4 text-sm text-muted-foreground">Analyzing transactions...</p>
        </div>
      {:else if patterns.length === 0}
        <div class="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle class="h-10 w-10 text-green-600" />
          <h3 class="mt-4 font-semibold">No New Patterns Found</h3>
          <p class="mt-2 text-sm text-muted-foreground">
            All recurring payments are already being tracked.
          </p>
          <Button variant="outline" onclick={() => analyzePatterns()} class="mt-4">
            <RefreshCw class="mr-2 h-4 w-4" />
            Analyze Again
          </Button>
        </div>
      {:else}
        <ScrollArea class="h-[500px] pr-4">
          <div class="space-y-4">
            {#each patterns as pattern (getPatternKey(pattern))}
              {@const key = getPatternKey(pattern)}
              {@const isProcessed = processedPatterns.has(key)}
              {@const choice = patternChoices.get(key)}
              {@const typeBadge = getPatternTypeBadge(pattern.patternType)}

              <Card.Root class={isProcessed ? "opacity-50" : ""}>
                <Card.Header class="pb-2">
                  <div class="flex items-start justify-between">
                    <div>
                      <Card.Title class="text-base">{pattern.payeeName}</Card.Title>
                      <div class="mt-1 flex items-center gap-2">
                        <Badge variant={typeBadge.variant}>{typeBadge.label}</Badge>
                        {#if pattern.subscriptionType}
                          <Badge variant="outline" class="capitalize">
                            {pattern.subscriptionType}
                          </Badge>
                        {/if}
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-lg font-semibold">
                        {formatCurrency(Math.abs(pattern.amount.median))}
                      </div>
                      <div class="text-xs text-muted-foreground">
                        {getFrequencyDisplay(pattern.frequency)}
                      </div>
                    </div>
                  </div>
                </Card.Header>
                <Card.Content class="pb-2">
                  <div class="grid grid-cols-3 gap-4 text-xs">
                    <div class="flex items-center gap-1">
                      <TrendingUp class="h-3 w-3 text-muted-foreground" />
                      <span>{pattern.overallConfidence.toFixed(0)}% confidence</span>
                    </div>
                    <div class="flex items-center gap-1">
                      <CreditCard class="h-3 w-3 text-muted-foreground" />
                      <span>{pattern.transactionCount} transactions</span>
                    </div>
                    <div class="flex items-center gap-1">
                      <Calendar class="h-3 w-3 text-muted-foreground" />
                      <span>Next: {pattern.suggestedNextDate}</span>
                    </div>
                  </div>

                  {#if !isProcessed}
                    <Separator class="my-3" />

                    <RadioGroup.Root
                      value={choice ?? ""}
                      onValueChange={(value) => handleChoiceChange(pattern, value as EntityAction)}
                      class="grid grid-cols-2 gap-2"
                    >
                      <div class="flex items-center space-x-2">
                        <RadioGroup.Item value="subscription" id={`${key}-sub`} />
                        <label for={`${key}-sub`} class="text-sm cursor-pointer">
                          Track as Subscription
                        </label>
                      </div>
                      <div class="flex items-center space-x-2">
                        <RadioGroup.Item value="schedule" id={`${key}-sched`} />
                        <label for={`${key}-sched`} class="text-sm cursor-pointer">
                          Create Schedule
                        </label>
                      </div>
                      <div class="flex items-center space-x-2">
                        <RadioGroup.Item value="budget" id={`${key}-budget`} />
                        <label for={`${key}-budget`} class="text-sm cursor-pointer">
                          Add to Budget
                        </label>
                      </div>
                      <div class="flex items-center space-x-2">
                        <RadioGroup.Item value="ignore" id={`${key}-ignore`} />
                        <label for={`${key}-ignore`} class="text-sm cursor-pointer">
                          Ignore
                        </label>
                      </div>
                    </RadioGroup.Root>
                  {/if}
                </Card.Content>
                {#if !isProcessed}
                  <Card.Footer class="pt-2">
                    <Button
                      size="sm"
                      onclick={() => handleConfirm(pattern)}
                      disabled={!choice}
                      class="w-full"
                    >
                      <CheckCircle class="mr-2 h-4 w-4" />
                      Confirm
                    </Button>
                  </Card.Footer>
                {:else}
                  <Card.Footer class="pt-2">
                    <div class="flex w-full items-center justify-center gap-2 text-sm text-green-600">
                      <CheckCircle class="h-4 w-4" />
                      Processed
                    </div>
                  </Card.Footer>
                {/if}
              </Card.Root>
            {/each}
          </div>
        </ScrollArea>

        {#if unprocessedCount > 0}
          <div class="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>{unprocessedCount} pattern{unprocessedCount !== 1 ? "s" : ""} remaining</span>
            <Button variant="outline" size="sm" onclick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        {:else}
          <div class="mt-4 text-center">
            <p class="text-sm text-green-600">All patterns have been processed!</p>
            <Button class="mt-2" onclick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        {/if}
      {/if}
    </div>
  </Sheet.Content>
</Sheet.Root>
