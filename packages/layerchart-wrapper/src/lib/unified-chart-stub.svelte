<script lang="ts">
  // Simple stub component for documentation site
  interface Props {
    data: any[];
    type: string;
    x?: string;
    y?: string;
    r?: string;
    showControls?: boolean;
    class?: string;
  }

  let { 
    data, 
    type, 
    x = "x", 
    y = "y", 
    r = "r", 
    showControls = false,
    class: className = "h-full w-full" 
  }: Props = $props();

  // Mock chart display
  const chartTypeDisplays = {
    line: "📈 Line Chart",
    area: "📊 Area Chart", 
    bar: "📊 Bar Chart",
    pie: "🥧 Pie Chart",
    scatter: "⚫ Scatter Plot",
    arc: "🌙 Arc Chart",
    threshold: "📏 Threshold Chart",
    hull: "🔗 Hull Chart",
    calendar: "📅 Calendar Chart",
    spline: "〰️ Spline Chart"
  };
</script>

<div class={`${className} bg-muted/20 border-2 border-dashed border-muted-foreground/20 rounded-lg flex flex-col items-center justify-center p-8`}>
  <div class="text-center space-y-4">
    <div class="text-4xl">{chartTypeDisplays[type] || "📊 Chart"}</div>
    <div class="text-lg font-semibold">LayerChart Wrapper Preview</div>
    <div class="text-sm text-muted-foreground space-y-1">
      <div>Type: <code class="bg-muted px-1 rounded">{type}</code></div>
      <div>Data points: <code class="bg-muted px-1 rounded">{data?.length || 0}</code></div>
      {#if x}<div>X axis: <code class="bg-muted px-1 rounded">{x}</code></div>{/if}
      {#if y}<div>Y axis: <code class="bg-muted px-1 rounded">{y}</code></div>{/if}
      {#if showControls}<div class="text-xs text-primary">✨ Interactive controls enabled</div>{/if}
    </div>
  </div>
</div>