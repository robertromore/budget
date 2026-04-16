<script lang="ts">
  /**
   * 3D drag controller.
   *
   * Previously, dragging a node in the 3D scene relied on the invisible
   * ground plane's `onpointermove` to report the cursor's world position.
   * That only fires when the cursor is directly over open ground — as soon
   * as it drifts over a mesh (wall, furniture, etc.) Threlte's picker
   * returns the mesh as the closest hit and the ground-plane handler stops
   * receiving events. On slow drags of tall walls the cursor sits on the
   * dragged mesh the entire time, so frames go unhandled and the node
   * lags the cursor.
   *
   * This component lives INSIDE `<Canvas>` (so it can call `useThrelte()`)
   * and attaches window-level `pointermove` / `pointerup` listeners for
   * the lifetime of a drag. On each move it reprojects the cursor's
   * client coordinates to a world point by raycasting against an implicit
   * ground plane at y=0 using Threlte's camera. The result is a drag that
   * tracks the cursor regardless of what's beneath it.
   *
   * The controller owns the drag state so `scene-3d.svelte` only needs to
   * forward a `start` call from each mesh's `onpointerdown`.
   */

  import { useThrelte } from "@threlte/core";
  import { onDestroy } from "svelte";
  import * as THREE from "three";
  import type { FloorPlanStore } from "$lib/stores/floor-plan.svelte";
  import { SCALE } from "$lib/utils/wall-csg";

  let { store }: { store: FloorPlanStore } = $props();

  const { camera, canvas } = useThrelte();

  // Shared scratch objects so we don't allocate per-frame.
  const raycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const ndc = new THREE.Vector2();
  const worldPoint = new THREE.Vector3();

  let dragNodeId: string | null = null;
  let dragPointerStart: { x: number; z: number } | null = null;
  let dragNodeStart: {
    nodeType: string;
    posX: number;
    posY: number;
    x2: number | null;
    y2: number | null;
  } | null = null;

  /**
   * Reproject a pointer event's client coordinates onto the ground plane
   * at y=0 using the current camera. Returns null if the ray is parallel
   * to the plane or the canvas is detached from the DOM.
   */
  function pointerToWorld(event: PointerEvent): THREE.Vector3 | null {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    raycaster.setFromCamera(ndc, camera.current);
    const hit = raycaster.ray.intersectPlane(groundPlane, worldPoint);
    return hit;
  }

  function handleWindowPointerMove(event: PointerEvent) {
    if (!dragNodeId || !dragPointerStart || !dragNodeStart) return;
    const world = pointerToWorld(event);
    if (!world) return;
    if (!Number.isFinite(world.x) || !Number.isFinite(world.z)) return;
    // Offset-from-start math — preserves fractional motion across snap
    // rounding so long slow drags stay pinned to the cursor.
    const dx = (world.x - dragPointerStart.x) / SCALE;
    const dz = (world.z - dragPointerStart.z) / SCALE;
    const posX = store.snap(dragNodeStart.posX + dx);
    const posY = store.snap(dragNodeStart.posY + dz);

    if (
      dragNodeStart.nodeType === "wall" &&
      dragNodeStart.x2 !== null &&
      dragNodeStart.y2 !== null
    ) {
      store.updateNode(dragNodeId, {
        posX,
        posY,
        x2: store.snap(dragNodeStart.x2 + dx),
        y2: store.snap(dragNodeStart.y2 + dz),
      });
      return;
    }

    store.updateNode(dragNodeId, { posX, posY });
  }

  function handleWindowPointerUp() {
    if (!dragNodeId) return;
    // Mirror 2D behaviour: re-snap door/window onto whichever wall it's
    // now nearest, then commit a single history entry for the whole drag.
    const dragged = store.nodes[dragNodeId];
    if (dragged && (dragged.nodeType === "door" || dragged.nodeType === "window")) {
      store.reparentOpeningToNearestWall(dragNodeId);
    }
    store.commitChange();
    detachListeners();
  }

  function attachListeners() {
    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerUp);
  }

  function detachListeners() {
    window.removeEventListener("pointermove", handleWindowPointerMove);
    window.removeEventListener("pointerup", handleWindowPointerUp);
    window.removeEventListener("pointercancel", handleWindowPointerUp);
    dragNodeId = null;
    dragPointerStart = null;
    dragNodeStart = null;
  }

  /**
   * Begin a drag. Called from a mesh's `onpointerdown` with the id of the
   * node and the Threlte intersection point. The intersection is used as
   * the anchor for offset-from-start math so the drag is framed in world
   * coordinates, independent of where the user clicked on the mesh.
   */
  export function start(id: string, anchor: THREE.Vector3): void {
    const node = store.nodes[id];
    if (!node) return;
    dragNodeId = id;
    dragPointerStart = { x: anchor.x, z: anchor.z };
    dragNodeStart = {
      nodeType: node.nodeType,
      posX: node.posX,
      posY: node.posY,
      x2: node.x2 ?? null,
      y2: node.y2 ?? null,
    };
    attachListeners();
  }

  /**
   * Whether a drag is currently in progress. Exposed so scene-3d can
   * suppress its ground-plane drag-end path while the controller is
   * handling it.
   */
  export function isDragging(): boolean {
    return dragNodeId !== null;
  }

  onDestroy(() => detachListeners());
</script>
