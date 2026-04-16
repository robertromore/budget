<script lang="ts">
  import { T } from "@threlte/core";
  import type { FloorPlanNode } from "$core/schema/home/home-floor-plan-nodes";
  import { createWallGeometry, SCALE } from "$lib/utils/wall-csg";
  import { wallMaterial } from "$lib/utils/material-presets";

  let {
    node,
    openings = [],
  }: {
    node: FloorPlanNode;
    openings?: FloorPlanNode[];
  } = $props();

  const geometry = $derived(createWallGeometry(
    { ...node, posX: node.posX * SCALE, posY: node.posY * SCALE, x2: (node.x2 ?? 0) * SCALE, y2: (node.y2 ?? 0) * SCALE },
    openings
  ));

  const material = $derived(wallMaterial(node.color ?? undefined));
</script>

<T.Mesh
  {geometry}
  {material}
  castShadow
  receiveShadow
/>
