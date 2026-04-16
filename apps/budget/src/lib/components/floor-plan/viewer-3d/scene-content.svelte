<script lang="ts">
  import { T } from "@threlte/core";
  import { Grid } from "@threlte/extras";
  import type { FloorPlanStore } from "$lib/stores/floor-plan.svelte";
  import WallMesh from "./wall-mesh.svelte";
  import RoomFloor from "./room-floor.svelte";
  import FurnitureMesh from "./furniture-mesh.svelte";
  import SceneLights from "./scene-lights.svelte";

  let { store }: { store: FloorPlanStore } = $props();

  // Group openings by parent wall for CSG
  const wallOpenings = $derived.by(() => {
    const map = new Map<string, typeof store.nodeList>();
    for (const node of store.nodeList) {
      if ((node.nodeType === "door" || node.nodeType === "window") && node.parentId) {
        if (!map.has(node.parentId)) map.set(node.parentId, []);
        map.get(node.parentId)!.push(node);
      }
    }
    return map;
  });
</script>

<SceneLights />

<!-- Ground grid -->
<Grid
  cellColor="#9ca3af"
  sectionColor="#6b7280"
  cellSize={1}
  sectionSize={5}
  fadeDistance={30}
  infiniteGrid
/>

<!-- Ground plane for shadows -->
<T.Mesh rotation.x={-Math.PI / 2} position.y={-0.01} receiveShadow>
  <T.PlaneGeometry args={[100, 100]} />
  <T.ShadowMaterial opacity={0.15} />
</T.Mesh>

<!-- Rooms (floor planes) -->
{#each store.rooms as node (node.id)}
  <RoomFloor {node} />
{/each}

<!-- Walls with CSG openings -->
{#each store.walls as node (node.id)}
  <WallMesh {node} openings={wallOpenings.get(node.id) ?? []} />
{/each}

<!-- Furniture, doors, windows (standalone -- not CSG'd into walls) -->
{#each store.furniture as node (node.id)}
  <FurnitureMesh {node} />
{/each}

<!-- Annotations as simple markers -->
{#each store.annotations as node (node.id)}
  {@const x = node.posX / 20}
  {@const z = node.posY / 20}
  <T.Mesh position.x={x} position.y={1.5} position.z={z}>
    <T.SphereGeometry args={[0.15, 16, 16]} />
    <T.MeshStandardMaterial color="#f59e0b" />
  </T.Mesh>
{/each}
