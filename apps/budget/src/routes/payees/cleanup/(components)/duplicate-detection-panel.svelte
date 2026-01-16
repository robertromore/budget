<script lang="ts">
  import { SvelteSet } from "svelte/reactivity";
  import * as Card from "$lib/components/ui/card";
  import * as Collapsible from "$lib/components/ui/collapsible";
  import * as Select from "$lib/components/ui/select";
  import { Button } from "$lib/components/ui/button";
  import { Slider } from "$lib/components/ui/slider";
  import { Label } from "$lib/components/ui/label";
  import { Switch } from "$lib/components/ui/switch";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import { getDuplicates, listPayees, mergeDuplicates } from "$lib/query/payees";
  import { LLMSettings } from "$lib/query";
  import type { DuplicateGroup, LLMLogEntry } from "$lib/query/payees-types";
  import type { Payee } from "$lib/schema/payees";
  import { toast } from "$lib/utils/toast-interceptor";

  import DuplicateGroupCard from "./duplicate-group-card.svelte";
  import MergeConfirmationDialog from "./merge-confirmation-dialog.svelte";

  import AlertTriangle from "@lucide/svelte/icons/alert-triangle";
  import Brain from "@lucide/svelte/icons/brain";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import CircleAlert from "@lucide/svelte/icons/circle-alert";
  import CircleCheck from "@lucide/svelte/icons/circle-check";
  import GitMerge from "@lucide/svelte/icons/git-merge";
  import Loader2 from "@lucide/svelte/icons/loader-2";
  import ScrollText from "@lucide/svelte/icons/scroll-text";
  import Search from "@lucide/svelte/icons/search";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import Zap from "@lucide/svelte/icons/zap";

  // State
  let threshold = $state([0.8]);
  let detectionMethod = $state<"simple" | "ml" | "llm" | "llm_direct">("ml");
  let strategy = $state<"name" | "contact" | "transaction_pattern" | "comprehensive">("comprehensive");
  let includeInactive = $state(false);

  let duplicateGroups = $state<DuplicateGroup[]>([]);
  let selectedGroupIds = $state(new SvelteSet<number>());
  let isScanning = $state(false);
  let hasScanned = $state(false);

  // LLM Log state
  let llmLog = $state<LLMLogEntry[]>([]);
  let logPanelOpen = $state(false);
  let expandedLogEntries = $state(new SvelteSet<number>());

  // Merge dialog state
  let mergeDialogOpen = $state(false);
  let selectedGroupForMerge = $state<DuplicateGroup | null>(null);
  let isMerging = $state(false);

  // Queries
  const payeesQuery = listPayees().options();
  const mergeMutation = mergeDuplicates().options();
  const llmPreferencesQuery = LLMSettings.getPreferences().options();

  // Check if LLM is enabled
  const isLLMEnabled = $derived(llmPreferencesQuery.data?.enabled ?? false);

  const payeesMap = $derived(
    new Map((payeesQuery.data ?? []).map((p) => [p.id, p]))
  );

  // Calculate the number of pairs that will be analyzed for LLM direct mode
  const activePayeeCount = $derived(
    (payeesQuery.data ?? []).filter(p => includeInactive || p.isActive).length
  );
  const totalPairsForLLM = $derived(
    Math.floor((activePayeeCount * (activePayeeCount - 1)) / 2)
  );
  const estimatedLLMCalls = $derived(
    Math.ceil(totalPairsForLLM / 15) // 15 pairs per batch
  );

  const allDetectionMethodOptions = [
    { value: "simple", label: "Simple", icon: Zap, description: "Basic text matching (fastest)", requiresLLM: false },
    { value: "ml", label: "Machine Learning", icon: Brain, description: "Pattern-aware matching (recommended)", requiresLLM: false },
    { value: "llm", label: "AI + ML Filter", icon: Sparkles, description: "ML finds candidates, AI confirms", requiresLLM: true },
    { value: "llm_direct", label: "AI Direct", icon: Sparkles, description: "AI analyzes all pairs (no pre-filter)", requiresLLM: true },
  ];

  // Filter out LLM options when LLM is disabled
  const detectionMethodOptions = $derived(
    allDetectionMethodOptions.filter(option => !option.requiresLLM || isLLMEnabled)
  );

  // Reset to ML if current method requires LLM but LLM is disabled
  $effect(() => {
    if (!isLLMEnabled && (detectionMethod === "llm" || detectionMethod === "llm_direct")) {
      detectionMethod = "ml";
    }
  });

  const strategyOptions = [
    { value: "name", label: "Name Only", description: "Match by payee names" },
    { value: "contact", label: "Contact Info", description: "Match by email, phone, etc." },
    { value: "transaction_pattern", label: "Transaction Patterns", description: "Match by spending patterns" },
    { value: "comprehensive", label: "Comprehensive", description: "Use all matching methods" },
  ];

  function toggleLogEntry(batchIndex: number) {
    if (expandedLogEntries.has(batchIndex)) {
      expandedLogEntries.delete(batchIndex);
    } else {
      expandedLogEntries.add(batchIndex);
    }
  }

  async function handleScan() {
    isScanning = true;
    selectedGroupIds.clear();
    llmLog = [];
    expandedLogEntries.clear();

    try {
      const result = await getDuplicates(threshold[0], includeInactive, strategy, detectionMethod).execute();

      duplicateGroups = result?.groups ?? [];
      llmLog = result?.llmLog ?? [];
      hasScanned = true;

      // Auto-expand log panel if we have LLM logs
      if (llmLog.length > 0) {
        logPanelOpen = true;
      }

      // Check if LLM had issues
      const isLlmMode = detectionMethod === "llm" || detectionMethod === "llm_direct";
      const hasLlmError = isLlmMode && llmLog.length > 0 && !!llmLog[0]?.error;
      const llmNotConfigured = hasLlmError && (llmLog[0]?.error?.includes("not available") || llmLog[0]?.error?.includes("not configured"));
      const llmNoCandidates = hasLlmError && llmLog[0]?.error?.includes("No duplicate candidates");
      const llmFailed = hasLlmError && llmLog[0]?.error?.includes("failed");

      const methodLabels: Record<string, string> = {
        simple: "Simple",
        ml: "ML",
        llm: "AI + ML Filter",
        llm_direct: "AI Direct",
      };
      const methodLabel = methodLabels[detectionMethod] ?? detectionMethod;
      const actualMethod = llmNotConfigured ? "ML (LLM not configured)" :
                          llmFailed ? "ML (LLM failed)" :
                          methodLabel;

      if (llmNotConfigured) {
        toast.warning("LLM not available", {
          description: "Falling back to ML detection. Configure an LLM provider in Settings → Intelligence → LLM Settings.",
        });
      } else if (llmFailed) {
        toast.warning("LLM detection failed", {
          description: "Falling back to ML detection. Check the LLM Log for details.",
        });
      } else if (llmNoCandidates) {
        // This is actually fine - no duplicates to analyze
        // The toast below will handle this case
      }

      if (duplicateGroups.length === 0) {
        toast.success("No duplicates found", {
          description: `Scanned using ${actualMethod} detection. Your payees are already clean!`,
        });
      } else {
        toast.info(`Found ${duplicateGroups.length} duplicate group${duplicateGroups.length === 1 ? "" : "s"}`, {
          description: `Scanned using ${actualMethod} detection`,
        });
      }
    } catch (error) {
      console.error("Failed to scan for duplicates:", error);
      toast.error("Failed to scan for duplicates", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      isScanning = false;
    }
  }

  function toggleGroupSelection(groupId: number, selected: boolean) {
    if (selected) {
      selectedGroupIds.add(groupId);
    } else {
      selectedGroupIds.delete(groupId);
    }
  }

  function openMergeDialog(group: DuplicateGroup) {
    selectedGroupForMerge = group;
    mergeDialogOpen = true;
  }

  function closeMergeDialog() {
    mergeDialogOpen = false;
    selectedGroupForMerge = null;
  }

  async function handleMerge(mergeStrategy: {
    preserveTransactionHistory: boolean;
    conflictResolution: "primary" | "latest" | "best_quality";
    mergeContactInfo: boolean;
    mergeIntelligenceData: boolean;
  }) {
    if (!selectedGroupForMerge) return;

    isMerging = true;

    try {
      await mergeMutation.mutateAsync({
        primaryPayeeId: selectedGroupForMerge.primaryPayeeId,
        duplicatePayeeIds: selectedGroupForMerge.duplicatePayeeIds,
        mergeStrategy,
        confirmMerge: true,
      });

      toast.success("Payees merged successfully", {
        description: `Merged ${selectedGroupForMerge.duplicatePayeeIds.length} duplicate${selectedGroupForMerge.duplicatePayeeIds.length === 1 ? "" : "s"} into ${payeesMap.get(selectedGroupForMerge.primaryPayeeId)?.name}`,
      });

      // Remove the merged group from the list
      duplicateGroups = duplicateGroups.filter(
        (g) => g.primaryPayeeId !== selectedGroupForMerge!.primaryPayeeId
      );

      closeMergeDialog();
    } catch (error) {
      console.error("Failed to merge payees:", error);
      toast.error("Failed to merge payees", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      isMerging = false;
    }
  }

  async function handleBulkMerge() {
    const groupsToMerge = duplicateGroups.filter((g) =>
      selectedGroupIds.has(g.primaryPayeeId)
    );

    if (groupsToMerge.length === 0) return;

    isMerging = true;
    let successCount = 0;
    let failCount = 0;

    for (const group of groupsToMerge) {
      try {
        await mergeMutation.mutateAsync({
          primaryPayeeId: group.primaryPayeeId,
          duplicatePayeeIds: group.duplicatePayeeIds,
          mergeStrategy: {
            preserveTransactionHistory: true,
            conflictResolution: "primary",
            mergeContactInfo: true,
            mergeIntelligenceData: true,
          },
          confirmMerge: true,
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Merged ${successCount} group${successCount === 1 ? "" : "s"}`, {
        description: failCount > 0 ? `${failCount} failed` : undefined,
      });

      // Remove merged groups
      duplicateGroups = duplicateGroups.filter(
        (g) => !selectedGroupIds.has(g.primaryPayeeId)
      );
      selectedGroupIds.clear();
    }

    if (failCount > 0 && successCount === 0) {
      toast.error("Failed to merge payees");
    }

    isMerging = false;
  }
</script>

<div class="space-y-6">
  <!-- Controls -->
  <Card.Root>
    <Card.Header>
      <div class="flex items-center gap-2">
        <Brain class="text-primary h-5 w-5" />
        <Card.Title>Detection Settings</Card.Title>
      </div>
      <Card.Description>
        Configure how duplicate payees are detected
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-6">
      <!-- Detection Method -->
      <div class="space-y-2">
        <Label for="detection-method">Detection Method</Label>
        <Select.Root type="single" bind:value={detectionMethod}>
          <Select.Trigger id="detection-method" class="w-full">
            <div class="flex items-center gap-2">
              {#if detectionMethod === "simple"}
                <Zap class="h-4 w-4" />
              {:else if detectionMethod === "ml"}
                <Brain class="h-4 w-4" />
              {:else}
                <Sparkles class="h-4 w-4" />
              {/if}
              {detectionMethodOptions.find((o) => o.value === detectionMethod)?.label ?? "Select..."}
            </div>
          </Select.Trigger>
          <Select.Content>
            {#each detectionMethodOptions as option (option.value)}
              <Select.Item value={option.value}>
                <div class="flex items-center gap-2">
                  <option.icon class="h-4 w-4" />
                  <div>
                    <div class="font-medium">{option.label}</div>
                    <div class="text-muted-foreground text-xs">{option.description}</div>
                  </div>
                </div>
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
        {#if detectionMethod === "llm"}
          <div class="bg-muted/50 rounded-md border p-3 text-sm">
            <div class="flex items-start gap-2">
              <Sparkles class="text-primary mt-0.5 h-4 w-4 shrink-0" />
              <div class="space-y-1">
                <p class="font-medium">AI + ML Filter</p>
                <p class="text-muted-foreground text-xs">
                  ML finds candidates above threshold, then AI confirms matches.
                  Uses similarity threshold as a pre-filter for efficiency.
                </p>
              </div>
            </div>
          </div>
        {:else if detectionMethod === "llm_direct"}
          <div class="bg-muted/50 rounded-md border p-3 text-sm">
            <div class="flex items-start gap-2">
              <Sparkles class="text-primary mt-0.5 h-4 w-4 shrink-0" />
              <div class="space-y-1">
                <p class="font-medium">AI Direct Analysis</p>
                <p class="text-muted-foreground text-xs">
                  Analyzes all {totalPairsForLLM.toLocaleString()} payee pairs directly with your LLM.
                  {#if estimatedLLMCalls > 1}
                    This will make approximately {estimatedLLMCalls} API calls.
                  {/if}
                  Similarity threshold is bypassed in this mode.
                </p>
              </div>
            </div>
          </div>
          {#if totalPairsForLLM > 500}
            <div class="bg-warning/10 border-warning/30 text-warning-foreground rounded-md border p-3 text-sm">
              <div class="flex items-start gap-2">
                <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p class="font-medium">Large Dataset Warning</p>
                  <p class="text-muted-foreground text-xs">
                    With {activePayeeCount} payees, this will analyze {totalPairsForLLM.toLocaleString()} pairs.
                    This may take several minutes and use significant API quota.
                  </p>
                </div>
              </div>
            </div>
          {/if}
        {/if}
      </div>

      <!-- Similarity Threshold -->
      <div class="space-y-3" class:opacity-50={detectionMethod === "llm_direct"}>
        <div class="flex items-center justify-between">
          <Label>Similarity Threshold</Label>
          <span class="text-muted-foreground text-sm">
            {#if detectionMethod === "llm_direct"}
              N/A
            {:else}
              {Math.round(threshold[0] * 100)}%
            {/if}
          </span>
        </div>
        <Slider bind:value={threshold} type="multiple" min={0.5} max={1} step={0.05} disabled={detectionMethod === "llm_direct"} />
        <p class="text-muted-foreground text-xs">
          {#if detectionMethod === "llm_direct"}
            Threshold bypassed in AI Direct mode - the LLM analyzes all pairs.
          {:else if detectionMethod === "llm"}
            ML pre-filter threshold. Pairs above this are sent to AI for confirmation.
          {:else}
            Higher values require more exact matches. Lower values find more potential duplicates.
          {/if}
        </p>
      </div>

      <!-- Strategy -->
      <div class="space-y-2">
        <Label for="strategy">Matching Strategy</Label>
        <Select.Root type="single" bind:value={strategy}>
          <Select.Trigger id="strategy" class="w-full">
            {strategyOptions.find((o) => o.value === strategy)?.label ?? "Select..."}
          </Select.Trigger>
          <Select.Content>
            {#each strategyOptions as option (option.value)}
              <Select.Item value={option.value}>
                <div>
                  <div class="font-medium">{option.label}</div>
                  <div class="text-muted-foreground text-xs">{option.description}</div>
                </div>
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>

      <!-- Include Inactive -->
      <div class="flex items-center justify-between">
        <div>
          <Label for="include-inactive" class="text-sm font-normal">
            Include inactive payees
          </Label>
          <p class="text-muted-foreground text-xs">
            Also scan archived/inactive payees
          </p>
        </div>
        <Switch id="include-inactive" bind:checked={includeInactive} />
      </div>

      <!-- Scan Button -->
      <Button onclick={handleScan} disabled={isScanning} class="w-full">
        {#if isScanning}
          <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          Scanning...
        {:else}
          <Search class="mr-2 h-4 w-4" />
          Scan for Duplicates
        {/if}
      </Button>
    </Card.Content>
  </Card.Root>

  <!-- Results -->
  {#if hasScanned}
    <div class="space-y-4">
      <!-- Results Header -->
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold">
            {duplicateGroups.length} Duplicate Group{duplicateGroups.length === 1 ? "" : "s"} Found
          </h3>
          <p class="text-muted-foreground text-sm">
            Review each group and merge as needed
          </p>
        </div>
        {#if selectedGroupIds.size > 0}
          <Button onclick={handleBulkMerge} disabled={isMerging}>
            {#if isMerging}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              Merging...
            {:else}
              <GitMerge class="mr-2 h-4 w-4" />
              Merge Selected ({selectedGroupIds.size})
            {/if}
          </Button>
        {/if}
      </div>

      <!-- Duplicate Groups -->
      {#if duplicateGroups.length === 0}
        <Card.Root>
          <Card.Content class="flex flex-col items-center justify-center py-12">
            <Sparkles class="text-muted-foreground mb-4 h-12 w-12" />
            <h3 class="mb-1 text-lg font-semibold">No Duplicates Found</h3>
            <p class="text-muted-foreground text-center text-sm">
              Your payee list is clean! Try adjusting the threshold or strategy to find more potential matches.
            </p>
          </Card.Content>
        </Card.Root>
      {:else}
        <div class="grid gap-4">
          {#each duplicateGroups as group (group.primaryPayeeId)}
            <DuplicateGroupCard
              {group}
              payees={payeesMap}
              isSelected={selectedGroupIds.has(group.primaryPayeeId)}
              onSelect={(selected) => toggleGroupSelection(group.primaryPayeeId, selected)}
              onMerge={() => openMergeDialog(group)}
            />
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <!-- LLM Log Panel -->
  {#if hasScanned && llmLog.length > 0}
    <Card.Root>
      <Collapsible.Root bind:open={logPanelOpen}>
        <Card.Header class="pb-3">
          <Collapsible.Trigger class="flex w-full items-center justify-between">
            <div class="flex items-center gap-2">
              <ScrollText class="text-primary h-5 w-5" />
              <Card.Title class="text-base">LLM Detection Log</Card.Title>
              <span class="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                {llmLog.length} batch{llmLog.length === 1 ? "" : "es"}
              </span>
            </div>
            {#if logPanelOpen}
              <ChevronDown class="h-4 w-4" />
            {:else}
              <ChevronRight class="h-4 w-4" />
            {/if}
          </Collapsible.Trigger>
          <Card.Description>
            Details of prompts sent to the LLM and responses received
          </Card.Description>
        </Card.Header>
        <Collapsible.Content>
          <Card.Content class="pt-0">
            <ScrollArea class="h-[400px] pr-4">
              <div class="space-y-4">
                {#each llmLog as entry (entry.batchIndex)}
                  <div class="border-border rounded-lg border">
                    <button
                      class="hover:bg-muted/50 flex w-full items-center justify-between p-3 text-left transition-colors"
                      onclick={() => toggleLogEntry(entry.batchIndex)}
                    >
                      <div class="flex items-center gap-3">
                        {#if entry.error}
                          <CircleAlert class="h-4 w-4 text-destructive" />
                        {:else if entry.parsedResult}
                          <CircleCheck class="h-4 w-4 text-green-500" />
                        {:else}
                          <Loader2 class="h-4 w-4 animate-spin" />
                        {/if}
                        <div>
                          <div class="font-medium">Batch {entry.batchIndex + 1}</div>
                          <div class="text-muted-foreground text-xs">
                            {entry.pairs.length} pair{entry.pairs.length === 1 ? "" : "s"} analyzed
                          </div>
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="text-muted-foreground text-xs">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                        {#if expandedLogEntries.has(entry.batchIndex)}
                          <ChevronDown class="h-4 w-4" />
                        {:else}
                          <ChevronRight class="h-4 w-4" />
                        {/if}
                      </div>
                    </button>

                    {#if expandedLogEntries.has(entry.batchIndex)}
                      <div class="border-border space-y-4 border-t p-3">
                        <!-- Pairs Analyzed -->
                        <div>
                          <h5 class="mb-2 text-sm font-medium">Pairs Analyzed</h5>
                          <div class="bg-muted/50 space-y-1 rounded-md p-2 font-mono text-xs">
                            {#each entry.pairs as pair, idx}
                              <div>{idx + 1}. "{pair.primaryName}" vs "{pair.duplicateName}"</div>
                            {/each}
                          </div>
                        </div>

                        <!-- Prompt Sent -->
                        <div>
                          <h5 class="mb-2 text-sm font-medium">Prompt Sent</h5>
                          <pre class="bg-muted/50 max-h-[200px] overflow-auto whitespace-pre-wrap rounded-md p-2 font-mono text-xs">{entry.prompt}</pre>
                        </div>

                        <!-- Raw Response -->
                        <div>
                          <h5 class="mb-2 text-sm font-medium">Raw Response</h5>
                          {#if entry.error}
                            <div class="bg-destructive/10 text-destructive rounded-md p-2 text-xs">
                              Error: {entry.error}
                            </div>
                          {:else}
                            <pre class="bg-muted/50 max-h-[200px] overflow-auto whitespace-pre-wrap rounded-md p-2 font-mono text-xs">{entry.rawResponse}</pre>
                          {/if}
                        </div>

                        <!-- Parsed Result -->
                        {#if entry.parsedResult}
                          <div>
                            <h5 class="mb-2 text-sm font-medium">Parsed Result</h5>
                            <div class="bg-muted/50 rounded-md p-2">
                              <table class="w-full text-xs">
                                <thead>
                                  <tr class="border-border border-b">
                                    <th class="pb-1 text-left font-medium">Pair</th>
                                    <th class="pb-1 text-left font-medium">Match</th>
                                    <th class="pb-1 text-left font-medium">Confidence</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {#each entry.parsedResult.pairs as result}
                                    <tr class="border-border border-b last:border-0">
                                      <td class="py-1">
                                        {entry.pairs[result.index - 1]?.primaryName ?? "?"} / {entry.pairs[result.index - 1]?.duplicateName ?? "?"}
                                      </td>
                                      <td class="py-1">
                                        {#if result.isMatch}
                                          <span class="text-green-600">Yes</span>
                                        {:else}
                                          <span class="text-red-600">No</span>
                                        {/if}
                                      </td>
                                      <td class="py-1">{Math.round(result.confidence * 100)}%</td>
                                    </tr>
                                  {/each}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        {/if}
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            </ScrollArea>
          </Card.Content>
        </Collapsible.Content>
      </Collapsible.Root>
    </Card.Root>
  {/if}
</div>

<!-- Merge Confirmation Dialog -->
<MergeConfirmationDialog
  bind:open={mergeDialogOpen}
  primaryPayee={selectedGroupForMerge ? payeesMap.get(selectedGroupForMerge.primaryPayeeId) ?? null : null}
  duplicatePayees={selectedGroupForMerge
    ? selectedGroupForMerge.duplicatePayeeIds
        .map((id) => payeesMap.get(id))
        .filter(Boolean) as Payee[]
    : []}
  isLoading={isMerging}
  onConfirm={handleMerge}
  onCancel={closeMergeDialog}
/>
