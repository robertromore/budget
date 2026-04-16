<script lang="ts">
  import { T } from "@threlte/core";
  import { onDestroy, untrack } from "svelte";
  import type { FloorPlanNode } from "$core/schema/home/home-floor-plan-nodes";
  import { createWallGeometry, SCALE } from "$lib/utils/wall-csg";
  import { wallMaterial } from "$lib/utils/material-presets";
  import * as THREE from "three";

  let {
    node,
    openings = [],
    selected = false,
    onclick,
    onpointerdown,
  }: {
    node: FloorPlanNode;
    openings?: FloorPlanNode[];
    selected?: boolean;
    onclick?: (e: any) => void;
    onpointerdown?: (e: any) => void;
  } = $props();

  let geometry = $state(createGeom());

  function createGeom() {
    return createWallGeometry(
      { ...node, posX: node.posX * SCALE, posY: node.posY * SCALE, x2: (node.x2 ?? 0) * SCALE, y2: (node.y2 ?? 0) * SCALE },
      openings
    );
  }

  $effect(() => {
    void [node.posX, node.posY, node.x2, node.y2, node.wallHeight, node.thickness, node.elevation, node.color, openings.length];
    const newGeom = createGeom();
    untrack(() => {
      const oldGeom = geometry;
      geometry = newGeom;
      if (oldGeom && oldGeom !== newGeom) oldGeom.dispose();
    });
  });

  onDestroy(() => geometry?.dispose());

  const material = $derived.by(() => {
    const mat = wallMaterial(node.color ?? undefined).clone();
    if (selected) {
      mat.emissive = new THREE.Color("#3b82f6");
      mat.emissiveIntensity = 0.3;
    }
    return mat;
  });
</script>

<T.Mesh
  {geometry}
  {material}
  castShadow
  receiveShadow
  {onclick}
  {onpointerdown}
/>
