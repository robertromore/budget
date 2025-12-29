/**
 * Global Help Mode State
 *
 * Manages the interactive help overlay feature where users can:
 * - Activate help mode via header button or keyboard shortcut
 * - Hover over elements to highlight them
 * - Use keyboard navigation to cycle through documentable elements
 * - Click/Enter to view documentation in a sheet
 */

import { browser } from "$app/environment";

// =============================================================================
// Types
// =============================================================================

export interface DocumentableElement {
  helpId: string;
  element: HTMLElement;
  title?: string;
}

export interface ModalHelpContext {
  modalId: string;
  container: HTMLElement;
  elements: Map<string, HTMLElement>;
  sortedIds: string[];
  currentIndex: number;
}

// =============================================================================
// Core State
// =============================================================================

class HelpModeState {
  // Whether help mode is currently active
  #isActive = $state(false);

  // Whether the documentation sheet is open
  #isSheetOpen = $state(false);

  // Currently highlighted element's help ID
  #highlightedId = $state<string | null>(null);

  // Help ID for the currently displayed documentation
  #currentDocId = $state<string | null>(null);

  // Registry of documentable elements on the page
  #elements = $state<Map<string, HTMLElement>>(new Map());

  // Current index in the element list for keyboard navigation
  #currentIndex = $state(-1);

  // Sorted list of help IDs for navigation
  #sortedIds = $state<string[]>([]);

  // Modal help context
  #modalContext = $state<ModalHelpContext | null>(null);

  // Whether modal help mode is active (highlighting elements within a modal)
  #isModalHelpActive = $state(false);

  // ==========================================================================
  // Getters
  // ==========================================================================

  get isActive() {
    return this.#isActive;
  }

  get isSheetOpen() {
    return this.#isSheetOpen;
  }

  get highlightedId() {
    return this.#highlightedId;
  }

  get currentDocId() {
    return this.#currentDocId;
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

  get modalContext() {
    return this.#modalContext;
  }

  get isModalHelpActive() {
    return this.#isModalHelpActive;
  }

  get modalElements() {
    return this.#modalContext?.elements ?? new Map();
  }

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Activate help mode and scan for documentable elements
   */
  activate() {
    if (!browser) return;

    this.#isActive = true;
    this.scanForElements();
  }

  /**
   * Deactivate help mode and reset state
   * Note: Sheet stays open with current content so user can continue reading
   */
  deactivate() {
    this.#isActive = false;
    this.#highlightedId = null;
    this.#currentIndex = -1;
    // Keep sheet open and current doc - user can close it manually
    // this.#isSheetOpen = false;
    // this.#currentDocId = null;
    // Also clear modal context
    this.#modalContext = null;
    this.#isModalHelpActive = false;
  }

  /**
   * Toggle help mode on/off
   */
  toggle() {
    if (this.#isActive) {
      this.deactivate();
    } else {
      this.activate();
    }
  }

  /**
   * Scan the DOM for elements with data-help-id attribute
   */
  scanForElements() {
    if (!browser) return;

    this.#elements.clear();
    const elements = document.querySelectorAll("[data-help-id]");

    elements.forEach((el) => {
      const helpId = el.getAttribute("data-help-id");
      if (helpId) {
        this.#elements.set(helpId, el as HTMLElement);
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
        // Check for explicit order attribute
        const order = el.getAttribute("data-help-order");
        const sortKey = order
          ? parseInt(order, 10)
          : rect.top * 10000 + rect.left;
        return { id, sortKey };
      })
      .sort((a, b) => a.sortKey - b.sortKey)
      .map((item) => item.id);
  }

  /**
   * Highlight a specific element by help ID
   */
  highlightElement(helpId: string | null) {
    this.#highlightedId = helpId;

    if (helpId) {
      this.#currentIndex = this.#sortedIds.indexOf(helpId);
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

  /**
   * Open the documentation sheet for a specific help ID
   */
  openDocumentation(helpId: string) {
    this.#currentDocId = helpId;
    this.#isSheetOpen = true;
  }

  /**
   * Open documentation for the currently highlighted element
   */
  openHighlightedDocumentation() {
    if (this.#highlightedId) {
      this.openDocumentation(this.#highlightedId);
    }
  }

  /**
   * Close the documentation sheet
   */
  closeSheet() {
    this.#isSheetOpen = false;
    // Keep currentDocId for potential "reopen" functionality
  }

  // ==========================================================================
  // Modal Help Actions
  // ==========================================================================

  /**
   * Set up modal context when a modal opens
   * Called by ModalHelpProvider when modal mounts
   */
  setModalContext(modalId: string, container: HTMLElement) {
    this.#modalContext = {
      modalId,
      container,
      elements: new Map(),
      sortedIds: [],
      currentIndex: -1,
    };

    // Scan for elements within the modal
    this.scanModalElements();

    // Automatically enable modal help mode so keyboard navigation works immediately
    this.#isModalHelpActive = true;
  }

  /**
   * Clear modal context when modal closes
   */
  clearModalContext() {
    this.#modalContext = null;
    this.#isModalHelpActive = false;
  }

  /**
   * Toggle element highlighting within the modal
   */
  toggleModalHelp() {
    if (!this.#modalContext) return;

    this.#isModalHelpActive = !this.#isModalHelpActive;

    if (this.#isModalHelpActive) {
      // Re-scan in case elements changed
      this.scanModalElements();
    } else {
      // Clear highlighted element when turning off
      this.#highlightedId = null;
    }
  }

  /**
   * Enable modal help mode (element highlighting within modal)
   */
  enterModalHelpMode() {
    if (!this.#modalContext) return;
    this.#isModalHelpActive = true;
    this.scanModalElements();
  }

  /**
   * Disable modal help mode
   */
  exitModalHelpMode() {
    this.#isModalHelpActive = false;
    this.#highlightedId = null;
  }

  /**
   * Scan for elements within the current modal container
   */
  scanModalElements() {
    if (!this.#modalContext) return;

    const { container } = this.#modalContext;
    this.#modalContext.elements.clear();

    const elements = container.querySelectorAll("[data-help-id]");
    elements.forEach((el) => {
      const helpId = el.getAttribute("data-help-id");
      if (helpId) {
        this.#modalContext!.elements.set(helpId, el as HTMLElement);
      }
    });

    // Sort by visual position within modal
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
        const order = el.getAttribute("data-help-order");
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
    if (!this.#modalContext || this.#modalContext.sortedIds.length === 0) return;

    this.#modalContext.currentIndex =
      (this.#modalContext.currentIndex + 1) % this.#modalContext.sortedIds.length;
    this.#highlightedId = this.#modalContext.sortedIds[this.#modalContext.currentIndex];
  }

  /**
   * Navigate to previous element within modal
   */
  navigatePreviousInModal() {
    if (!this.#modalContext || this.#modalContext.sortedIds.length === 0) return;

    const len = this.#modalContext.sortedIds.length;
    this.#modalContext.currentIndex =
      (this.#modalContext.currentIndex - 1 + len) % len;
    this.#highlightedId = this.#modalContext.sortedIds[this.#modalContext.currentIndex];
  }

  /**
   * Open a modal with help - triggers the button click and sets up help
   * This is called when clicking a button with data-help-modal attribute
   */
  async openModalWithHelp(modalId: string, triggerElement: HTMLElement) {
    // First, temporarily disable help mode to allow the click to work
    const wasActive = this.#isActive;

    // Click the actual trigger to open the modal
    // The modal's ModalHelpProvider will call setModalContext when it mounts
    triggerElement.click();

    // Re-enable help mode if it was active
    if (wasActive) {
      this.#isActive = true;
    }

    // Wait for modal to mount and call setModalContext
    // The ModalHelpProvider component handles this automatically
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

  /**
   * Get the element for a given help ID
   */
  getElement(helpId: string): HTMLElement | undefined {
    return this.#elements.get(helpId);
  }

  /**
   * Get the bounding rect for a help ID's element
   */
  getElementRect(helpId: string): DOMRect | null {
    const el = this.#elements.get(helpId);
    return el ? el.getBoundingClientRect() : null;
  }

  /**
   * Get the title for a help ID (from data-help-title attribute)
   */
  getElementTitle(helpId: string): string {
    const el = this.#elements.get(helpId);
    return el?.getAttribute("data-help-title") || helpId;
  }

  // ==========================================================================
  // Keyboard Handler
  // ==========================================================================

  /**
   * Handle keyboard events for help mode
   * Attach to svelte:window onkeydown
   */
  handleKeydown = (e: KeyboardEvent) => {
    // Toggle help mode with Ctrl/Cmd + Shift + /
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "/") {
      e.preventDefault();
      this.toggle();
      return;
    }

    // Only handle other keys when help mode is active
    if (!this.#isActive) return;

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        // Layered escape: modal help → modal → sheet → main help mode
        if (this.#isModalHelpActive) {
          this.exitModalHelpMode();
        } else if (this.#modalContext) {
          this.clearModalContext();
        } else if (this.#isSheetOpen) {
          this.closeSheet();
        } else {
          this.deactivate();
        }
        break;

      case "Tab":
        e.preventDefault();
        if (this.#isModalHelpActive && this.#modalContext) {
          // Navigate within modal
          if (e.shiftKey) {
            this.navigatePreviousInModal();
          } else {
            this.navigateNextInModal();
          }
        } else {
          // Navigate main elements
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
        if (this.#isModalHelpActive && this.#modalContext) {
          this.navigateNextInModal();
        } else {
          this.navigateNext();
        }
        break;

      case "ArrowUp":
      case "ArrowLeft":
        e.preventDefault();
        if (this.#isModalHelpActive && this.#modalContext) {
          this.navigatePreviousInModal();
        } else {
          this.navigatePrevious();
        }
        break;

      case "Enter":
        e.preventDefault();
        this.openHighlightedDocumentation();
        break;
    }
  };
}

// =============================================================================
// Singleton Export
// =============================================================================

export const helpMode = new HelpModeState();
