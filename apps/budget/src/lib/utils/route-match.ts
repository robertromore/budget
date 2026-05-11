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
export const ACTIVE_NAV_CLASS =
  "relative bg-primary/15 text-primary font-semibold !rounded-l-none border-l-2 border-primary";
