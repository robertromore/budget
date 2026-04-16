<script lang="ts">
  import { Canvas, T } from "@threlte/core";
  import { OrbitControls } from "@threlte/extras";
  import { onDestroy } from "svelte";
  import * as THREE from "three";
  import type { FloorPlanStore } from "$lib/stores/floor-plan.svelte";
  import { SCALE } from "$lib/utils/wall-csg";
  import { disposeMaterials } from "$lib/utils/material-presets";
  import DragController from "./drag-controller.svelte";
  import SceneContent from "./scene-content.svelte";

  /**
   * Minimal shape of the events Threlte/three fire for pointer interactions.
   * We deliberately avoid importing Threlte's full generic event type because
   * it changes across versions; duck-typing the fields we actually use keeps
   * the handler typed without coupling to an internal API.
   *
   * `point` is optional so callbacks forwarded from child mesh components
   * (whose handler prop types are permissive) type-check. Threlte always
   * provides `point` at runtime on intersection events; handlers guard with
   * an early return to make the absence explicit.
   */
  type ThreltePointerEvent = {
    point?: THREE.Vector3;
    stopPropagation?: () => void;
    nativeEvent?: PointerEvent;
  };

  let { store }: { store: FloorPlanStore } = $props();

  onDestroy(() => disposeMaterials());

  // Drawing state for wall/room tools
  let drawStart = $state<{ x: number; z: number } | null>(null);
  let drawCurrent = $state<{ x: number; z: number } | null>(null);
  let isDrawing = $state(false);

  /**
   * Drag of existing meshes is delegated to `DragController` (see that file
   * for why). We bind to it here so mesh pointerdown handlers can call
   * `dragController.start(id, point)` to begin a drag. All pointermove /
   * pointerup logic runs inside the controller using window-level events
   * so the cursor tracks the node regardless of what's beneath it.
   */
  let dragController = $state<DragController | null>(null);

  // Tool determines OrbitControls mouse config
  const isEditTool = $derived(
    store.activeTool !== "select" && store.activeTool !== "pan"
  );

  /**
   * Key the OrbitControls config on the tool so Svelte rebuilds the
   * `OrbitControls` component when the tool switches. Some versions of
   * three's OrbitControls do not respond to a `null` assignment in
   * `mouseButtons` without a manual `.update()` / re-mount, which produced
   * a bug where panning kept rotating after switching to the wall tool.
   * Remounting via `{#key}` guarantees the control picks up the new config.
   */
  const orbitMouseButtons = $derived(
    isEditTool
      ? { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }
      : { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }
  ) as unknown as {
    LEFT: THREE.MOUSE | null;
    MIDDLE: THREE.MOUSE;
    RIGHT: THREE.MOUSE;
  };

  function toStoreCoords(point: THREE.Vector3) {
    return {
      x: store.snap(point.x / SCALE),
      y: store.snap(point.z / SCALE),
    };
  }

  function handleGroundPointerDown(e: ThreltePointerEvent) {
    if (e.nativeEvent?.button !== 0) return;
    if (!e.point) return; // Threlte always provides point on ground hits
    const point = e.point;
    const sc = toStoreCoords(point);

    if (store.activeTool === "select") {
      store.clearSelection();
      return;
    }

    if (store.activeTool === "wall" || store.activeTool === "room") {
      isDrawing = true;
      drawStart = { x: point.x, z: point.z };
      drawCurrent = { x: point.x, z: point.z };
      return;
    }

    if (store.activeTool === "door" || store.activeTool === "window") {
      // Snap onto the nearest wall (same logic the 2D canvas uses). The
      // placed node then appears in 2D as a rectangle on the wall and in
      // 3D as a CSG opening + mesh, matching across views.
      store.placeOpening(store.activeTool, sc.x, sc.y, {
        defaultWidth: store.activeTool === "door" ? 40 : 60,
        defaultHeight: 10,
        name: store.activeTool === "door" ? "Door" : "Window",
      });
    } else if (store.activeTool === "furniture") {
      store.addNode("furniture", {
        posX: sc.x,
        posY: sc.y,
        width: 60,
        height: 60,
        name: "Furniture",
      });
    }
  }

  function handleGroundPointerMove(e: ThreltePointerEvent) {
    if (!isDrawing || !drawStart || !e.point) return;
    drawCurrent = { x: e.point.x, z: e.point.z };
  }

  function handleGroundPointerUp(_e: ThreltePointerEvent) {
    // Node drags are handled by DragController via window-level events.
    // If we're not mid-drawing, there's nothing to do here.
    if (!isDrawing || !drawStart || !drawCurrent) {
      return;
    }

    const start = toStoreCoords(new THREE.Vector3(drawStart.x, 0, drawStart.z));
    const end = toStoreCoords(new THREE.Vector3(drawCurrent.x, 0, drawCurrent.z));

    if (store.activeTool === "wall") {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      if (Math.sqrt(dx * dx + dy * dy) > 10) {
        store.addNode("wall", {
          posX: start.x,
          posY: start.y,
          x2: end.x,
          y2: end.y,
        });
      }
    } else if (store.activeTool === "room") {
      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const w = Math.abs(end.x - start.x);
      const h = Math.abs(end.y - start.y);
      if (w > 20 && h > 20) {
        store.addNode("room", {
          posX: x,
          posY: y,
          width: w,
          height: h,
          name: "Room",
        });
      }
    }

    isDrawing = false;
    drawStart = null;
    drawCurrent = null;
  }

  function handleMeshSelect(id: string, e: ThreltePointerEvent) {
    if (store.activeTool !== "select") return;
    e.stopPropagation?.();
    store.selectNode(id, e.nativeEvent?.shiftKey ?? false);
  }

  /**
   * Begin a drag when the user pointer-downs on a mesh. We delegate to
   * `DragController` so pointer tracking uses window events + a camera
   * raycast against the ground plane — this way the drag keeps tracking
   * even when the cursor moves onto other meshes.
   */
  function handleMeshDragStart(id: string, e: ThreltePointerEvent) {
    if (store.activeTool !== "select" || e.nativeEvent?.button !== 0) return;
    if (!e.point) return;
    if (!dragController) return;
    e.stopPropagation?.();
    // Preserve shift-click multi-select semantics. The click handler owns
    // shift toggling; pre-select here only for plain drags/clicks.
    if (!e.nativeEvent?.shiftKey) {
      store.selectNode(id);
    }
    dragController.start(id, e.point);
  }

  // Draw preview geometry
  const wallPreview = $derived.by(() => {
    if (!isDrawing || !drawStart || !drawCurrent || store.activeTool !== "wall") return null;
    return { start: drawStart, end: drawCurrent };
  });

  const roomPreview = $derived.by(() => {
    if (!isDrawing || !drawStart || !drawCurrent || store.activeTool !== "room") return null;
    const x = Math.min(drawStart.x, drawCurrent.x);
    const z = Math.min(drawStart.z, drawCurrent.z);
    const w = Math.abs(drawCurrent.x - drawStart.x);
    const h = Math.abs(drawCurrent.z - drawStart.z);
    return { x, z, w, h };
  });
</script>

<div class="h-full w-full">
  <Canvas shadows={THREE.PCFShadowMap}>
    <T.PerspectiveCamera
      makeDefault
      position={[8, 10, 8]}
      fov={50}
      near={0.1}
      far={500}
    >
      {#key isEditTool}
        <OrbitControls
          enableDamping
          dampingFactor={0.1}
          maxPolarAngle={Math.PI / 2.1}
          minDistance={1}
          maxDistance={50}
          target={[0, 0, 0]}
          mouseButtons={orbitMouseButtons}
        />
      {/key}
    </T.PerspectiveCamera>

    <!--
      Invisible ground plane. Handles tool-based interactions (drawing
      walls/rooms, placing doors/windows/furniture, clearing selection).
      Node drags are handled by `DragController` using window-level
      events + a camera raycast, so they don't depend on the cursor
      staying over this plane.
    -->
    <T.Mesh
      rotation.x={-Math.PI / 2}
      position.y={0.001}
      onpointerdown={handleGroundPointerDown}
      onpointermove={handleGroundPointerMove}
      onpointerup={handleGroundPointerUp}
    >
      <T.PlaneGeometry args={[200, 200]} />
      <T.MeshBasicMaterial visible={false} />
    </T.Mesh>

    <!-- Handles existing-mesh drags via window events (see the
         component's header doc for why). Must live inside <Canvas> so it
         can call `useThrelte()` and access the camera. -->
    <DragController {store} bind:this={dragController} />

    <!-- Wall drawing preview -->
    {#if wallPreview}
      {@const dx = wallPreview.end.x - wallPreview.start.x}
      {@const dz = wallPreview.end.z - wallPreview.start.z}
      {@const len = Math.sqrt(dx * dx + dz * dz)}
      {@const cx = (wallPreview.start.x + wallPreview.end.x) / 2}
      {@const cz = (wallPreview.start.z + wallPreview.end.z) / 2}
      {@const angle = Math.atan2(dz, dx)}
      <T.Mesh
        position.x={cx}
        position.y={1.25}
        position.z={cz}
        rotation.y={-angle}
      >
        <T.BoxGeometry args={[len, 2.5, 0.15]} />
        <T.MeshBasicMaterial color="#3b82f6" transparent opacity={0.3} />
      </T.Mesh>
    {/if}

    <!-- Room drawing preview -->
    {#if roomPreview}
      <T.Mesh
        position.x={roomPreview.x + roomPreview.w / 2}
        position.y={0.02}
        position.z={roomPreview.z + roomPreview.h / 2}
      >
        <T.BoxGeometry args={[roomPreview.w, 0.02, roomPreview.h]} />
        <T.MeshBasicMaterial color="#3b82f6" transparent opacity={0.3} />
      </T.Mesh>
    {/if}

    <SceneContent
      {store}
      onselect={handleMeshSelect}
      ondragstart={handleMeshDragStart}
    />
  </Canvas>
</div>
