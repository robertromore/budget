<script lang="ts">
  import { T } from "@threlte/core";
  import * as THREE from "three";
  import type { FloorPlanNode } from "$core/schema/home/home-floor-plan-nodes";
  import { furnitureMaterial, doorMaterial, glassMaterial } from "$lib/utils/material-presets";
  import { SCALE } from "$lib/utils/wall-csg";

  let {
    node,
    selected = false,
    onclick,
    onpointerdown,
  }: {
    node: FloorPlanNode;
    selected?: boolean;
    onclick?: (e: any) => void;
    onpointerdown?: (e: any) => void;
  } = $props();

  const w = $derived((node.width || 60) * SCALE);
  const h = $derived((node.height || 60) * SCALE);
  const boxH = $derived(
    node.nodeType === "door" ? (node.wallHeight ?? 2.1) :
    node.nodeType === "window" ? 1.2 :
    Math.max(w, h) * 0.8
  );
  const posX = $derived((node.posX + (node.width || 60) / 2) * SCALE);
  const posZ = $derived((node.posY + (node.height || 60) / 2) * SCALE);
  const posY = $derived(
    node.nodeType === "window" ? 1.0 + boxH / 2 + (node.elevation ?? 0) :
    boxH / 2 + (node.elevation ?? 0)
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
