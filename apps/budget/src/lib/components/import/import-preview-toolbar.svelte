<script lang="ts">
import { Badge } from "$lib/components/ui/badge";
import { Button } from "$lib/components/ui/button";
import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
import { ResponsiveSheet } from "$lib/components/ui/responsive-sheet";
import type { CleanupState, ImportRow } from "$lib/types/import";
import { spotlightTour } from "$lib/states/ui/spotlight-tour.svelte";
import Check from "@lucide/svelte/icons/check";
import ChevronDown from "@lucide/svelte/icons/chevron-down";
import Filter from "@lucide/svelte/icons/filter";
import Settings2 from "@lucide/svelte/icons/settings-2";
import Sparkles from "@lucide/svelte/icons/sparkles";
import Users from "@lucide/svelte/icons/users";
import type { Table } from "@tanstack/table-core";
import PayeeCleanupContent from "./cleanup/payee-cleanup-content.svelte";

// Hide the Sheet overlay when the tour is active to avoid double overlays
const isTourActive = $derived(spotlightTour.isActive);

interface ImportOptions {
  createMissingPayees: boolean;
  createMissingCategories: boolean;
  allowPartialImport: boolean;
  reverseAmountSigns: boolean;
}

interface Props {
  table: Table<ImportRow>;
  data: ImportRow[];
  importOptions: ImportOptions;
  onImportOptionsChange: (options: ImportOptions) => void;
  cleanupState: CleanupState | null;
  onCleanupStateChange: (state: CleanupState) => void;
  processorCount?: number;
  onOpenProcessorFilter?: () => void;
  cleanupSheetOpen?: boolean;
}

let {
  table,
  data,
  importOptions,
  onImportOptionsChange,
  cleanupState,
  onCleanupStateChange,
  processorCount = 0,
  onOpenProcessorFilter,
  cleanupSheetOpen = $bindable(false),
}: Props = $props();

// Stats
const validCount = $derived(
  data.filter((r) => r.validationStatus === "valid" || r.validationStatus === "pending").length
);
const warningCount = $derived(data.filter((r) => r.validationStatus === "warning").length);
const invalidCount = $derived(data.filter((r) => r.validationStatus === "invalid").length);

// Cleanup stats
const cleanupStats = $derived.by(() => {
  if (!cleanupState) return null;
  const groups = cleanupState.payeeGroups;
  return {
    totalGroups: groups.length,
    pending: groups.filter((g) => g.userDecision === "pending").length,
    existingMatches: groups.filter((g) => g.existingMatch).length,
  };
});

// Category suggestion stats
const categorySuggestionStats = $derived.by(() => {
  if (!cleanupState?.categorySuggestions) return null;
  const suggestions = cleanupState.categorySuggestions;
  const highConfidence = suggestions.filter(
    (s) => s.suggestions.length > 0 && s.suggestions[0].confidence >= 0.7
  );
  const lowConfidence = suggestions.filter(
    (s) => s.suggestions.length > 0 && s.suggestions[0].confidence < 0.7 && s.suggestions[0].confidence >= 0.4
  );
  return {
    total: suggestions.length,
    autoFilled: highConfidence.length,
    needsReview: lowConfidence.length,
  };
});

// Toggle import option helper
function toggleOption(key: keyof ImportOptions) {
  onImportOptionsChange({
    ...importOptions,
    [key]: !importOptions[key],
  });
}

// Handle cleanup group decision
function handleGroupDecision(
  groupId: string,
  decision: "accept" | "reject" | "custom" | "pending",
  customName?: string
) {
  if (!cleanupState) return;

  const updatedGroups = cleanupState.payeeGroups.map((group) => {
    if (group.groupId === groupId) {
      return {
        ...group,
        userDecision: decision,
        ...(customName !== undefined ? { customName } : {}),
      };
    }
    return group;
  });

  onCleanupStateChange({
    ...cleanupState,
    payeeGroups: updatedGroups,
  });
}

// Bulk accept high confidence groups
function acceptHighConfidence() {
  if (!cleanupState) return;

  const updatedGroups = cleanupState.payeeGroups.map((group) => {
    if (group.confidence >= 0.85 && group.userDecision === "pending") {
      return { ...group, userDecision: "accept" as const };
    }
    return group;
  });

  onCleanupStateChange({
    ...cleanupState,
    payeeGroups: updatedGroups,
  });
}

// Reset all cleanup decisions
function resetAllDecisions() {
  if (!cleanupState) return;

  const updatedGroups = cleanupState.payeeGroups.map((group) => ({
    ...group,
    userDecision: "pending" as const,
    customName: undefined,
  }));

  onCleanupStateChange({
    ...cleanupState,
    payeeGroups: updatedGroups,
  });
}
</script>

<div class="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
  <div class="flex flex-wrap items-center gap-2">
    <!-- Import Options Dropdown -->
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Button variant="outline" size="sm" {...props}>
            <Settings2 class="mr-2 h-4 w-4" />
            Options
            <ChevronDown class="ml-2 h-4 w-4" />
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="start" class="w-56">
        <DropdownMenu.Group>
          <DropdownMenu.Label>Import Settings</DropdownMenu.Label>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            onSelect={() => toggleOption("createMissingPayees")}
            closeOnSelect={false}
          >
            {#if importOptions.createMissingPayees}
              <Check class="mr-2 h-4 w-4" />
            {:else}
              <span class="mr-2 h-4 w-4"></span>
            {/if}
            Auto-create payees
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={() => toggleOption("createMissingCategories")}
            closeOnSelect={false}
          >
            {#if importOptions.createMissingCategories}
              <Check class="mr-2 h-4 w-4" />
            {:else}
              <span class="mr-2 h-4 w-4"></span>
            {/if}
            Auto-create categories
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            onSelect={() => toggleOption("allowPartialImport")}
            closeOnSelect={false}
          >
            {#if importOptions.allowPartialImport}
              <Check class="mr-2 h-4 w-4" />
            {:else}
              <span class="mr-2 h-4 w-4"></span>
            {/if}
            Allow partial import
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={() => toggleOption("reverseAmountSigns")}
            closeOnSelect={false}
          >
            {#if importOptions.reverseAmountSigns}
              <Check class="mr-2 h-4 w-4" />
            {:else}
              <span class="mr-2 h-4 w-4"></span>
            {/if}
            Reverse amount signs
          </DropdownMenu.Item>
        </DropdownMenu.Group>
      </DropdownMenu.Content>
    </DropdownMenu.Root>

    <!-- Payee Cleanup Button with Sheet -->
    <ResponsiveSheet bind:open={cleanupSheetOpen} defaultWidth={520} minWidth={400} maxWidth={700} hideOverlay={isTourActive} dataTourId="import-cleanup-sheet">
      {#snippet trigger()}
        <Button variant="outline" size="sm" class="gap-2">
          <Users class="h-4 w-4" />
          Payee Cleanup
          {#if cleanupStats}
            <Badge variant="secondary" class="ml-1">
              {cleanupStats.totalGroups}
              {#if cleanupStats.pending > 0}
                <span class="text-yellow-600"> · {cleanupStats.pending} pending</span>
              {/if}
            </Badge>
          {:else if cleanupState?.isAnalyzing}
            <Badge variant="secondary" class="ml-1">
              <Sparkles class="mr-1 h-3 w-3 animate-pulse" />
              Analyzing...
            </Badge>
          {/if}
        </Button>
      {/snippet}

      {#snippet header()}
        <div>
          <h2 class="text-lg font-semibold">Payee Cleanup</h2>
          <p class="text-muted-foreground text-sm">
            Review and merge similar payees from your import
          </p>
        </div>
      {/snippet}

      {#snippet content()}
        <PayeeCleanupContent
          {cleanupState}
          onGroupDecision={handleGroupDecision}
          onAcceptHighConfidence={acceptHighConfidence}
          onResetAll={resetAllDecisions}
        />
      {/snippet}
    </ResponsiveSheet>

    <!-- Category Suggestions Stats -->
    {#if categorySuggestionStats && categorySuggestionStats.autoFilled > 0}
      <div class="text-muted-foreground flex items-center gap-2 text-sm">
        <Sparkles class="h-4 w-4 text-amber-500" />
        <span>
          {categorySuggestionStats.autoFilled} categories auto-filled
          {#if categorySuggestionStats.needsReview > 0}
            <span class="text-yellow-600">· {categorySuggestionStats.needsReview} to review</span>
          {/if}
        </span>
      </div>
    {/if}

    <!-- Filter Processors (conditional) -->
    {#if processorCount > 0 && onOpenProcessorFilter}
      <Button variant="outline" size="sm" onclick={onOpenProcessorFilter}>
        <Filter class="mr-2 h-4 w-4" />
        Filter Processors
        <Badge variant="secondary" class="ml-2">{processorCount}</Badge>
      </Button>
    {/if}
  </div>

  <!-- Stats -->
  <div class="text-muted-foreground flex items-center gap-3 text-sm">
    <span class="font-medium">{data.length} rows</span>
    <span class="text-border">·</span>
    <span class="text-green-600">{validCount} valid</span>
    {#if warningCount > 0}
      <span class="text-border">·</span>
      <span class="text-yellow-600">{warningCount} warnings</span>
    {/if}
    {#if invalidCount > 0}
      <span class="text-border">·</span>
      <span class="text-destructive">{invalidCount} invalid</span>
    {/if}
  </div>
</div>
