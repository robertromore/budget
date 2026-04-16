<script lang="ts">
  import { Canvas } from "@threlte/core";
  import { T } from "@threlte/core";
  import { OrbitControls } from "@threlte/extras";
  import { onDestroy } from "svelte";
  import * as THREE from "three";
  import type { FloorPlanStore } from "$lib/stores/floor-plan.svelte";
  import { disposeMaterials } from "$lib/utils/material-presets";
  import SceneContent from "./scene-content.svelte";

  let { store }: { store: FloorPlanStore } = $props();

  onDestroy(() => disposeMaterials());
</script>

<div class="h-full w-full">
  <Canvas shadows="pcf">
    <T.PerspectiveCamera
      makeDefault
      position={[8, 10, 8]}
      fov={50}
      near={0.1}
      far={500}
    >
      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={1}
        maxDistance={50}
        target={[0, 0, 0]}
        mouseButtons={{
          LEFT: THREE.MOUSE.PAN,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.ROTATE,
        }}
      />
    </T.PerspectiveCamera>

    <SceneContent {store} />
  </Canvas>
</div>
