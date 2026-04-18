<script lang="ts">
  import { T } from "@threlte/core";
  import { onDestroy, untrack } from "svelte";
  import * as THREE from "three";
  import type { FloorPlanNode } from "$core/schema/home/home-floor-plan-nodes";
  import { furnitureMaterial, doorMaterial, glassMaterial } from "$lib/utils/material-presets";
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

  const w = $derived((node.width || 60) * SCALE);
  const h = $derived((node.height || 60) * SCALE);
  const boxH = $derived(
    node.nodeType === "door" ? (node.wallHeight ?? 2.1) :
    node.nodeType === "window" ? 1.2 :
    Math.max(w, h) * 0.8
  );
  /**
   * Centre convention (must match `nodes/furniture-node.svelte` and the
   * wall-CSG projection):
   *   - Doors / windows: (posX, posY) is the CENTRE on the wall. No offset.
   *   - Everything else (furniture, appliances): (posX, posY) is the
   *     TOP-LEFT in store space; offset by width/2, height/2 to find the
   *     3D centre.
   */
  const isOpening = $derived(node.nodeType === "door" || node.nodeType === "window");
  const posX = $derived(
    (isOpening ? node.posX : node.posX + (node.width || 60) / 2) * SCALE
  );
  const posZ = $derived(
    (isOpening ? node.posY : node.posY + (node.height || 60) / 2) * SCALE
  );
  const worldElevation = $derived((node.elevation ?? 0) + elevationOffset);
  const posY = $derived(
    node.nodeType === "window"
      ? 1.0 + boxH / 2 + worldElevation
      : boxH / 2 + worldElevation
  );
  const rotY = $derived(-(node.rotation ?? 0) * Math.PI / 180);

  const material = $derived.by(() => {
    const baseMat =
      node.nodeType === "door" ? doorMaterial(node.color ?? undefined) :
      node.nodeType === "window" ? glassMaterial() :
      furnitureMaterial(node.color ?? undefined);
    if (!selected) return baseMat;
    const mat = baseMat.clone();
    mat.emissive = new THREE.Color("#3b82f6");
    mat.emissiveIntensity = 0.3;
    return mat;
  });

  // Track cloned materials so selection churn doesn't leak GPU memory.
  // Shared base materials (returned un-cloned when not selected) are owned
  // by `material-presets.ts` and must never be disposed here.
  let prevOwnedMaterial: THREE.Material | null = null;
  $effect(() => {
    const current = material;
    const isOwnedClone = selected;
    untrack(() => {
      if (prevOwnedMaterial && prevOwnedMaterial !== current) {
        prevOwnedMaterial.dispose();
      }
      prevOwnedMaterial = isOwnedClone ? current : null;
    });
  });
  onDestroy(() => prevOwnedMaterial?.dispose());
</script>

<T.Mesh
  position.x={posX}
  position.y={posY}
  position.z={posZ}
  rotation.y={rotY}
  castShadow
  receiveShadow
  {onclick}
  {onpointerdown}
>
  <T.BoxGeometry args={[w, boxH, h]} />
  <T is={material} />
</T.Mesh>
