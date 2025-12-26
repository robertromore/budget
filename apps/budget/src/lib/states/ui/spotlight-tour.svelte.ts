/**
 * Spotlight Tour State
 *
 * Manages the guided UI tour that highlights key features and explains
 * the interface to new users. Handles step navigation, route transitions,
 * and tour completion tracking.
 */

import { browser } from "$app/environment";
import { goto } from "$app/navigation";
import type {
  TourStep,
  TourCompletionResult,
  SpotlightConfig,
  TourBranch,
  TourChapter,
} from "$lib/types/spotlight-tour";
import { DEFAULT_SPOTLIGHT_CONFIG } from "$lib/types/spotlight-tour";

// =============================================================================
// Chapter Node (for hierarchical TOC display)
// =============================================================================

export interface ChapterNode {
  chapter: TourChapter;
  steps: Array<{
    step: TourStep;
    index: number;
  }>;
  firstStepIndex: number;
  /** Nested sub-chapters */
  children: ChapterNode[];
}

// =============================================================================
// Tour Stack Entry (for nested sub-tours)
// =============================================================================

interface TourStackEntry {
  steps: TourStep[];
  returnStepIndex: number;
  tourId: string;
}

// =============================================================================
// Core State
// =============================================================================

class SpotlightTourState {
  // Whether the tour is currently active
  #isActive = $state(false);

  // Current step index (0-based)
  #currentStepIndex = $state(0);

  // All steps in the tour
  #steps = $state<TourStep[]>([]);

  // Whether transitioning between steps (for animations)
  #isTransitioning = $state(false);

  // Configuration options
  #config = $state<SpotlightConfig>(DEFAULT_SPOTLIGHT_CONFIG);

  // Target element's bounding rect (cached for positioning)
  #targetRect = $state<DOMRect | null>(null);

  // Number of steps the user has viewed
  #stepsViewed = $state(0);

  // Callback to persist completion to backend
  #onComplete: ((result: TourCompletionResult) => Promise<void>) | null = null;

  // Tour stack for nested sub-tours (branching)
  #tourStack = $state<TourStackEntry[]>([]);

  // Sub-tours that have been completed during this tour
  #subToursCompleted = $state<string[]>([]);

  // Whether setup is currently running (for loading indicator)
  #isSettingUp = $state(false);

  // Track which steps have been visited (for TOC styling)
  #visitedSteps = $state<Set<number>>(new Set());

  // ==========================================================================
  // Getters
  // ==========================================================================

  get isActive() {
    return this.#isActive;
  }

  get currentStepIndex() {
    return this.#currentStepIndex;
  }

  get currentStep(): TourStep | null {
    return this.#steps[this.#currentStepIndex] ?? null;
  }

  get steps() {
    return this.#steps;
  }

  get totalSteps() {
    return this.#steps.length;
  }

  get isTransitioning() {
    return this.#isTransitioning;
  }

  get config() {
    return this.#config;
  }

  get targetRect() {
    return this.#targetRect;
  }

  get progress() {
    if (this.#steps.length === 0) return 0;
    return ((this.#currentStepIndex + 1) / this.#steps.length) * 100;
  }

  get isFirstStep() {
    return this.#currentStepIndex === 0;
  }

  get isLastStep() {
    return this.#currentStepIndex === this.#steps.length - 1;
  }

  get stepsViewed() {
    return this.#stepsViewed;
  }

  /** Whether we are currently in a sub-tour (drill-down) */
  get isInSubTour() {
    return this.#tourStack.length > 0;
  }

  /** How deep we are in nested tours (0 = main tour) */
  get currentTourDepth() {
    return this.#tourStack.length;
  }

  /** Whether the current step has branch options */
  get hasBranches() {
    return (this.currentStep?.branches?.length ?? 0) > 0;
  }

  /** The branches available on the current step */
  get currentBranches(): TourBranch[] {
    return this.currentStep?.branches ?? [];
  }

  /** List of sub-tours completed during this session */
  get subToursCompleted() {
    return this.#subToursCompleted;
  }

  /** Whether setup is currently running (for loading indicator) */
  get isSettingUp() {
    return this.#isSettingUp;
  }

  /** Set of step indices that have been visited */
  get visitedSteps() {
    return this.#visitedSteps;
  }

  /**
   * Get chapters with their steps for TOC display
   * Groups steps by their chapter property and builds a hierarchical tree
   *
   * Chapter IDs can use "/" for nesting:
   * - "account-tabs" (top-level)
   * - "account-tabs/import" (nested under account-tabs)
   */
  get chaptersWithSteps(): ChapterNode[] {
    // First pass: collect all chapters and their steps
    const chaptersMap = new Map<string, ChapterNode>();
    const defaultChapter: TourChapter = { id: "default", title: "Tour" };

    this.#steps.forEach((step, index) => {
      const chapterId = step.chapter || "default";

      if (!chaptersMap.has(chapterId)) {
        // Extract the leaf name from the path for the title
        const pathParts = chapterId.split("/");
        const leafName = pathParts[pathParts.length - 1];

        const chapter: TourChapter =
          chapterId === "default"
            ? defaultChapter
            : { id: chapterId, title: this.#formatChapterTitle(leafName) };

        chaptersMap.set(chapterId, {
          chapter,
          steps: [],
          firstStepIndex: index,
          children: [],
        });
      }

      chaptersMap.get(chapterId)!.steps.push({ step, index });
    });

    // Second pass: build hierarchy based on path-like IDs
    // Sort by firstStepIndex to maintain tour order (not alphabetically)
    const rootNodes: ChapterNode[] = [];
    const sortedIds = Array.from(chaptersMap.keys()).sort((a, b) => {
      const nodeA = chaptersMap.get(a)!;
      const nodeB = chaptersMap.get(b)!;
      return nodeA.firstStepIndex - nodeB.firstStepIndex;
    });

    for (const chapterId of sortedIds) {
      const node = chaptersMap.get(chapterId)!;
      const pathParts = chapterId.split("/");

      if (pathParts.length === 1) {
        // Top-level chapter
        rootNodes.push(node);
      } else {
        // Find parent chapter
        const parentPath = pathParts.slice(0, -1).join("/");
        const parentNode = chaptersMap.get(parentPath);

        if (parentNode) {
          parentNode.children.push(node);
        } else {
          // Parent doesn't exist, add as root
          rootNodes.push(node);
        }
      }
    }

    // Update firstStepIndex for parent chapters to be the min of all descendants
    this.#updateFirstStepIndices(rootNodes);

    return rootNodes;
  }

  /**
   * Recursively update firstStepIndex for parent chapters
   * to be the minimum of their own steps and all descendant steps
   */
  #updateFirstStepIndices(nodes: ChapterNode[]): number {
    let minIndex = Infinity;

    for (const node of nodes) {
      // Get min from own steps
      if (node.steps.length > 0) {
        minIndex = Math.min(minIndex, node.firstStepIndex);
      }

      // Get min from children
      if (node.children.length > 0) {
        const childMin = this.#updateFirstStepIndices(node.children);
        minIndex = Math.min(minIndex, childMin);

        // Update this node's firstStepIndex if children have earlier steps
        if (childMin < node.firstStepIndex || node.steps.length === 0) {
          node.firstStepIndex = childMin;
        }
      }
    }

    return minIndex;
  }

  /**
   * Get the chapter that the current step belongs to
   */
  get currentChapter(): string | null {
    return this.currentStep?.chapter || null;
  }

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Start the tour with the given steps
   */
  async start(
    steps: TourStep[],
    options?: {
      config?: Partial<SpotlightConfig>;
      onComplete?: (result: TourCompletionResult) => Promise<void>;
    }
  ) {
    if (!browser || steps.length === 0) return;

    this.#steps = steps;
    this.#currentStepIndex = 0;
    this.#stepsViewed = 1;
    this.#isActive = true;
    this.#onComplete = options?.onComplete ?? null;
    this.#visitedSteps = new Set([0]); // Mark first step as visited

    if (options?.config) {
      this.#config = { ...DEFAULT_SPOTLIGHT_CONFIG, ...options.config };
    }

    // Navigate to first step and highlight target
    await this.#showCurrentStep();
  }

  /**
   * Move to the next step in the tour
   */
  async next() {
    if (!this.#isActive) return;

    // Call onLeave for current step
    const currentStep = this.currentStep;
    if (currentStep?.onLeave) {
      await currentStep.onLeave();
    }

    // If at last step of a sub-tour, return to parent tour
    if (this.isLastStep && this.isInSubTour) {
      await this.returnFromSubTour();
      return;
    }

    if (this.isLastStep) {
      await this.complete();
      return;
    }

    this.#isTransitioning = true;
    this.#currentStepIndex++;
    this.#stepsViewed = Math.max(this.#stepsViewed, this.#currentStepIndex + 1);

    // Mark step as visited
    this.#visitedSteps = new Set([...this.#visitedSteps, this.#currentStepIndex]);

    await this.#showCurrentStep();
    this.#isTransitioning = false;
  }

  /**
   * Move to the previous step in the tour
   */
  async previous() {
    if (!this.#isActive || this.isFirstStep) return;

    // Call onLeave for current step
    const currentStep = this.currentStep;
    if (currentStep?.onLeave) {
      await currentStep.onLeave();
    }

    this.#isTransitioning = true;
    this.#currentStepIndex--;

    await this.#showCurrentStep();
    this.#isTransitioning = false;
  }

  /**
   * Jump to a specific step by index
   */
  async goToStep(index: number) {
    if (!this.#isActive || index < 0 || index >= this.#steps.length) return;

    // Call onLeave for current step
    const currentStep = this.currentStep;
    if (currentStep?.onLeave) {
      await currentStep.onLeave();
    }

    this.#isTransitioning = true;
    this.#currentStepIndex = index;
    this.#stepsViewed = Math.max(this.#stepsViewed, index + 1);

    // Mark step as visited
    this.#visitedSteps = new Set([...this.#visitedSteps, index]);

    await this.#showCurrentStep();
    this.#isTransitioning = false;
  }

  /**
   * Skip the tour without completing
   */
  async skip() {
    if (!this.#isActive) return;

    const result: TourCompletionResult = {
      completed: false,
      skipped: true,
      stepsViewed: this.#stepsViewed,
      totalSteps: this.#steps.length,
    };

    await this.#finishTour(result);
  }

  /**
   * Complete the tour successfully
   */
  async complete() {
    if (!this.#isActive) return;

    const result: TourCompletionResult = {
      completed: true,
      skipped: false,
      stepsViewed: this.#stepsViewed,
      totalSteps: this.#steps.length,
      subToursCompleted: this.#subToursCompleted.length > 0 ? [...this.#subToursCompleted] : undefined,
    };

    await this.#finishTour(result);
  }

  /**
   * Enter a branch/sub-tour from the current step
   */
  async enterBranch(branchId: string) {
    if (!this.#isActive) return;

    const branch = this.currentStep?.branches?.find((b) => b.id === branchId);
    if (!branch) {
      console.warn(`Branch "${branchId}" not found on current step`);
      return;
    }

    // Call onLeave for current step before branching
    const currentStep = this.currentStep;
    if (currentStep?.onLeave) {
      await currentStep.onLeave();
    }

    // Save current tour context to stack
    this.#tourStack.push({
      steps: [...this.#steps],
      returnStepIndex: this.#currentStepIndex + 1, // Return to NEXT step
      tourId: branchId,
    });

    // Load sub-tour steps (mark them as sub-tour steps)
    this.#steps = branch.subTourSteps.map((s) => ({ ...s, isSubTourStep: true }));
    this.#currentStepIndex = 0;

    this.#isTransitioning = true;
    await this.#showCurrentStep();
    this.#isTransitioning = false;
  }

  /**
   * Return from a sub-tour to the parent tour
   */
  async returnFromSubTour() {
    const parentContext = this.#tourStack.pop();
    if (!parentContext) {
      console.warn("No parent tour to return to");
      return;
    }

    // Call onLeave for current step before returning
    const currentStep = this.currentStep;
    if (currentStep?.onLeave) {
      await currentStep.onLeave();
    }

    // Track completed sub-tour
    this.#subToursCompleted.push(parentContext.tourId);

    // Restore parent tour
    this.#steps = parentContext.steps;
    this.#currentStepIndex = parentContext.returnStepIndex;

    // Handle case where we're past the last step of parent tour
    if (this.#currentStepIndex >= this.#steps.length) {
      await this.complete();
      return;
    }

    this.#isTransitioning = true;
    await this.#showCurrentStep();
    this.#isTransitioning = false;
  }

  /**
   * Force stop the tour (used for cleanup)
   */
  stop() {
    this.#isActive = false;
    this.#currentStepIndex = 0;
    this.#steps = [];
    this.#targetRect = null;
    this.#isTransitioning = false;
    this.#stepsViewed = 0;
    this.#onComplete = null;
    this.#tourStack = [];
    this.#subToursCompleted = [];
    this.#isSettingUp = false;
    this.#visitedSteps = new Set();
  }

  /**
   * Update the target rect (call when window resizes or layout changes)
   */
  updateTargetRect() {
    if (!browser || !this.currentStep) return;

    // Use the same multi-element logic as #updateTargetRectForStep
    this.#updateTargetRectForStep(this.currentStep);
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<SpotlightConfig>) {
    this.#config = { ...this.#config, ...config };
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Show the current step (navigate if needed, find element, update rect)
   */
  async #showCurrentStep() {
    const step = this.currentStep;
    if (!step) return;

    // Run setup if step has one (ensures prerequisites are met)
    // This is called for all navigation methods (next, previous, goToStep)
    if (step.setup) {
      this.#isSettingUp = true;
      await step.setup();
      this.#isSettingUp = false;
    }

    // Navigate to route if specified
    if (step.route) {
      await goto(step.route);
      // Wait for navigation and DOM update
      await this.#waitForElement(step.targetSelector);
    }

    // Call onEnter callback
    if (step.onEnter) {
      await step.onEnter();
    }

    // Scroll element into view first, then update rect after scroll completes
    await this.#scrollTargetIntoView(step);

    // Find and highlight target element (after scroll is complete)
    this.#updateTargetRectForStep(step);
  }

  /**
   * Update the target rect for a given step
   * Supports highlighting multiple elements with the same selector (e.g., a table column)
   */
  #updateTargetRectForStep(step: TourStep) {
    // Find all matching elements (for multi-element highlighting like columns)
    const elements = this.#findTargetElements(step.targetSelector);
    const rect = this.#calculateCombinedRect(elements);

    if (rect) {
      const padding = step.highlightPadding ?? this.#config.defaultPadding;

      // Apply padding to the rect
      this.#targetRect = new DOMRect(
        rect.x - padding,
        rect.y - padding,
        rect.width + padding * 2,
        rect.height + padding * 2
      );
    } else {
      // Element not found, show tooltip in center of screen
      this.#targetRect = null;
    }
  }

  /**
   * Format a chapter ID into a readable title
   * e.g., "account-tabs" -> "Account Tabs"
   */
  #formatChapterTitle(chapterId: string): string {
    return chapterId
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  /**
   * Find the target element using selector or data-tour-id
   */
  #findTargetElement(selector: string): HTMLElement | null {
    if (!browser) return null;

    // First try as a direct CSS selector
    let element = document.querySelector(selector) as HTMLElement | null;

    // If not found, try as data-tour-id
    if (!element) {
      element = document.querySelector(`[data-tour-id="${selector}"]`) as HTMLElement | null;
    }

    return element;
  }

  /**
   * Find all matching target elements (for highlighting multiple elements like a column)
   */
  #findTargetElements(selector: string): HTMLElement[] {
    if (!browser) return [];

    // First try as a direct CSS selector
    let elements = Array.from(document.querySelectorAll(selector)) as HTMLElement[];

    // If not found, try as data-tour-id
    if (elements.length === 0) {
      elements = Array.from(document.querySelectorAll(`[data-tour-id="${selector}"]`)) as HTMLElement[];
    }

    return elements;
  }

  /**
   * Calculate a combined bounding rect from multiple elements
   */
  #calculateCombinedRect(elements: HTMLElement[]): DOMRect | null {
    if (elements.length === 0) return null;

    if (elements.length === 1) {
      return elements[0].getBoundingClientRect();
    }

    // Calculate the bounding box that contains all elements
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const element of elements) {
      const rect = element.getBoundingClientRect();
      minX = Math.min(minX, rect.left);
      minY = Math.min(minY, rect.top);
      maxX = Math.max(maxX, rect.right);
      maxY = Math.max(maxY, rect.bottom);
    }

    return new DOMRect(minX, minY, maxX - minX, maxY - minY);
  }

  /**
   * Wait for an element to appear in the DOM
   */
  async #waitForElement(selector: string, timeout = 2000): Promise<HTMLElement | null> {
    if (!browser) return null;

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const element = this.#findTargetElement(selector);
      if (element) return element;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    return null;
  }

  /**
   * Scroll the target element into view and wait for scroll to complete
   */
  async #scrollTargetIntoView(step: TourStep): Promise<void> {
    const element = this.#findTargetElement(step.targetSelector);
    if (!element) return;

    // Get element's position before scrolling
    const initialRect = element.getBoundingClientRect();

    // Check if element is already in view (center of viewport)
    const viewportHeight = window.innerHeight;
    const viewportCenter = viewportHeight / 2;
    const elementCenter = initialRect.top + initialRect.height / 2;
    const isInViewCenter = Math.abs(elementCenter - viewportCenter) < viewportHeight / 4;

    if (isInViewCenter) {
      // Already in view, no scrolling needed
      return;
    }

    // Start scrolling
    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });

    // Wait for scroll to complete by monitoring position stability
    await new Promise<void>((resolve) => {
      let lastTop = initialRect.top;
      let stableCount = 0;
      const maxWaitTime = 500; // Max wait 500ms
      const startTime = Date.now();

      const checkScroll = () => {
        const currentRect = element.getBoundingClientRect();
        const currentTop = currentRect.top;

        // Check if position has stabilized (same for 3 consecutive frames)
        if (Math.abs(currentTop - lastTop) < 1) {
          stableCount++;
          if (stableCount >= 3) {
            resolve();
            return;
          }
        } else {
          stableCount = 0;
          lastTop = currentTop;
        }

        // Safety timeout
        if (Date.now() - startTime > maxWaitTime) {
          resolve();
          return;
        }

        requestAnimationFrame(checkScroll);
      };

      requestAnimationFrame(checkScroll);
    });
  }

  /**
   * Finish the tour (cleanup and persist)
   */
  async #finishTour(result: TourCompletionResult) {
    // Persist result if callback provided
    if (this.#onComplete) {
      try {
        await this.#onComplete(result);
      } catch (error) {
        console.error("Failed to persist tour completion:", error);
      }
    }

    // Reset state
    this.stop();
  }

  // ==========================================================================
  // Keyboard Handler
  // ==========================================================================

  /**
   * Handle keyboard events for tour navigation
   * Attach to svelte:window onkeydown
   */
  handleKeydown = async (e: KeyboardEvent) => {
    if (!this.#isActive) return;

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        // In sub-tour: return to parent instead of skipping entire tour
        if (this.isInSubTour) {
          await this.returnFromSubTour();
        } else {
          await this.skip();
        }
        break;

      case "ArrowRight":
      case "Enter":
        e.preventDefault();
        await this.next();
        break;

      case "ArrowLeft":
        e.preventDefault();
        await this.previous();
        break;
    }
  };

  // ==========================================================================
  // Resize Handler
  // ==========================================================================

  /**
   * Handle window resize to update target position
   */
  handleResize = () => {
    if (this.#isActive) {
      this.updateTargetRect();
    }
  };
}

// =============================================================================
// Singleton Export
// =============================================================================

export const spotlightTour = new SpotlightTourState();
