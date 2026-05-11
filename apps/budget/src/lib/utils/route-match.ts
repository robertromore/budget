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
