<script lang="ts">
  import {Grid3X3, Columns, Clock, BarChart3} from "@lucide/svelte/icons";
  import * as ToggleGroup from "$lib/components/ui/toggle-group";

  export type BudgetLayoutType = "dashboard" | "split" | "timeline" | "executive";

  interface Props {
    value: BudgetLayoutType;
    onValueChange: (value: BudgetLayoutType) => void;
    class?: string;
  }

  let {
    value,
    onValueChange,
    class: className,
  }: Props = $props();

  const layouts = [
    {
      value: "dashboard" as const,
      label: "Dashboard View",
      description: "Grid layout with KPI cards and charts",
      icon: Grid3X3,
    },
    {
      value: "split" as const,
      label: "Split View",
      description: "Side panel with main content area",
      icon: Columns,
    },
    {
      value: "timeline" as const,
      label: "Timeline View",
      description: "Chronological activity and spending patterns",
      icon: Clock,
    },
    {
      value: "executive" as const,
      label: "Executive Summary",
      description: "High-level overview with key insights",
      icon: BarChart3,
    },
  ];
</script>

<ToggleGroup.Root
  type="single"
  {value}
  onValueChange={(newValue) => newValue && onValueChange(newValue as BudgetLayoutType)}
  class="border rounded-lg p-1 {className}"
>
  {#each layouts as layout}
    <ToggleGroup.Item
      value={layout.value}
      aria-label={layout.label}
      title={layout.description}
      class="px-3 py-2"
    >
      <layout.icon class="h-4 w-4" />
    </ToggleGroup.Item>
  {/each}
</ToggleGroup.Root>