import { shouldPersistToLocalStorage } from "$lib/utils/local-storage.svelte";

/**
 * Layout mode for the floor-plan toolbar.
 *
 * - `grouped`:   Buttons collapse into 9 groups, each showing its last-used
 *                tool. A chevron-popover reveals the other tools in the
 *                group. Compact (9 buttons), higher discovery cost.
 * - `expanded`:  Every tool visible at once (21 buttons) with dividers
 *                between groups. Always-on-screen, wider.
 */
export type FloorPlanToolbarLayout = "grouped" | "expanded";

const LAYOUT_STORAGE_KEY = "floor-plan-toolbar-layout";
const GROUP_TOOL_STORAGE_KEY = "floor-plan-toolbar-group-tools";

const DEFAULT_LAYOUT: FloorPlanToolbarLayout = "grouped";

/**
 * Persist the "representative" tool per group so that, in grouped mode,
 * the tool you picked last stays promoted on the main row after a
 * reload. Purely a UX convenience — unset entries fall back to the
 * first tool in the group definition.
 */
export type GroupRepresentatives = Record<string, string>;

class FloorPlanToolbarLayoutStore {
  private layoutMode = $state<FloorPlanToolbarLayout>(DEFAULT_LAYOUT);
  private groupTools = $state<GroupRepresentatives>({});
  private initialized = false;

  initialize(): void {
    if (this.initialized || !shouldPersistToLocalStorage()) return;
    this.initialized = true;

    const storedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (storedLayout === "grouped" || storedLayout === "expanded") {
      this.layoutMode = storedLayout;
    }

    const storedGroupTools = localStorage.getItem(GROUP_TOOL_STORAGE_KEY);
    if (storedGroupTools) {
      try {
        const parsed = JSON.parse(storedGroupTools);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const sanitized: GroupRepresentatives = {};
          for (const [key, value] of Object.entries(parsed)) {
            if (typeof key === "string" && typeof value === "string") {
              sanitized[key] = value;
            }
          }
          this.groupTools = sanitized;
        }
      } catch {
        // Ignore malformed JSON — fall back to defaults.
      }
    }
  }

  get layout(): FloorPlanToolbarLayout {
    return this.layoutMode;
  }

  setLayout(value: FloorPlanToolbarLayout): void {
    this.layoutMode = value;
    if (shouldPersistToLocalStorage()) {
      localStorage.setItem(LAYOUT_STORAGE_KEY, value);
    }
  }

  /**
   * Get the currently promoted tool for a group, or `null` if the user
   * hasn't picked anything in this group yet (callers fall back to the
   * group's first tool).
   */
  representativeFor(groupId: string): string | null {
    return this.groupTools[groupId] ?? null;
  }

  promoteTool(groupId: string, toolId: string): void {
    this.groupTools = { ...this.groupTools, [groupId]: toolId };
    if (shouldPersistToLocalStorage()) {
      localStorage.setItem(GROUP_TOOL_STORAGE_KEY, JSON.stringify(this.groupTools));
    }
  }
}

export const floorPlanToolbarLayout = new FloorPlanToolbarLayoutStore();
