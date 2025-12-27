/**
 * Global Intelligence Input Mode State
 *
 * Manages the intelligence input overlay feature where users can:
 * - Activate intelligence mode via header button or keyboard shortcut (Cmd/Ctrl+Shift+I)
 * - See form inputs capable of ML/LLM enhancement highlighted in purple
 * - Click/Enter to trigger intelligence actions directly
 * - Navigate between intelligence-capable fields with keyboard
 */

import { browser } from "$app/environment";

// =============================================================================
// Types
// =============================================================================

export interface FieldIntelligenceState {
  lastMode: "ml" | "llm" | null;
  lastUsed: Date | null;
}

export interface IntelligenceElement {
  inputId: string;
  element: HTMLElement;
  title?: string;
  modes: ("ml" | "llm")[];
  action?: string;
}

export interface ModalIntelligenceContext {
  modalId: string;
  container: HTMLElement;
  elements: Map<string, HTMLElement>;
  sortedIds: string[];
  currentIndex: number;
}

export interface IntelligenceTriggerDetail {
  inputId: string;
  action: string | null;
  handler: string | null;
  mode: "ml" | "llm";
}

export type IntelligenceHandler = (detail: IntelligenceTriggerDetail) => Promise<void> | void;

// =============================================================================
// Core State
// =============================================================================

class IntelligenceInputModeState {
  // Whether intelligence input mode is currently active
  #isActive = $state(false);

  // Whether the feature is enabled in settings
  #isEnabled = $state(true);

  // Whether LLM features are enabled in settings
  #isLLMEnabled = $state(false);

  // Currently highlighted element's input ID
  #highlightedId = $state<string | null>(null);

  // Registry of intelligence-capable elements on the page
  #elements = $state<Map<string, HTMLElement>>(new Map());

  // Current index in the element list for keyboard navigation
  #currentIndex = $state(-1);

  // Sorted list of input IDs for navigation
  #sortedIds = $state<string[]>([]);

  // Per-field mode memory (ml or llm)
  #fieldModes = $state<Map<string, FieldIntelligenceState>>(new Map());

  // Currently processing element ID (for single field processing)
  #processingId = $state<string | null>(null);

  // Set of IDs currently being processed (for parallel processing)
  #processingIds = $state<Set<string>>(new Set());

  // Whether we're processing all elements
  #isProcessingAll = $state(false);

  // Set of IDs that have been processed during "apply all"
  #processedIds = $state<Set<string>>(new Set());

  // Modal intelligence context
  #modalContext = $state<ModalIntelligenceContext | null>(null);

  // Whether modal intelligence mode is active
  #isModalIntelligenceActive = $state(false);

  // Default mode from settings
  #defaultMode = $state<"ml" | "llm" | "auto">("auto");

  // Registered handlers for intelligence actions
  #handlers = new Map<string, IntelligenceHandler>();

  // ==========================================================================
  // Getters
  // ==========================================================================

  get isActive() {
    return this.#isActive;
  }

  get isEnabled() {
    return this.#isEnabled;
  }

  get isLLMEnabled() {
    return this.#isLLMEnabled;
  }

  get highlightedId() {
    return this.#highlightedId;
  }

  get elements() {
    return this.#elements;
  }

  get elementCount() {
    return this.#elements.size;
  }

  get currentIndex() {
    return this.#currentIndex;
  }

  get processingId() {
    return this.#processingId;
  }

  get processingIds() {
    return this.#processingIds;
  }

  /**
   * Check if a specific field is currently being processed
   */
  isProcessing(inputId: string): boolean {
    return this.#processingId === inputId || this.#processingIds.has(inputId);
  }

  get isProcessingAll() {
    return this.#isProcessingAll;
  }

  get processedCount() {
    return this.#processedIds.size;
  }

  get modalContext() {
    return this.#modalContext;
  }

  get isModalIntelligenceActive() {
    return this.#isModalIntelligenceActive;
  }

  get modalElements() {
    return this.#modalContext?.elements ?? new Map();
  }

  get defaultMode() {
    return this.#defaultMode;
  }

  // ==========================================================================
  // Settings
  // ==========================================================================

  /**
   * Set whether the feature is enabled
   */
  setEnabled(enabled: boolean) {
    this.#isEnabled = enabled;
    if (!enabled && this.#isActive) {
      this.deactivate();
    }
  }

  /**
   * Set whether LLM features are enabled
   */
  setLLMEnabled(enabled: boolean) {
    this.#isLLMEnabled = enabled;
  }

  /**
   * Set the default mode from settings
   */
  setDefaultMode(mode: "ml" | "llm" | "auto") {
    this.#defaultMode = mode;
  }

  /**
   * Load field modes from persisted settings
   */
  loadFieldModes(modes: Record<string, "ml" | "llm">) {
    this.#fieldModes.clear();
    for (const [inputId, mode] of Object.entries(modes)) {
      this.#fieldModes.set(inputId, { lastMode: mode, lastUsed: null });
    }
  }

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Activate intelligence input mode and scan for elements
   */
  activate() {
    if (!browser || !this.#isEnabled) return;

    this.#isActive = true;
    this.scanForElements();
  }

  /**
   * Deactivate intelligence input mode and reset state
   */
  deactivate() {
    this.#isActive = false;
    this.#highlightedId = null;
    this.#currentIndex = -1;
    this.#processingId = null;
    this.#modalContext = null;
    this.#isModalIntelligenceActive = false;
  }

  /**
   * Toggle intelligence input mode on/off
   */
  toggle() {
    if (this.#isActive) {
      this.deactivate();
    } else {
      this.activate();
    }
  }

  /**
   * Scan the DOM for elements with data-intelligence-id attribute
   */
  scanForElements() {
    if (!browser) return;

    this.#elements.clear();
    const elements = document.querySelectorAll("[data-intelligence-id]");

    elements.forEach((el) => {
      const inputId = el.getAttribute("data-intelligence-id");
      if (inputId) {
        this.#elements.set(inputId, el as HTMLElement);
      }
    });

    // Sort by visual position (top to bottom, left to right)
    this.#sortedIds = this.getSortedElementIds();
  }

  /**
   * Get element IDs sorted by visual position
   */
  private getSortedElementIds(): string[] {
    const entries = Array.from(this.#elements.entries());

    return entries
      .map(([id, el]) => {
        const rect = el.getBoundingClientRect();
        const order = el.getAttribute("data-intelligence-order");
        const sortKey = order
          ? parseInt(order, 10)
          : rect.top * 10000 + rect.left;
        return { id, sortKey };
      })
      .sort((a, b) => a.sortKey - b.sortKey)
      .map((item) => item.id);
  }

  /**
   * Highlight a specific element by input ID
   */
  highlightElement(inputId: string | null) {
    this.#highlightedId = inputId;

    if (inputId) {
      this.#currentIndex = this.#sortedIds.indexOf(inputId);
    }
  }

  /**
   * Navigate to the next element in the list
   */
  navigateNext() {
    if (this.#sortedIds.length === 0) return;

    this.#currentIndex = (this.#currentIndex + 1) % this.#sortedIds.length;
    this.#highlightedId = this.#sortedIds[this.#currentIndex];
    this.scrollHighlightedIntoView();
  }

  /**
   * Navigate to the previous element in the list
   */
  navigatePrevious() {
    if (this.#sortedIds.length === 0) return;

    this.#currentIndex =
      (this.#currentIndex - 1 + this.#sortedIds.length) %
      this.#sortedIds.length;
    this.#highlightedId = this.#sortedIds[this.#currentIndex];
    this.scrollHighlightedIntoView();
  }

  /**
   * Scroll the currently highlighted element into view
   */
  private scrollHighlightedIntoView() {
    if (!this.#highlightedId) return;

    const el = this.#elements.get(this.#highlightedId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  // ==========================================================================
  // Field Mode Management
  // ==========================================================================

  /**
   * Get the mode for a specific field
   */
  getFieldMode(inputId: string): "ml" | "llm" {
    const fieldState = this.#fieldModes.get(inputId);
    if (fieldState?.lastMode) {
      // If LLM was selected but LLM is disabled, fall back to ML
      if (fieldState.lastMode === "llm" && !this.#isLLMEnabled) {
        return "ml";
      }
      return fieldState.lastMode;
    }

    // Fall back to default mode
    if (this.#defaultMode === "auto") {
      // Auto defaults to ML
      return "ml";
    }
    // If default is LLM but LLM is disabled, use ML
    if (this.#defaultMode === "llm" && !this.#isLLMEnabled) {
      return "ml";
    }
    return this.#defaultMode;
  }

  /**
   * Set the mode for a specific field
   */
  setFieldMode(inputId: string, mode: "ml" | "llm") {
    this.#fieldModes.set(inputId, {
      lastMode: mode,
      lastUsed: new Date(),
    });
  }

  /**
   * Get all field modes for persistence
   */
  getFieldModesForPersistence(): Record<string, "ml" | "llm"> {
    const result: Record<string, "ml" | "llm"> = {};
    for (const [inputId, state] of this.#fieldModes.entries()) {
      if (state.lastMode) {
        result[inputId] = state.lastMode;
      }
    }
    return result;
  }

  // ==========================================================================
  // Handler Registration
  // ==========================================================================

  /**
   * Register a handler for a specific input ID
   * Forms can register handlers to respond to intelligence triggers
   */
  registerHandler(inputId: string, handler: IntelligenceHandler): () => void {
    this.#handlers.set(inputId, handler);
    // Return unregister function
    return () => {
      this.#handlers.delete(inputId);
    };
  }

  /**
   * Register handlers for multiple input IDs
   * Returns unregister function that removes all handlers
   */
  registerHandlers(
    handlers: Record<string, IntelligenceHandler>
  ): () => void {
    const unregisters: (() => void)[] = [];
    for (const [inputId, handler] of Object.entries(handlers)) {
      unregisters.push(this.registerHandler(inputId, handler));
    }
    return () => unregisters.forEach((fn) => fn());
  }

  // ==========================================================================
  // Intelligence Triggering
  // ==========================================================================

  /**
   * Trigger intelligence action for a specific field
   */
  async triggerIntelligence(inputId: string): Promise<void> {
    if (this.#processingId) return; // Already processing

    const element = this.#elements.get(inputId);
    if (!element) return;

    const handlerName = element.getAttribute("data-intelligence-handler");
    const action = element.getAttribute("data-intelligence-action");
    const mode = this.getFieldMode(inputId);

    this.#processingId = inputId;

    const detail: IntelligenceTriggerDetail = {
      inputId,
      action,
      handler: handlerName,
      mode,
    };

    try {
      // First, try registered handler
      const registeredHandler = this.#handlers.get(inputId);
      if (registeredHandler) {
        await registeredHandler(detail);
      } else {
        // Fall back to dispatching a custom event for legacy/unregistered handlers
        const event = new CustomEvent("intelligence-trigger", {
          bubbles: true,
          detail,
        });
        element.dispatchEvent(event);
      }

      // Update last used timestamp
      const fieldState = this.#fieldModes.get(inputId) ?? {
        lastMode: mode,
        lastUsed: null,
      };
      fieldState.lastUsed = new Date();
      this.#fieldModes.set(inputId, fieldState);
    } catch (error) {
      // Handler threw an error, clear processing immediately
      console.error(`Intelligence handler error for ${inputId}:`, error);
      this.#processingId = null;
      throw error;
    }
  }

  /**
   * Signal that processing has completed for a field
   * Called by forms when their mutation completes
   */
  completeProcessing(inputId?: string) {
    if (inputId === undefined || inputId === this.#processingId) {
      this.#processingId = null;
    }
  }

  /**
   * Signal that processing failed for a field
   */
  failProcessing(inputId?: string, error?: Error) {
    if (inputId === undefined || inputId === this.#processingId) {
      this.#processingId = null;
    }
    if (error) {
      console.error(`Intelligence processing failed for ${inputId}:`, error);
    }
  }

  /**
   * Trigger intelligence for the currently highlighted element
   */
  async triggerHighlightedIntelligence(): Promise<void> {
    if (this.#highlightedId) {
      await this.triggerIntelligence(this.#highlightedId);
    }
  }

  /**
   * Trigger intelligence for all registered elements in parallel
   * Uses Promise.allSettled to run all handlers concurrently
   */
  async triggerAllIntelligence(): Promise<void> {
    if (this.#isProcessingAll || this.#processingId || this.#processingIds.size > 0) return;

    const ids = this.#sortedIds.length > 0 ? this.#sortedIds : Array.from(this.#elements.keys());
    if (ids.length === 0) return;

    this.#isProcessingAll = true;
    this.#processedIds = new Set();
    this.#processingIds = new Set(ids);

    try {
      // Run all intelligence triggers in parallel
      const results = await Promise.allSettled(
        ids.map((inputId) => this.triggerIntelligenceForAll(inputId))
      );

      // Log any failures
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(`Failed to process ${ids[index]}:`, result.reason);
        }
      });
    } finally {
      this.#isProcessingAll = false;
      this.#processingIds = new Set();
      this.#highlightedId = null;
    }
  }

  /**
   * Internal method to trigger intelligence during "apply all" flow
   * Tracks processing state per-field for parallel execution
   */
  private async triggerIntelligenceForAll(inputId: string): Promise<void> {
    const element = this.#elements.get(inputId);
    if (!element) return;

    const handlerName = element.getAttribute("data-intelligence-handler");
    const action = element.getAttribute("data-intelligence-action");
    const mode = this.getFieldMode(inputId);

    const detail: IntelligenceTriggerDetail = {
      inputId,
      action,
      handler: handlerName,
      mode,
    };

    try {
      // First, try registered handler
      const registeredHandler = this.#handlers.get(inputId);
      if (registeredHandler) {
        await registeredHandler(detail);
      } else {
        // Fall back to dispatching a custom event for legacy/unregistered handlers
        const event = new CustomEvent("intelligence-trigger", {
          bubbles: true,
          detail,
        });
        element.dispatchEvent(event);
      }

      // Update last used timestamp
      const fieldState = this.#fieldModes.get(inputId) ?? {
        lastMode: mode,
        lastUsed: null,
      };
      fieldState.lastUsed = new Date();
      this.#fieldModes.set(inputId, fieldState);

      // Mark as processed
      this.#processedIds.add(inputId);
    } finally {
      // Remove from processing set
      this.#processingIds.delete(inputId);
    }
  }

  // ==========================================================================
  // Modal Intelligence Actions
  // ==========================================================================

  /**
   * Set up modal context when a modal opens
   */
  setModalContext(modalId: string, container: HTMLElement) {
    this.#modalContext = {
      modalId,
      container,
      elements: new Map(),
      sortedIds: [],
      currentIndex: -1,
    };

    this.scanModalElements();
    this.#isModalIntelligenceActive = true;
  }

  /**
   * Clear modal context when modal closes
   */
  clearModalContext() {
    this.#modalContext = null;
    this.#isModalIntelligenceActive = false;
  }

  /**
   * Toggle element highlighting within the modal
   */
  toggleModalIntelligence() {
    if (!this.#modalContext) return;

    this.#isModalIntelligenceActive = !this.#isModalIntelligenceActive;

    if (this.#isModalIntelligenceActive) {
      this.scanModalElements();
    } else {
      this.#highlightedId = null;
    }
  }

  /**
   * Scan for elements within the current modal container
   */
  scanModalElements() {
    if (!this.#modalContext) return;

    const { container } = this.#modalContext;
    this.#modalContext.elements.clear();

    const elements = container.querySelectorAll("[data-intelligence-id]");
    elements.forEach((el) => {
      const inputId = el.getAttribute("data-intelligence-id");
      if (inputId) {
        this.#modalContext!.elements.set(inputId, el as HTMLElement);
      }
    });

    this.#modalContext.sortedIds = this.getSortedModalElementIds();
  }

  /**
   * Get modal element IDs sorted by visual position
   */
  private getSortedModalElementIds(): string[] {
    if (!this.#modalContext) return [];

    const entries = Array.from(this.#modalContext.elements.entries());
    return entries
      .map(([id, el]) => {
        const rect = el.getBoundingClientRect();
        const order = el.getAttribute("data-intelligence-order");
        const sortKey = order
          ? parseInt(order, 10)
          : rect.top * 10000 + rect.left;
        return { id, sortKey };
      })
      .sort((a, b) => a.sortKey - b.sortKey)
      .map((item) => item.id);
  }

  /**
   * Navigate to next element within modal
   */
  navigateNextInModal() {
    if (!this.#modalContext || this.#modalContext.sortedIds.length === 0)
      return;

    this.#modalContext.currentIndex =
      (this.#modalContext.currentIndex + 1) %
      this.#modalContext.sortedIds.length;
    this.#highlightedId =
      this.#modalContext.sortedIds[this.#modalContext.currentIndex];
  }

  /**
   * Navigate to previous element within modal
   */
  navigatePreviousInModal() {
    if (!this.#modalContext || this.#modalContext.sortedIds.length === 0)
      return;

    const len = this.#modalContext.sortedIds.length;
    this.#modalContext.currentIndex =
      (this.#modalContext.currentIndex - 1 + len) % len;
    this.#highlightedId =
      this.#modalContext.sortedIds[this.#modalContext.currentIndex];
  }

  /**
   * Check if we're currently in a modal context
   */
  hasModalContext(): boolean {
    return this.#modalContext !== null;
  }

  /**
   * Get the current modal ID
   */
  getCurrentModalId(): string | null {
    return this.#modalContext?.modalId ?? null;
  }

  // ==========================================================================
  // Element Helpers
  // ==========================================================================

  /**
   * Get the element for a given input ID
   */
  getElement(inputId: string): HTMLElement | undefined {
    return this.#elements.get(inputId);
  }

  /**
   * Get the bounding rect for an input ID's element
   */
  getElementRect(inputId: string): DOMRect | null {
    const el = this.#elements.get(inputId);
    return el ? el.getBoundingClientRect() : null;
  }

  /**
   * Get the title for an input ID (from data-intelligence-title attribute)
   */
  getElementTitle(inputId: string): string {
    const el = this.#elements.get(inputId);
    return el?.getAttribute("data-intelligence-title") || inputId;
  }

  /**
   * Get available modes for an input ID
   */
  getElementModes(inputId: string): ("ml" | "llm")[] {
    const el = this.#elements.get(inputId);
    const modesAttr = el?.getAttribute("data-intelligence-modes");
    let modes: ("ml" | "llm")[];
    if (!modesAttr) {
      modes = ["ml", "llm"];
    } else {
      modes = modesAttr.split(",").filter((m) => m === "ml" || m === "llm") as (
        | "ml"
        | "llm"
      )[];
    }
    // Filter out LLM if it's not enabled
    if (!this.#isLLMEnabled) {
      return modes.filter((m) => m !== "llm");
    }
    return modes;
  }

  // ==========================================================================
  // Keyboard Handler
  // ==========================================================================

  /**
   * Handle keyboard events for intelligence input mode
   * Attach to svelte:window onkeydown
   */
  handleKeydown = (e: KeyboardEvent) => {
    // Toggle intelligence mode with Cmd/Ctrl + Shift + I
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "I") {
      e.preventDefault();
      this.toggle();
      return;
    }

    // Only handle other keys when intelligence mode is active
    if (!this.#isActive) return;

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        // Layered escape: modal intelligence -> modal -> main mode
        if (this.#isModalIntelligenceActive) {
          this.#isModalIntelligenceActive = false;
          this.#highlightedId = null;
        } else if (this.#modalContext) {
          this.clearModalContext();
        } else {
          this.deactivate();
        }
        break;

      case "Tab":
        e.preventDefault();
        if (this.#isModalIntelligenceActive && this.#modalContext) {
          if (e.shiftKey) {
            this.navigatePreviousInModal();
          } else {
            this.navigateNextInModal();
          }
        } else {
          if (e.shiftKey) {
            this.navigatePrevious();
          } else {
            this.navigateNext();
          }
        }
        break;

      case "ArrowDown":
      case "ArrowRight":
        e.preventDefault();
        if (this.#isModalIntelligenceActive && this.#modalContext) {
          this.navigateNextInModal();
        } else {
          this.navigateNext();
        }
        break;

      case "ArrowUp":
      case "ArrowLeft":
        e.preventDefault();
        if (this.#isModalIntelligenceActive && this.#modalContext) {
          this.navigatePreviousInModal();
        } else {
          this.navigatePrevious();
        }
        break;

      case "Enter":
        e.preventDefault();
        this.triggerHighlightedIntelligence();
        break;

      case "m":
      case "M":
        // Switch highlighted field to ML mode
        if (this.#highlightedId) {
          e.preventDefault();
          this.setFieldMode(this.#highlightedId, "ml");
        }
        break;

      case "l":
      case "L":
        // Switch highlighted field to LLM mode (only if LLM is enabled)
        if (this.#highlightedId && this.#isLLMEnabled) {
          e.preventDefault();
          this.setFieldMode(this.#highlightedId, "llm");
        }
        break;

      case "a":
      case "A":
        // Trigger intelligence on all fields
        if (!e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          this.triggerAllIntelligence();
        }
        break;
    }
  };
}

// =============================================================================
// Singleton Export
// =============================================================================

export const intelligenceInputMode = new IntelligenceInputModeState();
