/**
 * Palette options for copilot-style widgets.
 *
 * Each entry is a set of fully-literal Tailwind class strings so the JIT
 * compiler extracts them at build time — no runtime class construction,
 * no missing CSS in production. Widgets import `copilotPalette(color)`
 * and splat its fields into their own templates.
 *
 * When adding a new color:
 *  1. Add the key to `COPILOT_COLOR_IDS` + `COPILOT_COLOR_LABELS`.
 *  2. Add a matching entry to `palette` with every slot populated.
 *  3. Confirm the Tailwind scanner sees each class (keep strings literal).
 */

export const COPILOT_COLOR_IDS = [
  "sky",
  "emerald",
  "violet",
  "amber",
  "rose",
  "slate",
] as const;

export type CopilotColor = (typeof COPILOT_COLOR_IDS)[number];

export const COPILOT_COLOR_LABELS: Record<CopilotColor, string> = {
  sky: "Sky",
  emerald: "Emerald",
  violet: "Violet",
  amber: "Amber",
  rose: "Rose",
  slate: "Slate",
};

export interface CopilotPalette {
  /** Standard tile outer card: border + tinted gradient (light + dark). */
  container: string;
  /**
   * Understated hero outer card — gradient starts from the background
   * and only tints the far corner. Used on the large single-chart hero
   * widgets where a heavy color wash would fight with the chart itself.
   */
  heroContainer: string;
  /** Header icon pill background. */
  iconBg: string;
  /** Softer icon pill used in list items. */
  iconBgSoft: string;
  /** Icon foreground color. */
  iconFg: string;
  /** Progress-bar track. */
  trackBg: string;
  /** Progress-bar filled portion (linear gradient). */
  barFill: string;
  /** Hover state for list rows. */
  rowHover: string;
  /** Swatch color used by the settings-dialog color picker. */
  swatch: string;
}

const palette: Record<CopilotColor, CopilotPalette> = {
  sky: {
    container:
      "border-sky-500/20 bg-linear-to-br from-sky-50 to-background dark:border-sky-400/25 dark:from-sky-950/30 dark:to-background",
    heroContainer:
      "border-sky-500/15 bg-linear-to-br from-background via-background to-sky-500/5 dark:border-sky-400/20 dark:to-sky-500/10",
    iconBg: "bg-sky-500/15 dark:bg-sky-400/20",
    iconBgSoft: "bg-sky-500/10 dark:bg-sky-400/15",
    iconFg: "text-sky-600 dark:text-sky-400",
    trackBg: "bg-sky-500/10 dark:bg-sky-400/15",
    barFill: "bg-linear-to-r from-sky-500 to-sky-400",
    rowHover: "hover:bg-sky-500/5 dark:hover:bg-sky-400/10",
    swatch: "bg-sky-500",
  },
  emerald: {
    container:
      "border-emerald-500/20 bg-linear-to-br from-emerald-50 to-background dark:border-emerald-400/25 dark:from-emerald-950/30 dark:to-background",
    heroContainer:
      "border-emerald-500/15 bg-linear-to-br from-background via-background to-emerald-500/5 dark:border-emerald-400/20 dark:to-emerald-500/10",
    iconBg: "bg-emerald-500/15 dark:bg-emerald-400/20",
    iconBgSoft: "bg-emerald-500/10 dark:bg-emerald-400/15",
    iconFg: "text-emerald-600 dark:text-emerald-400",
    trackBg: "bg-emerald-500/10 dark:bg-emerald-400/15",
    barFill: "bg-linear-to-r from-emerald-500 to-emerald-400",
    rowHover: "hover:bg-emerald-500/5 dark:hover:bg-emerald-400/10",
    swatch: "bg-emerald-500",
  },
  violet: {
    container:
      "border-violet-500/20 bg-linear-to-br from-violet-50 to-background dark:border-violet-400/25 dark:from-violet-950/30 dark:to-background",
    heroContainer:
      "border-violet-500/15 bg-linear-to-br from-background via-background to-violet-500/5 dark:border-violet-400/20 dark:to-violet-500/10",
    iconBg: "bg-violet-500/15 dark:bg-violet-400/20",
    iconBgSoft: "bg-violet-500/10 dark:bg-violet-400/15",
    iconFg: "text-violet-600 dark:text-violet-400",
    trackBg: "bg-violet-500/10 dark:bg-violet-400/15",
    barFill: "bg-linear-to-r from-violet-500 to-violet-400",
    rowHover: "hover:bg-violet-500/5 dark:hover:bg-violet-400/10",
    swatch: "bg-violet-500",
  },
  amber: {
    container:
      "border-amber-500/20 bg-linear-to-br from-amber-50 to-background dark:border-amber-400/25 dark:from-amber-950/30 dark:to-background",
    heroContainer:
      "border-amber-500/15 bg-linear-to-br from-background via-background to-amber-500/5 dark:border-amber-400/20 dark:to-amber-500/10",
    iconBg: "bg-amber-500/15 dark:bg-amber-400/20",
    iconBgSoft: "bg-amber-500/10 dark:bg-amber-400/15",
    iconFg: "text-amber-600 dark:text-amber-400",
    trackBg: "bg-amber-500/10 dark:bg-amber-400/15",
    barFill: "bg-linear-to-r from-amber-500 to-amber-400",
    rowHover: "hover:bg-amber-500/5 dark:hover:bg-amber-400/10",
    swatch: "bg-amber-500",
  },
  rose: {
    container:
      "border-rose-500/20 bg-linear-to-br from-rose-50 to-background dark:border-rose-400/25 dark:from-rose-950/30 dark:to-background",
    heroContainer:
      "border-rose-500/15 bg-linear-to-br from-background via-background to-rose-500/5 dark:border-rose-400/20 dark:to-rose-500/10",
    iconBg: "bg-rose-500/15 dark:bg-rose-400/20",
    iconBgSoft: "bg-rose-500/10 dark:bg-rose-400/15",
    iconFg: "text-rose-600 dark:text-rose-400",
    trackBg: "bg-rose-500/10 dark:bg-rose-400/15",
    barFill: "bg-linear-to-r from-rose-500 to-rose-400",
    rowHover: "hover:bg-rose-500/5 dark:hover:bg-rose-400/10",
    swatch: "bg-rose-500",
  },
  slate: {
    container:
      "border-slate-500/20 bg-linear-to-br from-slate-50 to-background dark:border-slate-400/25 dark:from-slate-900/30 dark:to-background",
    heroContainer:
      "border-slate-500/15 bg-linear-to-br from-background via-background to-slate-500/5 dark:border-slate-400/20 dark:to-slate-500/10",
    iconBg: "bg-slate-500/15 dark:bg-slate-400/20",
    iconBgSoft: "bg-slate-500/10 dark:bg-slate-400/15",
    iconFg: "text-slate-600 dark:text-slate-400",
    trackBg: "bg-slate-500/10 dark:bg-slate-400/15",
    barFill: "bg-linear-to-r from-slate-500 to-slate-400",
    rowHover: "hover:bg-slate-500/5 dark:hover:bg-slate-400/10",
    swatch: "bg-slate-500",
  },
};

const DEFAULT: CopilotColor = "sky";

function isCopilotColor(value: unknown): value is CopilotColor {
  return (
    typeof value === "string" && (COPILOT_COLOR_IDS as readonly string[]).includes(value)
  );
}

/**
 * Resolve the palette for a widget. Accepts any unknown value (typically
 * from `config.settings.gradientColor`) and falls back to `sky` when the
 * value isn't one of the supported colors.
 */
export function copilotPalette(color: unknown): CopilotPalette {
  return palette[isCopilotColor(color) ? color : DEFAULT];
}

export function copilotColorOr(color: unknown): CopilotColor {
  return isCopilotColor(color) ? color : DEFAULT;
}
