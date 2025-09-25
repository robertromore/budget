<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import {BarChart, LineChart, PieChart, TrendingUp} from "@lucide/svelte/icons";
  import {cn} from "$lib/utils";

  interface Props {
    title: string;
    type?: "bar" | "line" | "pie" | "area";
    height?: string;
    description?: string;
    class?: string;
  }

  let {
    title,
    type = "line",
    height = "300px",
    description,
    class: className,
  }: Props = $props();

  function getIcon(chartType: string) {
    switch (chartType) {
      case "bar": return BarChart;
      case "pie": return PieChart;
      case "area": return TrendingUp;
      default: return LineChart;
    }
  }
</script>

<Card.Root class={className}>
  <Card.Header class="pb-3">
    <Card.Title class="text-base">{title}</Card.Title>
    {#if description}
      <Card.Description>{description}</Card.Description>
    {/if}
  </Card.Header>
  <Card.Content>
    {@const Icon = getIcon(type)}
    <div
      class={cn(
        "flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted",
        "bg-muted/20 text-muted-foreground transition-colors"
      )}
      style="height: {height}"
    >
      <Icon class="h-8 w-8 mb-2" />
      <p class="text-sm font-medium">Chart Placeholder</p>
      <p class="text-xs text-center max-w-40">
        {type.charAt(0).toUpperCase() + type.slice(1)} chart will be implemented here
      </p>
    </div>
  </Card.Content>
</Card.Root>