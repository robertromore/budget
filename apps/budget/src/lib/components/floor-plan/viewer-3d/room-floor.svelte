<script lang="ts">
  import { T } from "@threlte/core";
  import { onDestroy } from "svelte";
  import * as THREE from "three";
  import type { FloorPlanNode } from "$core/schema/home/home-floor-plan-nodes";
  import { floorMaterial } from "$lib/utils/material-presets";
  import { SCALE } from "$lib/utils/wall-csg";

  let { node }: { node: FloorPlanNode } = $props();

  function createGeom() {
    const x = node.posX * SCALE;
    const z = node.posY * SCALE;
    const w = node.width * SCALE;
    const h = node.height * SCALE;
    const floorThickness = 0.05;

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
    geom.translate(0, (node.elevation ?? 0) - floorThickness, 0);
    return geom;
  }

  let geometry = $state(createGeom());

  $effect(() => {
    void [node.posX, node.posY, node.width, node.height, node.elevation];
    const newGeom = createGeom();
    const oldGeom = geometry;
    geometry = newGeom;
    if (oldGeom && oldGeom !== newGeom) oldGeom.dispose();
  });

  onDestroy(() => geometry?.dispose());

  const material = $derived(floorMaterial(node.color ?? undefined));
</script>

<T.Mesh
  {geometry}
  {material}
  receiveShadow
/>
