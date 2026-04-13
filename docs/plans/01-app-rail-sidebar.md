# Phase 1: App Rail Sidebar

## Goal

Add a narrow icon rail on the far left of the app that lets users switch between apps (Budget, Price Watcher, future apps). This is pure infrastructure — no price watcher functionality or route groups yet.

## Done When

- A ~3rem vertical icon strip appears to the left of the existing sidebar
- Budget icon is highlighted when on any existing route
- Price Watcher icon navigates to `/price-watcher` placeholder page
- Existing sidebar and layout behavior are unchanged
- App rail hidden on mobile (`hidden md:flex`)

## Changes

### New: `apps/budget/src/lib/components/layout/app-rail.svelte`

- Flex column, ~3rem wide, full height, border-r for visual separation
- Themed with sidebar CSS variables (`bg-sidebar`, `text-sidebar-foreground`, `border-sidebar-border`)
- App icons stacked vertically at the top with `gap-1` and `p-2`:
  - Budget (Wallet icon) — links to `/`
  - Price Watcher (Tag icon) — links to `/price-watcher`
- Active app determined by current URL path (`$page.url.pathname`):
  - Starts with `/price-watcher` → price watcher active
  - Everything else → budget active
- Active state: `bg-sidebar-accent text-sidebar-accent-foreground rounded-md`
- Inactive state: `text-sidebar-foreground/60 hover:bg-sidebar-accent/50 rounded-md`
- Each icon wrapped in Tooltip for hover label
- Hidden on mobile: `hidden md:flex` (mobile users switch apps via a different mechanism later)
- No settings icon — already accessible from header and sidebar user dropdown

### Modify: `apps/budget/src/routes/+layout.svelte`

- Wrap the existing layout in a flex container
- App rail on the left, existing content takes `flex-1`
- No `h-screen` — preserve existing scroll behavior

```html
<div class="flex">
  <AppRail />                   <!-- hidden md:flex inside the component -->
  <div class="min-w-0 flex-1">
    <!-- existing Sidebar.Provider + Sidebar.Inset, unchanged -->
  </div>
</div>
```

### New: `apps/budget/src/routes/price-watcher/+page.svelte`

- Simple placeholder page (no route group — that's Phase 2)
- Uses the Empty component with Tag icon: "Price Watcher — Coming Soon"
- Inherits root layout so the budget sidebar still shows (acceptable for a placeholder)

## Dependencies

None — this is the first phase.

## Verification

1. `bun run check` — type check
2. `bun run dev` — app rail visible on left of sidebar at desktop widths
3. Click Budget icon — navigates to `/`, icon highlighted
4. Click Price Watcher icon — navigates to `/price-watcher`, placeholder renders, PW icon highlighted
5. Resize to mobile (<768px) — rail disappears, sidebar sheet still works
6. Verify existing pages (accounts, budgets, etc.) are unaffected
