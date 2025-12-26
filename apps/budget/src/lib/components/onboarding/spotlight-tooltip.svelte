<script lang="ts">
/**
 * Spotlight Tooltip
 *
 * Displays tour step information with navigation controls.
 * Positions itself relative to the highlighted target element.
 * Supports branching into sub-tours for detailed deep-dives.
 */
import { Button } from '$lib/components/ui/button';
import { Progress } from '$lib/components/ui/progress';
import type { TourStep, TourBranch } from '$lib/types/spotlight-tour';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import ArrowRight from '@lucide/svelte/icons/arrow-right';
import BookOpen from '@lucide/svelte/icons/book-open';
import Check from '@lucide/svelte/icons/check';
import CornerDownRight from '@lucide/svelte/icons/corner-down-right';
import X from '@lucide/svelte/icons/x';

interface Props {
  step: TourStep;
  targetRect: DOMRect | null;
  currentIndex: number;
  totalSteps: number;
  progress: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  branches?: TourBranch[];
  isInSubTour?: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSkip: () => void;
  onEnterBranch?: (branchId: string) => void;
}

let {
  step,
  targetRect,
  currentIndex,
  totalSteps,
  progress,
  isFirstStep,
  isLastStep,
  branches = [],
  isInSubTour = false,
  onPrevious,
  onNext,
  onSkip,
  onEnterBranch,
}: Props = $props();

// Determine the text for the next button based on context
const nextButtonText = $derived.by(() => {
  if (isLastStep && isInSubTour) {
    return 'Return';
  }
  if (isLastStep) {
    return 'Finish';
  }
  if (branches.length > 0) {
    return 'Skip & Continue';
  }
  return 'Next';
});

// Tooltip dimensions
const TOOLTIP_WIDTH = 320;
const TOOLTIP_HEIGHT_ESTIMATE = 220; // Increased for sub-tour indicator
const OFFSET = 16; // Gap between target and tooltip
const VIEWPORT_PADDING = 16;

// All placement options to try, in order of preference per direction
type Placement = 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'right';
const PLACEMENTS: Placement[] = ['bottom', 'top', 'right', 'left', 'bottom-start', 'bottom-end', 'top-start', 'top-end'];

/**
 * Calculate position for a given placement
 */
function calculatePosition(placement: Placement, target: DOMRect): { top: number; left: number } {
  let top = 0;
  let left = 0;

  switch (placement) {
    case 'top':
      top = target.top - OFFSET - TOOLTIP_HEIGHT_ESTIMATE;
      left = target.left + target.width / 2 - TOOLTIP_WIDTH / 2;
      break;
    case 'top-start':
      top = target.top - OFFSET - TOOLTIP_HEIGHT_ESTIMATE;
      left = target.left;
      break;
    case 'top-end':
      top = target.top - OFFSET - TOOLTIP_HEIGHT_ESTIMATE;
      left = target.right - TOOLTIP_WIDTH;
      break;

    case 'bottom':
      top = target.bottom + OFFSET;
      left = target.left + target.width / 2 - TOOLTIP_WIDTH / 2;
      break;
    case 'bottom-start':
      top = target.bottom + OFFSET;
      left = target.left;
      break;
    case 'bottom-end':
      top = target.bottom + OFFSET;
      left = target.right - TOOLTIP_WIDTH;
      break;

    case 'left':
      left = target.left - OFFSET - TOOLTIP_WIDTH;
      top = target.top + target.height / 2 - TOOLTIP_HEIGHT_ESTIMATE / 2;
      break;

    case 'right':
      left = target.right + OFFSET;
      top = target.top + target.height / 2 - TOOLTIP_HEIGHT_ESTIMATE / 2;
      break;
  }

  return { top, left };
}

/**
 * Calculate overlap area between tooltip and target (for scoring placements)
 */
function calculateOverlapArea(tooltipTop: number, tooltipLeft: number, target: DOMRect): number {
  const tooltipRight = tooltipLeft + TOOLTIP_WIDTH;
  const tooltipBottom = tooltipTop + TOOLTIP_HEIGHT_ESTIMATE;

  const overlapLeft = Math.max(tooltipLeft, target.left);
  const overlapRight = Math.min(tooltipRight, target.right);
  const overlapTop = Math.max(tooltipTop, target.top);
  const overlapBottom = Math.min(tooltipBottom, target.bottom);

  if (overlapLeft >= overlapRight || overlapTop >= overlapBottom) {
    return 0;
  }

  return (overlapRight - overlapLeft) * (overlapBottom - overlapTop);
}

/**
 * Clamp position to viewport bounds
 */
function clampToViewport(top: number, left: number, viewportWidth: number, viewportHeight: number): { top: number; left: number } {
  return {
    left: Math.max(VIEWPORT_PADDING, Math.min(left, viewportWidth - TOOLTIP_WIDTH - VIEWPORT_PADDING)),
    top: Math.max(VIEWPORT_PADDING, Math.min(top, viewportHeight - TOOLTIP_HEIGHT_ESTIMATE - VIEWPORT_PADDING)),
  };
}

/**
 * Calculate the final tooltip position, ensuring it stays within viewport bounds
 * and doesn't overlay the target element.
 */
const tooltipStyle = $derived.by(() => {
  if (!targetRect) {
    // No target, center on screen
    return {
      position: 'fixed' as const,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 768;

  // Get preferred placement and its opposite
  const preferred = (step.placement || 'bottom') as Placement;

  // Build ordered list of placements to try (preferred first, then alternatives)
  const placementsToTry: Placement[] = [preferred];
  for (const p of PLACEMENTS) {
    if (!placementsToTry.includes(p)) {
      placementsToTry.push(p);
    }
  }

  // Try each placement and find the best one
  let bestPosition = { top: 0, left: 0 };
  let bestOverlapArea = Infinity;
  let foundNonOverlapping = false;

  for (const placement of placementsToTry) {
    const pos = calculatePosition(placement, targetRect);
    const clamped = clampToViewport(pos.top, pos.left, viewportWidth, viewportHeight);
    const overlapArea = calculateOverlapArea(clamped.top, clamped.left, targetRect);

    if (overlapArea === 0) {
      // Found a non-overlapping position, use it
      bestPosition = clamped;
      foundNonOverlapping = true;
      break;
    }

    // Track the position with least overlap
    if (overlapArea < bestOverlapArea) {
      bestOverlapArea = overlapArea;
      bestPosition = clamped;
    }
  }

  // If all positions overlap, try to push the tooltip away from the target
  if (!foundNonOverlapping && bestOverlapArea > 0) {
    // Find which direction has most space and push tooltip there
    const spaceAbove = targetRect.top - VIEWPORT_PADDING;
    const spaceBelow = viewportHeight - targetRect.bottom - VIEWPORT_PADDING;
    const spaceLeft = targetRect.left - VIEWPORT_PADDING;
    const spaceRight = viewportWidth - targetRect.right - VIEWPORT_PADDING;

    const maxSpace = Math.max(spaceAbove, spaceBelow, spaceLeft, spaceRight);

    if (maxSpace === spaceBelow && spaceBelow >= TOOLTIP_HEIGHT_ESTIMATE) {
      bestPosition = { top: targetRect.bottom + OFFSET, left: bestPosition.left };
    } else if (maxSpace === spaceAbove && spaceAbove >= TOOLTIP_HEIGHT_ESTIMATE) {
      bestPosition = { top: targetRect.top - OFFSET - TOOLTIP_HEIGHT_ESTIMATE, left: bestPosition.left };
    } else if (maxSpace === spaceRight && spaceRight >= TOOLTIP_WIDTH) {
      bestPosition = { top: bestPosition.top, left: targetRect.right + OFFSET };
    } else if (maxSpace === spaceLeft && spaceLeft >= TOOLTIP_WIDTH) {
      bestPosition = { top: bestPosition.top, left: targetRect.left - OFFSET - TOOLTIP_WIDTH };
    }

    // Re-clamp after adjustment
    bestPosition = clampToViewport(bestPosition.top, bestPosition.left, viewportWidth, viewportHeight);
  }

  return {
    position: 'fixed' as const,
    top: `${bestPosition.top}px`,
    left: `${bestPosition.left}px`,
    transform: 'none',
  };
});
</script>

<div
  class="spotlight-tooltip bg-popover text-popover-foreground animate-in fade-in-0 zoom-in-95 rounded-lg border shadow-lg"
  style:position={tooltipStyle.position}
  style:top={tooltipStyle.top}
  style:left={tooltipStyle.left}
  style:transform={tooltipStyle.transform}
>
  <!-- Header with step counter and skip button -->
  <div class="border-border flex items-center justify-between border-b p-3">
    <span class="text-muted-foreground text-xs font-medium">
      Step {currentIndex + 1} of {totalSteps}
    </span>
    <Button
      variant="ghost"
      size="icon"
      class="h-6 w-6"
      onclick={onSkip}
      aria-label="Skip tour"
    >
      <X class="h-4 w-4" />
    </Button>
  </div>

  <!-- Content -->
  <div class="space-y-3 p-4">
    <h3 class="text-base font-semibold">{step.title}</h3>
    <p class="text-muted-foreground text-sm leading-relaxed">
      {step.description}
    </p>
  </div>

  <!-- Progress bar -->
  <div class="px-4 pb-2">
    <Progress value={progress} class="h-1" />
  </div>

  <!-- Navigation buttons -->
  <div class="border-border flex items-center justify-between border-t p-3">
    <Button
      variant="ghost"
      size="sm"
      onclick={onPrevious}
      disabled={isFirstStep}
      class="gap-1"
    >
      <ArrowLeft class="h-4 w-4" />
      Back
    </Button>

    <div class="flex items-center gap-2">
      <!-- Branch buttons (Learn More options) -->
      {#each branches as branch}
        <Button
          variant="outline"
          size="sm"
          onclick={() => onEnterBranch?.(branch.id)}
          class="gap-1"
        >
          <BookOpen class="h-4 w-4" />
          {branch.label}
        </Button>
      {/each}

      <!-- Next/Finish/Return button -->
      <Button
        size="sm"
        onclick={onNext}
        class="gap-1"
      >
        {nextButtonText}
        {#if isLastStep && isInSubTour}
          <CornerDownRight class="h-4 w-4" />
        {:else if isLastStep}
          <Check class="h-4 w-4" />
        {:else}
          <ArrowRight class="h-4 w-4" />
        {/if}
      </Button>
    </div>
  </div>

  <!-- Sub-tour indicator -->
  {#if isInSubTour}
    <div class="bg-muted/50 text-muted-foreground border-t px-3 py-1.5 text-xs">
      <CornerDownRight class="mr-1 inline h-3 w-3" />
      Deep dive — press Next to return to main tour
    </div>
  {/if}
</div>

<style>
  .spotlight-tooltip {
    width: 320px;
    max-width: calc(100vw - 32px);
    pointer-events: auto;
    z-index: 10000;
  }
</style>
