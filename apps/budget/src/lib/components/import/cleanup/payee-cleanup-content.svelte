<script lang="ts">
import { Badge } from "$lib/components/ui/badge";
import { Button } from "$lib/components/ui/button";
import * as Card from "$lib/components/ui/card";
import { Input } from "$lib/components/ui/input";
import { Progress } from "$lib/components/ui/progress";
import { ScrollArea } from "$lib/components/ui/scroll-area";
import type { CleanupState, PayeeGroup } from "$lib/types/import";
import Check from "@lucide/svelte/icons/check";
import ChevronDown from "@lucide/svelte/icons/chevron-down";
import ChevronUp from "@lucide/svelte/icons/chevron-up";
import Edit3 from "@lucide/svelte/icons/edit-3";
import Loader2 from "@lucide/svelte/icons/loader-2";
import Merge from "@lucide/svelte/icons/merge";
import Sparkles from "@lucide/svelte/icons/sparkles";
import Users from "@lucide/svelte/icons/users";
import X from "@lucide/svelte/icons/x";

interface Props {
  cleanupState: CleanupState | null;
  onGroupDecision: (
    groupId: string,
    decision: "accept" | "reject" | "custom" | "pending",
    customName?: string
  ) => void;
  onAcceptHighConfidence: () => void;
  onResetAll: () => void;
}

let { cleanupState, onGroupDecision, onAcceptHighConfidence, onResetAll }: Props = $props();

// Local state for UI
let expandedGroups = $state(new Set<string>());
let editingGroup = $state<string | null>(null);
let editingName = $state("");

// Derived stats
const stats = $derived.by(() => {
  if (!cleanupState) return null;
  const groups = cleanupState.payeeGroups;
  const accepted = groups.filter((g) => g.userDecision === "accept").length;
  const rejected = groups.filter((g) => g.userDecision === "reject").length;
  const pending = groups.filter((g) => g.userDecision === "pending").length;
  const withExisting = groups.filter((g) => g.existingMatch).length;

  return {
    totalGroups: groups.length,
    accepted,
    rejected,
    pending,
    withExisting,
  };
});

function toggleGroup(groupId: string) {
  const newExpanded = new Set(expandedGroups);
  if (newExpanded.has(groupId)) {
    newExpanded.delete(groupId);
  } else {
    newExpanded.add(groupId);
  }
  expandedGroups = newExpanded;
}

function acceptGroup(groupId: string) {
  onGroupDecision(groupId, "accept");
}

function rejectGroup(groupId: string) {
  onGroupDecision(groupId, "reject");
}

function startEditGroup(group: PayeeGroup) {
  editingGroup = group.groupId;
  editingName = group.customName || group.canonicalName;
}

function saveEditGroup(groupId: string) {
  if (editingName.trim()) {
    onGroupDecision(groupId, "custom", editingName.trim());
  }
  editingGroup = null;
  editingName = "";
}

function cancelEditGroup() {
  editingGroup = null;
  editingName = "";
}

function getConfidenceBadgeVariant(
  confidence: number
): "default" | "secondary" | "destructive" | "outline" {
  if (confidence >= 0.9) return "default";
  if (confidence >= 0.8) return "secondary";
  return "outline";
}
</script>

<div class="space-y-4">
  {#if !cleanupState || cleanupState.isAnalyzing}
    <!-- Analysis Progress -->
    <div class="flex flex-col items-center justify-center space-y-4 py-8">
      <Loader2 class="text-primary h-8 w-8 animate-spin" />
      <div class="text-center">
        <p class="font-medium">Analyzing payees...</p>
        {#if cleanupState}
          <p class="text-muted-foreground text-sm">
            {#if cleanupState.analysisPhase === "grouping_payees"}
              Grouping similar payees
            {:else if cleanupState.analysisPhase === "matching_existing"}
              Matching to existing payees
            {:else}
              Finalizing analysis
            {/if}
          </p>
          <Progress value={cleanupState.analysisProgress} class="mt-3 w-48" />
        {/if}
      </div>
    </div>
  {:else if cleanupState.payeeGroups.length === 0}
    <!-- No groups -->
    <div class="py-8 text-center">
      <Users class="text-muted-foreground mx-auto mb-3 h-8 w-8" />
      <p class="text-muted-foreground">No payee groups to review.</p>
      <p class="text-muted-foreground mt-1 text-sm">
        All payees appear to be unique.
      </p>
    </div>
  {:else}
    <!-- Summary Stats -->
    {#if stats}
      <div class="grid grid-cols-2 gap-3">
        <div class="flex items-center gap-2 rounded-md border p-3">
          <div class="bg-primary/10 rounded-lg p-1.5">
            <Users class="text-primary h-4 w-4" />
          </div>
          <div>
            <p class="text-lg font-bold">{stats.totalGroups}</p>
            <p class="text-muted-foreground text-xs">Groups</p>
          </div>
        </div>

        <div class="flex items-center gap-2 rounded-md border p-3">
          <div class="rounded-lg bg-green-500/10 p-1.5">
            <Merge class="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p class="text-lg font-bold">{stats.withExisting}</p>
            <p class="text-muted-foreground text-xs">Existing</p>
          </div>
        </div>
      </div>

      <!-- Bulk Actions -->
      {#if stats.pending > 0}
        <div class="flex flex-wrap items-center gap-2 rounded-md border p-2">
          <span class="text-muted-foreground text-sm">Quick:</span>
          <Button variant="outline" size="sm" onclick={onAcceptHighConfidence}>
            <Check class="mr-1 h-3 w-3" />
            Accept High Confidence
          </Button>
          <Button variant="ghost" size="sm" onclick={onResetAll}>Reset</Button>
        </div>
      {/if}
    {/if}

    <!-- Payee Groups List -->
    <ScrollArea class="max-h-[50vh]">
      <div class="space-y-2 pr-3">
        {#each cleanupState.payeeGroups as group (group.groupId)}
          {@const isExpanded = expandedGroups.has(group.groupId)}
          {@const isEditing = editingGroup === group.groupId}
          {@const displayName =
            group.userDecision === "custom" && group.customName
              ? group.customName
              : group.canonicalName}

          <div
            class="rounded-lg border p-3 transition-colors {group.userDecision === 'accept'
              ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
              : group.userDecision === 'reject'
                ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
                : group.userDecision === 'custom'
                  ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950'
                  : ''}"
          >
            <div class="flex items-start gap-2">
              <!-- Expand/Collapse Toggle -->
              <button
                type="button"
                class="text-muted-foreground hover:text-foreground mt-0.5 shrink-0"
                onclick={() => toggleGroup(group.groupId)}
              >
                {#if isExpanded}
                  <ChevronUp class="h-4 w-4" />
                {:else}
                  <ChevronDown class="h-4 w-4" />
                {/if}
              </button>

              <!-- Main Content -->
              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0 flex-1">
                    {#if isEditing}
                      <div class="flex items-center gap-1">
                        <Input
                          bind:value={editingName}
                          class="h-7 text-sm"
                          placeholder="Enter custom name"
                          onkeydown={(e) => {
                            if (e.key === "Enter") saveEditGroup(group.groupId);
                            if (e.key === "Escape") cancelEditGroup();
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          class="h-7 w-7 p-0"
                          onclick={() => saveEditGroup(group.groupId)}
                        >
                          <Check class="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" class="h-7 w-7 p-0" onclick={cancelEditGroup}>
                          <X class="h-3 w-3" />
                        </Button>
                      </div>
                    {:else}
                      <div class="flex flex-wrap items-center gap-1">
                        <span class="text-sm font-medium">{displayName}</span>
                        <Badge variant={getConfidenceBadgeVariant(group.confidence)} class="text-xs">
                          {Math.round(group.confidence * 100)}%
                        </Badge>
                        {#if group.members.length > 1}
                          <span class="text-muted-foreground text-xs">
                            ({group.members.length})
                          </span>
                        {/if}
                      </div>
                    {/if}

                    {#if group.existingMatch && !isEditing}
                      <p class="text-muted-foreground mt-0.5 text-xs">
                        → <span class="font-medium">{group.existingMatch.name}</span>
                        <span class="text-muted-foreground/70">
                          ({Math.round(group.existingMatch.confidence * 100)}%)
                        </span>
                      </p>
                    {/if}
                  </div>

                  <!-- Action Buttons -->
                  {#if !isEditing}
                    <div class="flex shrink-0 items-center gap-0.5">
                      <Button
                        variant={group.userDecision === "accept" ? "default" : "ghost"}
                        size="sm"
                        class="h-6 w-6 p-0"
                        onclick={() => acceptGroup(group.groupId)}
                        title="Accept"
                      >
                        <Check class="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        class="h-6 w-6 p-0"
                        onclick={() => startEditGroup(group)}
                        title="Edit name"
                      >
                        <Edit3 class="h-3 w-3" />
                      </Button>
                      <Button
                        variant={group.userDecision === "reject" ? "destructive" : "ghost"}
                        size="sm"
                        class="h-6 w-6 p-0"
                        onclick={() => rejectGroup(group.groupId)}
                        title="Reject"
                      >
                        <X class="h-3 w-3" />
                      </Button>
                    </div>
                  {/if}
                </div>

                <!-- Expanded Members -->
                {#if isExpanded && group.members.length > 0}
                  <div class="mt-2 space-y-0.5 border-t pt-2">
                    <p class="text-muted-foreground mb-1 text-xs font-medium uppercase">
                      Original names:
                    </p>
                    {#each group.members as member}
                      <div class="text-muted-foreground flex items-center gap-1 text-xs">
                        <span class="text-muted-foreground/50">•</span>
                        <span class="font-mono">{member.originalPayee}</span>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    </ScrollArea>
  {/if}
</div>
