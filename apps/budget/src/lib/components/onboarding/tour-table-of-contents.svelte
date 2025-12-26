<script lang="ts">
import { spotlightTour, type ChapterNode } from "$lib/states/ui/spotlight-tour.svelte";
import { Button } from "$lib/components/ui/button";
import * as Collapsible from "$lib/components/ui/collapsible";
import type { TourStep } from "$lib/types/spotlight-tour";
import Check from "@lucide/svelte/icons/check";
import ChevronDown from "@lucide/svelte/icons/chevron-down";
import ChevronLeft from "@lucide/svelte/icons/chevron-left";
import ChevronRight from "@lucide/svelte/icons/chevron-right";
import Circle from "@lucide/svelte/icons/circle";
import List from "@lucide/svelte/icons/list";
import Loader2 from "@lucide/svelte/icons/loader-2";
import X from "@lucide/svelte/icons/x";

const chaptersWithSteps = $derived(spotlightTour.chaptersWithSteps);
const currentStepIndex = $derived(spotlightTour.currentStepIndex);
const stepsViewed = $derived(spotlightTour.stepsViewed);
const isInSubTour = $derived(spotlightTour.isInSubTour);
const isSettingUp = $derived(spotlightTour.isSettingUp);
const visitedSteps = $derived(spotlightTour.visitedSteps);
const targetRect = $derived(spotlightTour.targetRect);

// TOC width + padding (w-64 = 256px + 16px margin)
const TOC_WIDTH = 272;

// Determine which side to position the TOC based on target element location
const positionSide = $derived.by(() => {
  if (!targetRect) return "right"; // Default to right

  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1920;
  const targetCenterX = targetRect.left + targetRect.width / 2;

  // If target is in the right half of the screen, position TOC on the left
  // Also check if the target would overlap with TOC on the right
  const wouldOverlapRight = targetRect.right > viewportWidth - TOC_WIDTH - 16;

  if (targetCenterX > viewportWidth / 2 || wouldOverlapRight) {
    return "left";
  }

  return "right";
});

// Track which chapters are "owned" by steps (rendered inline, not as separate sections)
const ownedChapterIds = $derived.by(() => {
  const owned = new Set<string>();
  function collectOwned(nodes: ChapterNode[]) {
    for (const node of nodes) {
      for (const { step } of node.steps) {
        if (step.childChapterId) {
          owned.add(step.childChapterId);
        }
      }
      collectOwned(node.children);
    }
  }
  collectOwned(chaptersWithSteps);
  return owned;
});

/**
 * Find a chapter node by its ID within the tree
 */
function findChapterNode(nodes: ChapterNode[], chapterId: string): ChapterNode | null {
  for (const node of nodes) {
    if (node.chapter.id === chapterId) return node;
    const found = findChapterNode(node.children, chapterId);
    if (found) return found;
  }
  return null;
}

let isOpen = $state(true);
let expandedChapters = $state<Set<string>>(new Set());

// Drill-down mode: shows only a sub-section when depth >= 3
let drillDownRoot = $state<string | null>(null);

// Compute if we should show drill-down view based on current chapter depth
const shouldDrillDown = $derived.by(() => {
  const currentChapter = spotlightTour.currentChapter;
  if (!currentChapter) return false;
  const depth = currentChapter.split("/").length;
  return depth >= 3;
});

// Auto-set drill-down root when entering deep chapters
$effect(() => {
  if (shouldDrillDown && spotlightTour.currentChapter) {
    const parts = spotlightTour.currentChapter.split("/");
    // Show from the 2nd level (e.g., "account-page/import" for depth 3+)
    const newRoot = parts.slice(0, 2).join("/");
    if (drillDownRoot !== newRoot) {
      drillDownRoot = newRoot;
    }
  } else if (!shouldDrillDown && drillDownRoot !== null) {
    // Clear drill-down when exiting deep chapters
    drillDownRoot = null;
  }
});

function goUp() {
  drillDownRoot = null;
}

// Auto-expand the chapter (and its parents) containing the current step
$effect(() => {
  const currentChapter = spotlightTour.currentChapter;
  if (currentChapter) {
    const newExpanded = new Set(expandedChapters);
    // Expand the current chapter
    newExpanded.add(currentChapter);
    // Also expand all parent chapters
    const parts = currentChapter.split("/");
    for (let i = 1; i < parts.length; i++) {
      newExpanded.add(parts.slice(0, i).join("/"));
    }
    if (newExpanded.size !== expandedChapters.size) {
      expandedChapters = newExpanded;
    }
  }
});

function toggleChapter(chapterId: string) {
  const newSet = new Set(expandedChapters);
  if (newSet.has(chapterId)) {
    newSet.delete(chapterId);
  } else {
    newSet.add(chapterId);
  }
  expandedChapters = newSet;
}

async function goToStep(index: number) {
  await spotlightTour.goToStep(index);
}

function getStepStatus(index: number): "completed" | "current" | "upcoming" {
  if (index < currentStepIndex) return "completed";
  if (index === currentStepIndex) return "current";
  return "upcoming";
}

/**
 * Check if a chapter (including all its descendants) is completed
 */
function isChapterCompleted(node: ChapterNode): boolean {
  // Check own steps
  const ownStepsCompleted = node.steps.every((s) => s.index < currentStepIndex);
  if (!ownStepsCompleted && node.steps.length > 0) return false;

  // Check all children recursively
  for (const child of node.children) {
    if (!isChapterCompleted(child)) return false;
  }

  return node.steps.length > 0 || node.children.length > 0;
}

/**
 * Check if the current step is within a chapter or any of its descendants
 */
function isCurrentChapter(node: ChapterNode): boolean {
  // Check own steps
  if (node.steps.some((s) => s.index === currentStepIndex)) return true;

  // Check children recursively
  for (const child of node.children) {
    if (isCurrentChapter(child)) return true;
  }

  return false;
}

/**
 * Count total steps including descendants
 */
function getTotalSteps(node: ChapterNode): number {
  let count = node.steps.length;
  for (const child of node.children) {
    count += getTotalSteps(child);
  }
  return count;
}

/**
 * Count completed steps including descendants
 */
function getCompletedSteps(node: ChapterNode): number {
  let count = node.steps.filter((s) => s.index < currentStepIndex).length;
  for (const child of node.children) {
    count += getCompletedSteps(child);
  }
  return count;
}

/**
 * Count steps at current position including descendants
 */
function getCurrentSteps(node: ChapterNode): number {
  let count = node.steps.filter((s) => s.index <= currentStepIndex).length;
  for (const child of node.children) {
    count += getCurrentSteps(child);
  }
  return count;
}
</script>

{#snippet chapterItem(node: ChapterNode, depth: number)}
  {@const isExpanded = expandedChapters.has(node.chapter.id)}
  {@const completed = isChapterCompleted(node)}
  {@const isCurrent = isCurrentChapter(node)}
  {@const hasContent = node.steps.length > 0 || node.children.length > 0}
  {@const totalSteps = getTotalSteps(node)}
  {@const currentCount = getCurrentSteps(node)}

  <Collapsible.Root
    open={isExpanded}
    onOpenChange={() => toggleChapter(node.chapter.id)}
    class="mb-1"
  >
    <Collapsible.Trigger
      class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent {isCurrent
        ? 'bg-accent/50 font-medium'
        : ''}"
      style="padding-left: {depth * 8 + 8}px"
    >
      {#if hasContent}
        {#if isExpanded}
          <ChevronDown class="h-4 w-4 shrink-0" />
        {:else}
          <ChevronRight class="h-4 w-4 shrink-0" />
        {/if}
      {:else}
        <span class="w-4"></span>
      {/if}

      <span class="flex-1 truncate">{node.chapter.title}</span>

      {#if completed}
        <Check class="h-4 w-4 text-green-500" />
      {:else if totalSteps > 0}
        <span class="text-muted-foreground text-xs">
          {currentCount}/{totalSteps}
        </span>
      {/if}
    </Collapsible.Trigger>

    <Collapsible.Content>
      <div class="border-l ml-2" style="margin-left: {depth * 8 + 16}px">
        <!-- Render own steps first -->
        {#each node.steps as { step, index }}
          {@const status = getStepStatus(index)}
          {@const childChapter = step.childChapterId ? findChapterNode(chaptersWithSteps, step.childChapterId) : null}

          <button
            class="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm transition-colors hover:bg-accent {status ===
            'current'
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground'}"
            onclick={() => goToStep(index)}
            disabled={isSettingUp}
          >
            {#if visitedSteps.has(index) && status !== "current"}
              <Check class="h-3 w-3 text-green-500" />
            {:else if status === "current"}
              <Circle class="h-3 w-3 fill-primary text-primary" />
            {:else}
              <Circle class="h-3 w-3 text-muted-foreground/50" />
            {/if}

            <span class="truncate">{step.title}</span>
          </button>

          <!-- Render inline child steps if this step owns a chapter -->
          {#if childChapter}
            <div class="ml-4 border-l pl-2">
              {#each childChapter.steps as childStep}
                {@const childStatus = getStepStatus(childStep.index)}
                <button
                  class="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm transition-colors hover:bg-accent {childStatus ===
                  'current'
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground'}"
                  onclick={() => goToStep(childStep.index)}
                  disabled={isSettingUp}
                >
                  {#if visitedSteps.has(childStep.index) && childStatus !== "current"}
                    <Check class="h-3 w-3 text-green-500" />
                  {:else if childStatus === "current"}
                    <Circle class="h-3 w-3 fill-primary text-primary" />
                  {:else}
                    <Circle class="h-3 w-3 text-muted-foreground/50" />
                  {/if}

                  <span class="truncate">{childStep.step.title}</span>
                </button>
              {/each}
            </div>
          {/if}
        {/each}

        <!-- Then render child chapters (excluding owned ones) -->
        {#each node.children.filter(c => !ownedChapterIds.has(c.chapter.id)) as childNode}
          {@render chapterItem(childNode, depth + 1)}
        {/each}
      </div>
    </Collapsible.Content>
  </Collapsible.Root>
{/snippet}

{#if true}
  <div
    class="tour-toc animate-in fade-in-0 fixed top-4 z-9999 max-h-[calc(100vh-8rem)] w-64 transition-[left,right] duration-300
      {positionSide === 'left' ? 'left-4 slide-in-from-left-5' : 'right-4 slide-in-from-right-5'}"
  >
    {#if isOpen}
      <div class="bg-popover text-popover-foreground relative rounded-lg border shadow-lg">
        <!-- Loading overlay -->
        {#if isSettingUp}
          <div class="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-popover/80">
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 class="h-4 w-4 animate-spin" />
              <span>Setting up...</span>
            </div>
          </div>
        {/if}

        <!-- Header -->
        <div class="flex items-center justify-between border-b px-3 py-2">
          <div class="flex items-center gap-2">
            <List class="h-4 w-4" />
            <span class="text-sm font-medium">Tour Guide</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            class="h-6 w-6 p-0"
            onclick={() => (isOpen = false)}
          >
            <X class="h-4 w-4" />
          </Button>
        </div>

        <!-- Chapters List -->
        <div class="max-h-[calc(100vh-14rem)] overflow-y-auto p-2">
          {#if drillDownRoot}
            <!-- Drill-down view: show "Go Up" button and filtered chapters -->
            <button
              class="mb-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              onclick={goUp}
            >
              <ChevronLeft class="h-4 w-4" />
              <span>Back to overview</span>
            </button>

            {@const rootNode = findChapterNode(chaptersWithSteps, drillDownRoot)}
            {#if rootNode}
              {@render chapterItem(rootNode, 0)}
            {/if}
          {:else}
            <!-- Normal view: show all top-level chapters -->
            {#each chaptersWithSteps as node}
              {@render chapterItem(node, 0)}
            {/each}
          {/if}
        </div>

        <!-- Footer with progress -->
        <div class="border-t px-3 py-2">
          <div class="text-muted-foreground text-xs">
            Step {currentStepIndex + 1} of {spotlightTour.totalSteps}
          </div>
          <div class="bg-muted mt-1 h-1 w-full overflow-hidden rounded-full">
            <div
              class="bg-primary h-full transition-all duration-300"
              style:width="{spotlightTour.progress}%"
            ></div>
          </div>
        </div>
      </div>
    {:else}
      <!-- Collapsed state - just show a button -->
      <Button
        variant="outline"
        size="sm"
        class="bg-popover shadow-lg"
        onclick={() => (isOpen = true)}
      >
        <List class="mr-2 h-4 w-4" />
        Tour Guide
      </Button>
    {/if}
  </div>
{/if}

<style>
  .tour-toc {
    pointer-events: auto;
  }
</style>
