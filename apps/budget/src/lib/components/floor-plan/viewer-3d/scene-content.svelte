<script lang="ts">
  import { T } from "@threlte/core";
  import { Grid, interactivity } from "@threlte/extras";
  import type * as THREE from "three";

  interactivity();
  import type { FloorPlanStore } from "$lib/stores/floor-plan.svelte";
  import { SCALE } from "$lib/utils/wall-csg";
  import WallMesh from "./wall-mesh.svelte";
  import RoomFloor from "./room-floor.svelte";
  import FurnitureMesh from "./furniture-mesh.svelte";
  import SceneLights from "./scene-lights.svelte";

  /**
   * Shape of pointer events we forward from child meshes. Threlte's event
   * payload contains `point`, but the generic `onclick`/`onpointerdown`
   * handlers on mesh components don't declare it in their prop type
   * (they're typed permissively as a generic handler). Keep `point`
   * optional here so both the child-forwarded events and the ground-plane
   * events that do carry a point can flow through the same callback type.
   */
  type ThreltePointerEvent = {
    point?: THREE.Vector3;
    stopPropagation?: () => void;
    nativeEvent?: PointerEvent;
  };

  let {
    store,
    onselect,
    ondragstart,
  }: {
    store: FloorPlanStore;
    onselect?: (id: string, e: ThreltePointerEvent) => void;
    ondragstart?: (id: string, e: ThreltePointerEvent) => void;
  } = $props();

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

<Grid
  cellColor="#9ca3af"
  sectionColor="#6b7280"
  cellSize={1}
  sectionSize={5}
  fadeDistance={30}
  infiniteGrid
/>

<T.Mesh rotation.x={-Math.PI / 2} position.y={-0.01} receiveShadow>
  <T.PlaneGeometry args={[100, 100]} />
  <T.ShadowMaterial opacity={0.15} />
</T.Mesh>

{#each store.rooms as node (node.id)}
  <RoomFloor
    {node}
    selected={store.selectedNodeIds.has(node.id)}
    onclick={(e) => onselect?.(node.id, e)}
    onpointerdown={(e) => ondragstart?.(node.id, e)}
  />
{/each}

{#each store.walls as node (node.id)}
  <WallMesh
    {node}
    openings={wallOpenings.get(node.id) ?? []}
    selected={store.selectedNodeIds.has(node.id)}
    onclick={(e) => onselect?.(node.id, e)}
    onpointerdown={(e) => ondragstart?.(node.id, e)}
  />
{/each}

<!--
  Doors and windows render as standalone meshes in 3D in addition to cutting
  openings in their parent wall. Without this pass:
    - Unparented openings (placed away from any wall) would be invisible in
      3D even though the 2D canvas shows them as rectangles.
    - Parented openings would show only as a hole in the wall; nothing in
      the hole.
  FurnitureMesh already handles door/window geometry, orientation, and the
  right materials (door: solid; window: translucent glass).
-->
{#each store.doors as node (node.id)}
  <FurnitureMesh
    {node}
    selected={store.selectedNodeIds.has(node.id)}
    onclick={(e) => onselect?.(node.id, e)}
    onpointerdown={(e) => ondragstart?.(node.id, e)}
  />
{/each}
{#each store.windows as node (node.id)}
  <FurnitureMesh
    {node}
    selected={store.selectedNodeIds.has(node.id)}
    onclick={(e) => onselect?.(node.id, e)}
    onpointerdown={(e) => ondragstart?.(node.id, e)}
  />
{/each}

{#each store.furniture as node (node.id)}
  <FurnitureMesh
    {node}
    selected={store.selectedNodeIds.has(node.id)}
    onclick={(e) => onselect?.(node.id, e)}
    onpointerdown={(e) => ondragstart?.(node.id, e)}
  />
{/each}

{#each store.annotations as node (node.id)}
  {@const x = node.posX * SCALE}
  {@const z = node.posY * SCALE}
  <!--
    FP-L6: `T.SphereGeometry` and `T.MeshStandardMaterial` are declaratively
    owned by Threlte here — it tracks and disposes them when this `{#each}`
    iteration unmounts. The values are not wrapped in `$derived.by` clones,
    so there is no leak path.
  -->
  <T.Mesh
    position.x={x}
    position.y={1.5}
    position.z={z}
    onclick={(e: ThreltePointerEvent) => onselect?.(node.id, e)}
  >
    <T.SphereGeometry args={[0.15, 16, 16]} />
    <T.MeshStandardMaterial
      color={store.selectedNodeIds.has(node.id) ? "#3b82f6" : "#f59e0b"}
    />
  </T.Mesh>
{/each}
