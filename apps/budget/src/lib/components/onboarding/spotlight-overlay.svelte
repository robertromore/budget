<script lang="ts">
/**
 * Spotlight Overlay
 *
 * Creates a dimmed backdrop with a spotlight cutout highlighting
 * the current tour step's target element.
 */
import { spotlightTour } from '$lib/states/ui/spotlight-tour.svelte';
import { onMount, onDestroy } from 'svelte';
import SpotlightTooltip from './spotlight-tooltip.svelte';
import TourTableOfContents from './tour-table-of-contents.svelte';

// Get current step and target rect from state
const isActive = $derived(spotlightTour.isActive);
const currentStep = $derived(spotlightTour.currentStep);
const targetRect = $derived(spotlightTour.targetRect);
const config = $derived(spotlightTour.config);
const isTransitioning = $derived(spotlightTour.isTransitioning);
const hideOverlay = $derived(currentStep?.hideOverlay ?? false);

// Window dimensions for the overlay
let windowWidth = $state(0);
let windowHeight = $state(0);

// Set up keyboard, resize, and scroll handlers
onMount(() => {
  windowWidth = window.innerWidth;
  windowHeight = window.innerHeight;

  window.addEventListener('keydown', spotlightTour.handleKeydown);
  window.addEventListener('resize', handleResize);
  window.addEventListener('scroll', handleScroll, true); // Use capture to catch all scroll events

  return () => {
    window.removeEventListener('keydown', spotlightTour.handleKeydown);
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('scroll', handleScroll, true);
  };
});

function handleResize() {
  windowWidth = window.innerWidth;
  windowHeight = window.innerHeight;
  spotlightTour.handleResize();
}

function handleScroll() {
  // Update target rect when any scrollable element scrolls
  spotlightTour.updateTargetRect();
}

// Generate the SVG path for the overlay with spotlight cutout
const overlayPath = $derived.by(() => {
  if (!targetRect) {
    // No target, full overlay
    return `M 0 0 L ${windowWidth} 0 L ${windowWidth} ${windowHeight} L 0 ${windowHeight} Z`;
  }

  const x = targetRect.x;
  const y = targetRect.y;
  const w = targetRect.width;
  const h = targetRect.height;
  const r = config.spotlightBorderRadius;

  // Outer rectangle (full screen)
  const outer = `M 0 0 L ${windowWidth} 0 L ${windowWidth} ${windowHeight} L 0 ${windowHeight} Z`;

  // Inner rounded rectangle (spotlight cutout) - drawn counter-clockwise
  const inner = `
    M ${x + r} ${y}
    L ${x + w - r} ${y}
    Q ${x + w} ${y} ${x + w} ${y + r}
    L ${x + w} ${y + h - r}
    Q ${x + w} ${y + h} ${x + w - r} ${y + h}
    L ${x + r} ${y + h}
    Q ${x} ${y + h} ${x} ${y + h - r}
    L ${x} ${y + r}
    Q ${x} ${y} ${x + r} ${y}
    Z
  `;

  return outer + ' ' + inner;
});

// Handle clicking outside the spotlight (skip behavior)
function handleOverlayClick(e: MouseEvent) {
  if (!config.allowClickOutsideToSkip) return;

  // Check if click is outside the spotlight area
  if (targetRect) {
    const x = e.clientX;
    const y = e.clientY;
    if (
      x >= targetRect.x &&
      x <= targetRect.x + targetRect.width &&
      y >= targetRect.y &&
      y <= targetRect.y + targetRect.height
    ) {
      // Click inside spotlight, do nothing
      return;
    }
  }

  // Click outside spotlight, skip tour
  spotlightTour.skip();
}
</script>

{#if isActive && currentStep}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="spotlight-overlay"
    class:is-transitioning={isTransitioning}
    class:no-overlay={hideOverlay}
    onclick={handleOverlayClick}
  >
    <!-- SVG overlay with spotlight cutout (hidden when hideOverlay is true) -->
    {#if !hideOverlay}
      <svg
        class="spotlight-svg"
        viewBox="0 0 {windowWidth} {windowHeight}"
        preserveAspectRatio="none"
      >
        <path
          d={overlayPath}
          fill={config.overlayColor}
          fill-rule="evenodd"
        />
      </svg>
    {/if}

    <!-- Tooltip positioned relative to target -->
    <SpotlightTooltip
      step={currentStep}
      targetRect={targetRect}
      currentIndex={spotlightTour.currentStepIndex}
      totalSteps={spotlightTour.totalSteps}
      progress={spotlightTour.progress}
      isFirstStep={spotlightTour.isFirstStep}
      isLastStep={spotlightTour.isLastStep}
      branches={currentStep?.branches}
      isInSubTour={spotlightTour.isInSubTour}
      onPrevious={() => spotlightTour.previous()}
      onNext={() => spotlightTour.next()}
      onSkip={() => spotlightTour.skip()}
      onEnterBranch={(branchId) => spotlightTour.enterBranch(branchId)}
    />

    <!-- Table of Contents for navigation -->
    <TourTableOfContents />
  </div>
{/if}

<style>
  .spotlight-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    pointer-events: auto;
    transition: opacity 0.3s ease;
  }

  .spotlight-overlay.is-transitioning {
    opacity: 0.5;
  }

  /* When overlay is hidden, don't block interactions with the content */
  .spotlight-overlay.no-overlay {
    pointer-events: none;
  }

  .spotlight-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .spotlight-svg path {
    transition: d 0.3s ease;
  }
</style>
