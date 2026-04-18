<script lang="ts">
  import type { FloorPlanNode } from "$core/schema/home/home-floor-plan-nodes";
  import { getFloorPlanAssetProperties } from "$lib/utils/floor-plan-node-properties";

  let {
    node,
    selected = false,
    onmousedown,
    onclick,
    onkeydown,
  }: {
    node: FloorPlanNode;
    selected?: boolean;
    onmousedown?: (e: MouseEvent) => void;
    onclick?: (e: MouseEvent) => void;
    onkeydown?: (e: KeyboardEvent) => void;
  } = $props();

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onclick?.(new MouseEvent("click", { bubbles: true, shiftKey: e.shiftKey }));
      return;
    }
    onkeydown?.(e);
  }

  const assetProps = $derived(getFloorPlanAssetProperties(node));
  const hasAssetUrl = $derived(!!assetProps.assetUrl);
  const hasExplicitRect = $derived(node.width > 0 && node.height > 0);
  const renderAsLegacyMarker = $derived(!hasAssetUrl && !hasExplicitRect);
  const width = $derived(node.width > 0 ? node.width : 220);
  const height = $derived(node.height > 0 ? node.height : 160);
  const centerX = $derived(node.posX + width / 2);
  const centerY = $derived(node.posY + height / 2);
  const patternId = $derived(`asset-layer-empty-${node.id}`);
  const nodeLabel = $derived.by(() => {
    const kind = node.nodeType === "scan" ? "Scan" : "Guide";
    return node.name ? `${kind}: ${node.name}` : kind;
  });
</script>

{#if renderAsLegacyMarker}
  <g
    class="asset-layer-node cursor-pointer outline-none focus-visible:[&_circle]:stroke-primary"
    role="button"
    aria-label={nodeLabel}
    aria-pressed={selected}
    tabindex={selected ? 0 : -1}
    onmousedown={onmousedown}
    onclick={onclick}
    onkeydown={handleKeydown}
  >
    <circle
      cx={node.posX}
      cy={node.posY}
      r="12"
      class={selected ? "fill-primary" : "fill-ring"}
      stroke="white"
      stroke-width="2"
      opacity={node.opacity}
    />
    {#if node.name}
      <text
        x={node.posX}
        y={node.posY + 24}
        text-anchor="middle"
        font-size="11"
        class="fill-muted-foreground pointer-events-none select-none"
      >
        {node.name}
      </text>
    {/if}
  </g>
{:else}
  <g
    class="asset-layer-node cursor-pointer outline-none focus-visible:[&_rect:last-of-type]:stroke-primary"
    role="button"
    aria-label={nodeLabel}
    aria-pressed={selected}
    tabindex={selected ? 0 : -1}
    transform="rotate({node.rotation} {centerX} {centerY})"
    onmousedown={onmousedown}
    onclick={onclick}
    onkeydown={handleKeydown}
  >
    {#if hasAssetUrl}
      <image
        href={assetProps.assetUrl ?? undefined}
        x={node.posX}
        y={node.posY}
        width={width}
        height={height}
        preserveAspectRatio="none"
        opacity={node.opacity}
      />
    {:else}
      <defs>
        <pattern id={patternId} width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M -3 3 L 3 -3 M 0 12 L 12 0 M 9 15 L 15 9" stroke="currentColor" stroke-width="1" />
        </pattern>
      </defs>
      <rect
        x={node.posX}
        y={node.posY}
        width={width}
        height={height}
        class="fill-muted/30 stroke-border"
        stroke-width="1.5"
      />
      <rect
        x={node.posX}
        y={node.posY}
        width={width}
        height={height}
        fill={`url(#${patternId})`}
        class="text-muted-foreground/60"
        opacity={Math.max(0.25, node.opacity)}
      />
      <text
        x={centerX}
        y={centerY}
        text-anchor="middle"
        dominant-baseline="central"
        class="fill-muted-foreground pointer-events-none select-none"
        font-size="12"
      >
        {node.nodeType === "scan" ? "Scan Image URL" : "Guide Image URL"}
      </text>
    {/if}

    <rect
      x={node.posX}
      y={node.posY}
      width={width}
      height={height}
      fill="none"
      class={selected ? "stroke-primary" : "stroke-primary/30"}
      stroke-width={selected ? 2 : 1}
      stroke-dasharray={selected ? "8 4" : "6 6"}
    />

    {#if node.name}
      <text
        x={centerX}
        y={node.posY - 8}
        text-anchor="middle"
        font-size="11"
        class="fill-muted-foreground pointer-events-none select-none"
      >
        {node.name}
      </text>
    {/if}
  </g>
{/if}
