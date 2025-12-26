/**
 * Spotlight Tour Types
 *
 * Types for the guided UI tour system that highlights key features
 * and explains the interface to new users.
 */

/**
 * Placement options for tour tooltips
 */
export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end';

/**
 * A branch option that can appear at a tour step
 * Allows users to drill-down into detailed sub-tours
 */
export interface TourBranch {
  /** Unique identifier for the branch */
  id: string;

  /** Button label (e.g., "Learn More", "Deep Dive") */
  label: string;

  /** Brief description of what the sub-tour covers */
  description?: string;

  /** Icon name for the branch button (optional) */
  icon?: string;

  /** The sub-tour steps to show if user selects this branch */
  subTourSteps: TourStep[];
}

/**
 * Chapter definition for grouping tour steps
 *
 * Chapters support hierarchical nesting using path-like IDs:
 * - "getting-started" (top-level)
 * - "account-tabs" (top-level)
 * - "account-tabs/import" (nested under account-tabs)
 * - "account-tabs/import/cleanup" (nested two levels deep)
 */
export interface TourChapter {
  /** Unique identifier for the chapter (can use "/" for nesting) */
  id: string;

  /** Display title for the chapter */
  title: string;

  /** Optional icon name (Lucide icon) */
  icon?: string;
}

/**
 * A single step in the spotlight tour
 */
export interface TourStep {
  /** Unique identifier for the step */
  id: string;

  /** CSS selector or data-tour-id attribute to target */
  targetSelector: string;

  /** Title displayed in the tooltip */
  title: string;

  /** Description/explanation of the feature */
  description: string;

  /** Where to position the tooltip relative to the target */
  placement: TooltipPlacement;

  /** Route to navigate to before showing this step (optional) */
  route?: string;

  /** Extra padding around the spotlight cutout (optional) */
  highlightPadding?: number;

  /** Whether this step requires user interaction before proceeding */
  requiresInteraction?: boolean;

  /** Custom action to perform when entering this step */
  onEnter?: () => void | Promise<void>;

  /** Custom action to perform when leaving this step */
  onLeave?: () => void | Promise<void>;

  /** Hide the dark overlay - useful for demo steps where user needs to see the content */
  hideOverlay?: boolean;

  /** Optional branches offering drill-down sub-tours */
  branches?: TourBranch[];

  /** If true, this step is part of a sub-tour (internal flag) */
  isSubTourStep?: boolean;

  /** Chapter this step belongs to (for TOC navigation) */
  chapter?: string;

  /**
   * If set, this step "owns" a child chapter whose steps should render
   * inline (indented) directly below this step in the TOC.
   */
  childChapterId?: string;

  /**
   * Setup function that ensures all prerequisites for this step are met.
   * Called when jumping directly to this step (skipping previous steps).
   * Should be idempotent - safe to call even if prerequisites already exist.
   */
  setup?: () => Promise<void>;
}

/**
 * Current state of the spotlight tour
 */
export interface TourState {
  /** Whether the tour is currently active */
  isActive: boolean;

  /** Current step index (0-based) */
  currentStepIndex: number;

  /** All steps in the tour */
  steps: TourStep[];

  /** Whether the tour is transitioning between steps */
  isTransitioning: boolean;
}

/**
 * Tour completion result
 */
export interface TourCompletionResult {
  completed: boolean;
  skipped: boolean;
  stepsViewed: number;
  totalSteps: number;
  /** Sub-tours that were completed during this tour */
  subToursCompleted?: string[];
}

/**
 * Configuration for the spotlight overlay
 */
export interface SpotlightConfig {
  /** Background overlay color (with alpha) */
  overlayColor: string;

  /** Border radius of the spotlight cutout */
  spotlightBorderRadius: number;

  /** Default padding around the target element */
  defaultPadding: number;

  /** Animation duration in milliseconds */
  animationDuration: number;

  /** Whether to allow clicking outside the spotlight to skip */
  allowClickOutsideToSkip: boolean;

  /** Whether to show step numbers */
  showStepNumbers: boolean;

  /** Whether to show progress bar */
  showProgressBar: boolean;
}

/**
 * Default spotlight configuration
 */
export const DEFAULT_SPOTLIGHT_CONFIG: SpotlightConfig = {
  overlayColor: 'rgba(0, 0, 0, 0.75)',
  spotlightBorderRadius: 8,
  defaultPadding: 8,
  animationDuration: 300,
  allowClickOutsideToSkip: false,
  showStepNumbers: true,
  showProgressBar: true,
};

/**
 * Tour step for the main application tour
 */
export const MAIN_TOUR_STEP_IDS = {
  WELCOME: 'welcome',
  SIDEBAR_NAV: 'sidebar-navigation',
  ACCOUNTS_LIST: 'accounts-list',
  ADD_ACCOUNT: 'add-account-button',
  TRANSACTIONS_TABLE: 'transactions-table',
  BUDGETS_PAGE: 'budgets-page',
  SCHEDULES_PAGE: 'schedules-page',
  CATEGORIES_PAGE: 'categories-page',
  PAYEES_PAGE: 'payees-page',
  IMPORT_TAB: 'import-tab',
  HELP_BUTTON: 'help-button',
  SETTINGS_BUTTON: 'settings-button',
  COMPLETE: 'tour-complete',
} as const;

export type MainTourStepId = (typeof MAIN_TOUR_STEP_IDS)[keyof typeof MAIN_TOUR_STEP_IDS];
