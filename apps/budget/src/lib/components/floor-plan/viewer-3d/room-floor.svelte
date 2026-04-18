<script lang="ts">
  import { T } from "@threlte/core";
  import { onDestroy, untrack } from "svelte";
  import * as THREE from "three";
  import type { FloorPlanNode } from "$core/schema/home/home-floor-plan-nodes";
  import { floorMaterial } from "$lib/utils/material-presets";
  import { SCALE } from "$lib/utils/wall-csg";

  type PointerHandler = (e: { stopPropagation: () => void; nativeEvent?: PointerEvent }) => void;

  let {
    node,
    selected = false,
    elevationOffset = 0,
    onclick,
    onpointerdown,
  }: {
    node: FloorPlanNode;
    selected?: boolean;
    elevationOffset?: number;
    onclick?: PointerHandler;
    onpointerdown?: PointerHandler;
  } = $props();

  function getSurfaceThickness(nodeType: FloorPlanNode["nodeType"]): number {
    if (nodeType === "slab") return 0.12;
    if (nodeType === "ceiling") return 0.04;
    if (nodeType === "roof") return 0.16;
    if (nodeType === "stair") return 0.14;
    return 0.05;
  }

  function getDefaultSurfaceColor(nodeType: FloorPlanNode["nodeType"]): string {
    if (nodeType === "slab") return "#cbd5e1";
    if (nodeType === "ceiling") return "#bae6fd";
    if (nodeType === "roof") return "#fecdd3";
    if (nodeType === "stair") return "#fde68a";
    if (nodeType === "site") return "#bfdbfe";
    if (nodeType === "building") return "#c7d2fe";
    if (nodeType === "level") return "#e2e8f0";
    if (nodeType === "zone") return "#bbf7d0";
    return "#d1d5db";
  }

  function createGeom() {
    const x = node.posX * SCALE;
    const z = node.posY * SCALE;
    const w = node.width * SCALE;
    const h = node.height * SCALE;
    const floorThickness = getSurfaceThickness(node.nodeType);

    const shape = new THREE.Shape();
    shape.moveTo(x, z);
    shape.lineTo(x + w, z);
    shape.lineTo(x + w, z + h);
    shape.lineTo(x, z + h);
    shape.closePath();

    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: floorThickness,
      bevelEnabled: false,
    });
    geom.rotateX(-Math.PI / 2);
    geom.translate(0, (node.elevation ?? 0) + elevationOffset - floorThickness, 0);
    return geom;
  }

  // Derive geometry from the reactive inputs `createGeom` reads. Using a
  // `$derived` here (rather than `$effect` with a manual dependency list)
  // means new fields added to `createGeom` can never silently stale — the
  // derivation rebuilds whenever any tracked read changes.
  const geometry = $derived(createGeom());

  // Cleanup runs on dep-change and unmount — disposes the previous geometry
  // exactly when a new one supersedes it, and the final geometry when the
  // component is destroyed.
  $effect(() => {
    const g = geometry;
    return () => g?.dispose();
  });

  // Unselected surfaces share the color-keyed preset directly; clone only
  // when a selection highlight needs painting on top.
  const material = $derived.by(() => {
    const base = floorMaterial(node.color ?? getDefaultSurfaceColor(node.nodeType));
    if (!selected) return base;
    const mat = base.clone();
    mat.emissive = new THREE.Color("#3b82f6");
    mat.emissiveIntensity = 0.3;
    return mat;
  });

  // Only dispose clones we created — cached presets are owned by
  // `disposeMaterials()` at scene teardown.
  let prevMaterial: THREE.Material | null = null;
  let prevMaterialOwned = false;
  $effect(() => {
    const current = material;
    const currentOwned = selected;
    untrack(() => {
      if (prevMaterial && prevMaterialOwned && prevMaterial !== current) {
        prevMaterial.dispose();
      }
      prevMaterial = current;
      prevMaterialOwned = currentOwned;
    });
  });
  onDestroy(() => {
    if (prevMaterialOwned) prevMaterial?.dispose();
  });
</script>

<T.Mesh
  {geometry}
  {material}
  receiveShadow
  {onclick}
  {onpointerdown}
/>
