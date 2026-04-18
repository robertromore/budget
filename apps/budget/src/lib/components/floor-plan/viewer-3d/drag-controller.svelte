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
    posX: number;
    posY: number;
  } | null = null;
  let dragDidMove = false;

  /**
   * Reproject a pointer event's client coordinates onto the ground plane
   * at y=0 using the current camera. Returns null if the ray is parallel
   * to the plane or the canvas is detached from the DOM.
   *
   * IMPORTANT: returns the SHARED `worldPoint` scratch vector, not a
   * fresh one — the sole caller reads `.x` / `.z` immediately and does
   * not hold a reference past the next call. If you add a new caller
   * that retains the result across pointer events, copy it via
   * `new THREE.Vector3().copy(hit)` or take a local `{x, z}` snapshot.
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
    const node = store.nodes[dragNodeId];
    if (!node) return;
    // Offset-from-start math — preserves fractional motion across snap
    // rounding so long slow drags stay pinned to the cursor.
    const dx = (world.x - dragPointerStart.x) / SCALE;
    const dz = (world.z - dragPointerStart.z) / SCALE;
    const posX = store.snap(dragNodeStart.posX + dx);
    const posY = store.snap(dragNodeStart.posY + dz);
    const moveDx = posX - node.posX;
    const moveDy = posY - node.posY;
    if (moveDx === 0 && moveDy === 0) return;
    // Route all drags through store.moveNode so wall/fence endpoint updates
    // and wall-child opening translation stay consistent with 2D dragging.
    dragDidMove = store.moveNode(dragNodeId, moveDx, moveDy) || dragDidMove;
  }

  function handleWindowPointerUp() {
    if (!dragNodeId) return;
    if (!dragDidMove) {
      detachListeners();
      return;
    }
    // If the node disappeared mid-drag (e.g. deleted via the hierarchy
    // panel while pointer was held), skip the commit entirely — otherwise
    // we'd push an unrelated history snapshot for whatever state the store
    // landed in after the deletion.
    const dragged = store.nodes[dragNodeId];
    if (!dragged) {
      detachListeners();
      return;
    }
    // Mirror 2D behaviour: re-snap door/window onto whichever wall it's
    // now nearest, then commit a single history entry for the whole drag.
    if (dragged.nodeType === "door" || dragged.nodeType === "window") {
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
    dragDidMove = false;
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
    if (store.isNodeLocked(id)) return;
    dragNodeId = id;
    dragPointerStart = { x: anchor.x, z: anchor.z };
    dragNodeStart = {
      posX: node.posX,
      posY: node.posY,
    };
    dragDidMove = false;
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
