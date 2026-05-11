/**
 * Returns true when `pathname` corresponds to the given `href`.
 *
 * - `exact` (default): pathname must equal href. Use for leaf routes and for
 *   sibling-having section roots where the root link should only light up
 *   on the root itself (e.g. `/intelligence` shouldn't be active when at
 *   `/intelligence/anomalies`).
 * - `prefix`: pathname equals href OR starts with `href + '/'`. Use when
 *   the link should stay active across all descendant routes.
 */
export function isRouteActive(
  pathname: string,
  href: string,
  mode: "exact" | "prefix" = "exact"
): boolean {
  if (mode === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Class string applied to the active sidebar menu item's anchor element.
 * Applied via array-class syntax (`class={['...', active && ACTIVE_NAV_CLASS]}`)
 * so it merges cleanly with the layout classes already on the anchor and
 * with the variant classes propagated through the MenuButton's spread props.
 *
 * Why a plain class string and not just `data-[active=true]:` variants:
 * Tailwind's content scanner reliably detects plain utilities; long
 * `data-[active=true]:before:...` chains stacked inside a tv() literal
 * proved to be detected unevenly, leaving the highlight invisible.
 */
/**
 * Active-item pill class per app. Each section sidebar imports its own
 * accent so the highlight color matches the app-rail chip. Rounded-full
 * gives the soft-pill shape; the bang on `rounded-full` overrides the
 * sidebar-menu-button variant's default `rounded-md`.
 */
export const ACTIVE_NAV = {
  budget:
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold !rounded-full",
  budgets:
    "bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold !rounded-full",
  planning:
    "bg-rose-500/15 text-rose-700 dark:text-rose-400 font-semibold !rounded-full",
  subscriptions:
    "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-400 font-semibold !rounded-full",
  documents:
    "bg-teal-500/15 text-teal-700 dark:text-teal-400 font-semibold !rounded-full",
  intelligence:
    "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 font-semibold !rounded-full",
  automation:
    "bg-orange-500/15 text-orange-700 dark:text-orange-400 font-semibold !rounded-full",
  priceWatcher:
    "bg-violet-500/15 text-violet-700 dark:text-violet-400 font-semibold !rounded-full",
} as const;
