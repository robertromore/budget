<script lang="ts">
  import { Canvas } from "@threlte/core";
  import { T } from "@threlte/core";
  import { OrbitControls, interactivity } from "@threlte/extras";
  import type { FloorPlanStore } from "$lib/stores/floor-plan.svelte";
  import SceneContent from "./scene-content.svelte";

  let { store }: { store: FloorPlanStore } = $props();

  let walkthrough = $state(false);
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
      {#if !walkthrough}
        <OrbitControls
          enableDamping
          dampingFactor={0.1}
          maxPolarAngle={Math.PI / 2.1}
          minDistance={1}
          maxDistance={50}
          target={[0, 0, 0]}
        />
      {/if}
    </T.PerspectiveCamera>

    <SceneContent {store} />
  </Canvas>
</div>
