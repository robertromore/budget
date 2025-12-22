/**
 * Svelte action for adding intelligence input mode capability to a field
 *
 * Usage:
 * ```svelte
 * <input
 *   use:intelligenceInput={{
 *     id: 'payee-name',
 *     title: 'Payee Name',
 *     modes: ['ml', 'llm'],
 *     onTrigger: async ({ mode }) => {
 *       if (mode === 'llm') {
 *         await enhanceMutation.mutateAsync({ name: value });
 *       } else {
 *         await mlMutation.mutateAsync({ name: value });
 *       }
 *     }
 *   }}
 * />
 * ```
 */

import {
  intelligenceInputMode,
  type IntelligenceTriggerDetail,
} from "$lib/states/ui/intelligence-input.svelte";

export interface IntelligenceInputOptions {
  /** Unique identifier for this field */
  id: string;
  /** Display title for the field */
  title: string;
  /** Available intelligence modes for this field */
  modes?: ("ml" | "llm")[];
  /** Optional action name for categorization */
  action?: string;
  /** Optional sort order for keyboard navigation */
  order?: number;
  /** Handler called when intelligence is triggered */
  onTrigger?: (detail: IntelligenceTriggerDetail) => Promise<void> | void;
}

/**
 * Svelte action that adds intelligence input mode capability to an element
 */
export function intelligenceInput(
  node: HTMLElement,
  options: IntelligenceInputOptions
) {
  function updateAttributes(opts: IntelligenceInputOptions) {
    node.setAttribute("data-intelligence-id", opts.id);
    node.setAttribute("data-intelligence-title", opts.title);

    if (opts.modes && opts.modes.length > 0) {
      node.setAttribute("data-intelligence-modes", opts.modes.join(","));
    } else {
      node.removeAttribute("data-intelligence-modes");
    }

    if (opts.action) {
      node.setAttribute("data-intelligence-action", opts.action);
    } else {
      node.removeAttribute("data-intelligence-action");
    }

    if (opts.order !== undefined) {
      node.setAttribute("data-intelligence-order", String(opts.order));
    } else {
      node.removeAttribute("data-intelligence-order");
    }
  }

  // Initial setup
  updateAttributes(options);

  // Register handler if provided
  let unregisterHandler: (() => void) | null = null;
  if (options.onTrigger) {
    unregisterHandler = intelligenceInputMode.registerHandler(
      options.id,
      async (detail) => {
        try {
          await options.onTrigger?.(detail);
          intelligenceInputMode.completeProcessing(options.id);
        } catch (error) {
          intelligenceInputMode.failProcessing(
            options.id,
            error instanceof Error ? error : new Error(String(error))
          );
          throw error;
        }
      }
    );
  }

  // Trigger rescan when mounted
  if (intelligenceInputMode.isActive) {
    // Small delay to ensure DOM is updated
    setTimeout(() => {
      intelligenceInputMode.scanForElements();
    }, 0);
  }

  return {
    update(newOptions: IntelligenceInputOptions) {
      // Unregister old handler if ID changed or handler changed
      if (
        unregisterHandler &&
        (newOptions.id !== options.id || newOptions.onTrigger !== options.onTrigger)
      ) {
        unregisterHandler();
        unregisterHandler = null;
      }

      // Update attributes
      updateAttributes(newOptions);

      // Register new handler if needed
      if (newOptions.onTrigger && !unregisterHandler) {
        unregisterHandler = intelligenceInputMode.registerHandler(
          newOptions.id,
          async (detail) => {
            try {
              await newOptions.onTrigger?.(detail);
              intelligenceInputMode.completeProcessing(newOptions.id);
            } catch (error) {
              intelligenceInputMode.failProcessing(
                newOptions.id,
                error instanceof Error ? error : new Error(String(error))
              );
              throw error;
            }
          }
        );
      }

      options = newOptions;
    },

    destroy() {
      // Unregister handler
      if (unregisterHandler) {
        unregisterHandler();
      }

      // Remove attributes
      node.removeAttribute("data-intelligence-id");
      node.removeAttribute("data-intelligence-title");
      node.removeAttribute("data-intelligence-modes");
      node.removeAttribute("data-intelligence-action");
      node.removeAttribute("data-intelligence-order");

      // Trigger rescan to remove this element
      if (intelligenceInputMode.isActive) {
        setTimeout(() => {
          intelligenceInputMode.scanForElements();
        }, 0);
      }
    },
  };
}

/**
 * Helper to create intelligence input options for common patterns
 */
export function createIntelligenceInputOptions(
  id: string,
  title: string,
  onTrigger: (detail: IntelligenceTriggerDetail) => Promise<void> | void,
  options?: Partial<Omit<IntelligenceInputOptions, "id" | "title" | "onTrigger">>
): IntelligenceInputOptions {
  return {
    id,
    title,
    onTrigger,
    modes: options?.modes ?? ["ml", "llm"],
    action: options?.action,
    order: options?.order,
  };
}
