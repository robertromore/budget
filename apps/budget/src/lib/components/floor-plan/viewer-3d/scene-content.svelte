<script lang="ts">
  import type { FloorPlanStore } from "$lib/stores/floor-plan.svelte";
  import { SCALE } from "$lib/utils/wall-csg";
  import { T } from "@threlte/core";
  import { Grid } from "@threlte/extras";
  import type * as THREE from "three";
  import AssetPlane from "./asset-plane.svelte";
  import FurnitureMesh from "./furniture-mesh.svelte";
  import RoomFloor from "./room-floor.svelte";
  import SceneLights from "./scene-lights.svelte";
  import WallMesh from "./wall-mesh.svelte";

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

  // Drive off the typed `doors`/`windows` derivations instead of the full
  // `nodeList` so the map doesn't rebuild when an unrelated furniture or
  // annotation node moves. Walls whose openings didn't change still see
  // the same per-parent array reference the wall-mesh fingerprint depends
  // on, avoiding a wasted CSG refingerprint per unrelated mutation.
  const wallOpenings = $derived.by(() => {
    const map = new Map<string, typeof store.nodeList>();
    const collect = (node: (typeof store.nodeList)[number]) => {
      if (!node.parentId) return;
      if (!store.isNodeVisibleInLevelDisplayMode(node.id)) return;
      const parent = store.nodes[node.parentId];
      if (!parent || parent.nodeType !== "wall") return;
      if (!store.isNodeVisibleInLevelDisplayMode(parent.id)) return;
      const bucket = map.get(node.parentId);
      if (bucket) bucket.push(node);
      else map.set(node.parentId, [node]);
    };
    for (const node of store.doors) collect(node);
    for (const node of store.windows) collect(node);
    return map;
  });

  const visibleRooms3D = $derived(
    store.rooms.filter((node) => store.isNodeVisibleInLevelDisplayMode(node.id))
  );
  const visibleWalls3D = $derived(
    store.walls.filter((node) => store.isNodeVisibleInLevelDisplayMode(node.id))
  );
  const visibleDoors3D = $derived(
    store.doors.filter((node) => store.isNodeVisibleInLevelDisplayMode(node.id))
  );
  const visibleWindows3D = $derived(
    store.windows.filter((node) => store.isNodeVisibleInLevelDisplayMode(node.id))
  );
  const visibleFurniture3D = $derived(
    store.furniture.filter((node) => store.isNodeVisibleInLevelDisplayMode(node.id))
  );
  const visibleScans3D = $derived(
    store.scans.filter((node) => store.isNodeVisibleInLevelDisplayMode(node.id))
  );
  const visibleGuides3D = $derived(
    store.guides.filter((node) => store.isNodeVisibleInLevelDisplayMode(node.id))
  );
  const visibleAnnotations3D = $derived(
    store.annotations.filter((node) => store.isNodeVisibleInLevelDisplayMode(node.id))
  );

  function getElevationOffset(nodeId: string): number {
    return store.getNodeAncestorElevation(nodeId) + store.getNodeDisplayElevationOffset(nodeId);
  }
</script>

<SceneLights />

<Grid
  cellColor="#9ca3af"
  sectionColor="#6b7280"
  cellSize={1}
  sectionSize={5}
  fadeDistance={70}
  infiniteGrid
/>

<T.Mesh rotation.x={-Math.PI / 2} position.y={-0.01} receiveShadow>
  <T.PlaneGeometry args={[100, 100]} />
  <T.ShadowMaterial opacity={0.15} />
</T.Mesh>

{#each visibleScans3D as node (node.id)}
  <AssetPlane
    {node}
    elevationOffset={getElevationOffset(node.id)}
    selected={store.selectedNodeIds.has(node.id)}
    onclick={(e) => onselect?.(node.id, e)}
    onpointerdown={(e) => ondragstart?.(node.id, e)}
  />
{/each}

{#each visibleRooms3D as node (node.id)}
  <RoomFloor
    {node}
    elevationOffset={getElevationOffset(node.id)}
    selected={store.selectedNodeIds.has(node.id)}
    onclick={(e) => onselect?.(node.id, e)}
    onpointerdown={(e) => ondragstart?.(node.id, e)}
  />
{/each}

{#each visibleWalls3D as node (node.id)}
  <WallMesh
    {node}
    openings={wallOpenings.get(node.id) ?? []}
    elevationOffset={getElevationOffset(node.id)}
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
{#each visibleDoors3D as node (node.id)}
  <FurnitureMesh
    {node}
    elevationOffset={getElevationOffset(node.id)}
    selected={store.selectedNodeIds.has(node.id)}
    onclick={(e) => onselect?.(node.id, e)}
    onpointerdown={(e) => ondragstart?.(node.id, e)}
  />
{/each}
{#each visibleWindows3D as node (node.id)}
  <FurnitureMesh
    {node}
    elevationOffset={getElevationOffset(node.id)}
    selected={store.selectedNodeIds.has(node.id)}
    onclick={(e) => onselect?.(node.id, e)}
    onpointerdown={(e) => ondragstart?.(node.id, e)}
  />
{/each}

{#each visibleFurniture3D as node (node.id)}
  <FurnitureMesh
    {node}
    elevationOffset={getElevationOffset(node.id)}
    selected={store.selectedNodeIds.has(node.id)}
    onclick={(e) => onselect?.(node.id, e)}
    onpointerdown={(e) => ondragstart?.(node.id, e)}
  />
{/each}

{#each visibleGuides3D as node (node.id)}
  <AssetPlane
    {node}
    elevationOffset={getElevationOffset(node.id)}
    selected={store.selectedNodeIds.has(node.id)}
    onclick={(e) => onselect?.(node.id, e)}
    onpointerdown={(e) => ondragstart?.(node.id, e)}
  />
{/each}

{#each visibleAnnotations3D as node (node.id)}
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
    position.y={1.5 + store.getNodeWorldElevation(node.id) + store.getNodeDisplayElevationOffset(node.id)}
    position.z={z}
    onclick={(e: ThreltePointerEvent) => onselect?.(node.id, e)}
  >
    <T.SphereGeometry args={[0.15, 16, 16]} />
    <T.MeshStandardMaterial
      color={store.selectedNodeIds.has(node.id) ? "#3b82f6" : "#f59e0b"}
    />
  </T.Mesh>
{/each}
