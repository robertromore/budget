<script lang="ts">
  import {onMount} from "svelte";
  import BudgetHeader from "$lib/components/budgets/budget-header.svelte";
  import LayoutSwitcher, {type BudgetLayoutType} from "$lib/components/budgets/layouts/layout-switcher.svelte";
  import DashboardFirstLayout from "$lib/components/budgets/layouts/dashboard-first-layout.svelte";
  import SplitViewLayout from "$lib/components/budgets/layouts/split-view-layout.svelte";
  import TimelineLayout from "$lib/components/budgets/layouts/timeline-layout.svelte";
  import ExecutiveLayout from "$lib/components/budgets/layouts/executive-layout.svelte";

  let {data} = $props();

  // Make budget data reactive to prop changes
  const budget = $derived(data.budget);
  const categories = $derived(data.categories);

  // Layout state with localStorage persistence
  let currentLayout = $state<BudgetLayoutType>("dashboard");
  const LAYOUT_STORAGE_KEY = "budget-detail-layout-preference";

  // Load layout preference from localStorage on mount
  onMount(() => {
    const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (saved && ["dashboard", "split", "timeline", "executive"].includes(saved)) {
      currentLayout = saved as BudgetLayoutType;
    }
  });

  // Save layout preference to localStorage
  function handleLayoutChange(newLayout: BudgetLayoutType) {
    currentLayout = newLayout;
    localStorage.setItem(LAYOUT_STORAGE_KEY, newLayout);
  }

</script>

<svelte:head>
  <title>{budget.name} - Budget Details</title>
</svelte:head>

<!-- Header with Layout Switcher -->
<div class="flex items-center justify-between mb-6">
  <BudgetHeader {budget} />
  <LayoutSwitcher
    value={currentLayout}
    onValueChange={handleLayoutChange}
    class="ml-4"
  />
</div>

<!-- Dynamic Layout Rendering -->
{#if currentLayout === "dashboard"}
  <DashboardFirstLayout {budget} {categories} />
{:else if currentLayout === "split"}
  <SplitViewLayout {budget} {categories} />
{:else if currentLayout === "timeline"}
  <TimelineLayout {budget} {categories} />
{:else if currentLayout === "executive"}
  <ExecutiveLayout {budget} {categories} />
{/if}