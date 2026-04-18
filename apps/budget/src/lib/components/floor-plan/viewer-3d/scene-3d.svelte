<script lang="ts">
  import { Canvas, T } from "@threlte/core";
  import { OrbitControls } from "@threlte/extras";
  import { onDestroy } from "svelte";
  import * as THREE from "three";
  import type { OrbitControls as ThreeOrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
  import type { FloorPlanNode } from "$core/schema/home/home-floor-plan-nodes";
  import type { FloorPlanStore } from "$lib/stores/floor-plan.svelte";
  import { SCALE } from "$lib/utils/wall-csg";
  import { disposeMaterials } from "$lib/utils/material-presets";
  import {
    defaultElevationForSurface,
    defaultNameForNodeType,
    defaultSegmentHeight,
    defaultSegmentThickness,
    resolveSegmentTypeFromTool,
    resolveSurfaceTypeFromTool,
    segmentNeedsHierarchyParent,
    surfaceNeedsHierarchyParent,
  } from "$lib/utils/floor-plan-tools";
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

  let {
    store,
    zoomPercent = $bindable(100),
  }: {
    store: FloorPlanStore;
    zoomPercent?: number;
  } = $props();

  onDestroy(() => disposeMaterials());

  // Drawing state for segment/surface tools
  let drawStart = $state<{ x: number; z: number } | null>(null);
  let drawCurrent = $state<{ x: number; z: number } | null>(null);
  let isDrawing = $state(false);
  const segmentTools = new Set<string>(["wall", "fence", "roof-segment", "stair-segment"]);
  const surfaceTools = new Set<string>([
    "room",
    "zone",
    "site",
    "building",
    "level",
    "slab",
    "ceiling",
    "roof",
    "stair",
  ]);
  const itemTools = new Set<string>(["furniture", "item"]);
  const assetTools = new Set<string>(["scan", "guide"]);

  // Shared tool/type helpers live in `$lib/utils/floor-plan-tools` so the
  // 2D canvas (floor-plan-canvas.svelte) and this scene can't drift on
  // defaults — they're imported below.

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
  const DEFAULT_CAMERA_POSITION = new THREE.Vector3(8, 10, 8);
  const DEFAULT_ORBIT_TARGET = new THREE.Vector3(0, 0, 0);
  const DEFAULT_CAMERA_DIRECTION = DEFAULT_CAMERA_POSITION
    .clone()
    .sub(DEFAULT_ORBIT_TARGET)
    .normalize();
  const DEFAULT_CAMERA_DISTANCE = DEFAULT_CAMERA_POSITION.distanceTo(DEFAULT_ORBIT_TARGET);
  const SEGMENT_NODE_TYPES = new Set(["wall", "fence", "roof-segment", "stair-segment"]);
  let orbitControlsRef = $state<ThreeOrbitControls | undefined>(undefined);
  let didInitialAutoFrame = $state(false);

  function computeZoomPercent(): number {
    const controls = orbitControlsRef;
    if (!controls) return 100;
    const distance = controls.object.position.distanceTo(controls.target);
    if (!Number.isFinite(distance) || distance <= 0) return 100;
    return Math.max(1, Math.round((DEFAULT_CAMERA_DISTANCE / distance) * 100));
  }

  /**
   * OrbitControls "change" fires per camera frame while damping runs
   * (≈60 Hz), and zoomPercent is a bound prop that re-renders the
   * toolbar on every write. Coalesce to one update per animation frame
   * AND skip writes that don't change the integer percent so quick
   * orbit wiggles don't churn parent subscribers.
   */
  let zoomUpdateRaf: number | null = null;

  function refreshZoomPercent(): void {
    if (zoomUpdateRaf !== null) return;
    zoomUpdateRaf = requestAnimationFrame(() => {
      zoomUpdateRaf = null;
      const next = computeZoomPercent();
      if (next !== zoomPercent) zoomPercent = next;
    });
  }

  function handleOrbitControlsChange(): void {
    refreshZoomPercent();
  }

  onDestroy(() => {
    if (zoomUpdateRaf !== null) cancelAnimationFrame(zoomUpdateRaf);
  });

  function nodeElevationBase(node: FloorPlanNode): number {
    return store.getNodeWorldElevation(node.id) + store.getNodeDisplayElevationOffset(node.id);
  }

  function nodeVerticalSpan(node: FloorPlanNode): { minY: number; maxY: number } {
    const base = nodeElevationBase(node);
    if (SEGMENT_NODE_TYPES.has(node.nodeType)) {
      return { minY: base, maxY: base + (node.wallHeight ?? 2.5) };
    }
    if (node.nodeType === "door") {
      return { minY: base, maxY: base + (node.wallHeight ?? 2.1) };
    }
    if (node.nodeType === "window") {
      return { minY: base + 1.0, maxY: base + 2.2 };
    }
    return { minY: base, maxY: base + 0.2 };
  }

  function includeNodeInBounds(bounds: THREE.Box3, node: FloorPlanNode): void {
    const x1 = (node.posX ?? 0) * SCALE;
    const z1 = (node.posY ?? 0) * SCALE;
    const { minY, maxY } = nodeVerticalSpan(node);

    if (
      SEGMENT_NODE_TYPES.has(node.nodeType) &&
      node.x2 !== null &&
      node.y2 !== null
    ) {
      const x2 = node.x2 * SCALE;
      const z2 = node.y2 * SCALE;
      bounds.expandByPoint(new THREE.Vector3(x1, minY, z1));
      bounds.expandByPoint(new THREE.Vector3(x1, maxY, z1));
      bounds.expandByPoint(new THREE.Vector3(x2, minY, z2));
      bounds.expandByPoint(new THREE.Vector3(x2, maxY, z2));
      return;
    }

    const width = Math.max(0, node.width ?? 0) * SCALE;
    const height = Math.max(0, node.height ?? 0) * SCALE;
    const x2 = x1 + width;
    const z2 = z1 + height;

    bounds.expandByPoint(new THREE.Vector3(x1, minY, z1));
    bounds.expandByPoint(new THREE.Vector3(x2, maxY, z2));
  }

  function frameToVisibleContent(): boolean {
    const controls = orbitControlsRef;
    if (!controls) return false;

    const visibleNodes = store.visibleNodeList.filter((node) =>
      store.isNodeVisibleInLevelDisplayMode(node.id)
    );
    if (visibleNodes.length === 0) return false;

    const bounds = new THREE.Box3();
    for (const node of visibleNodes) {
      includeNodeInBounds(bounds, node);
    }

    if (bounds.isEmpty()) return false;

    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    bounds.getCenter(center);
    bounds.getSize(size);

    const radius = Math.max(size.length() * 0.5, 1);
    const camera = controls.object as THREE.PerspectiveCamera;
    const verticalFov = THREE.MathUtils.degToRad(camera.fov);
    const horizontalFov =
      2 * Math.atan(Math.tan(verticalFov / 2) * Math.max(camera.aspect, 0.1));
    const limitingFov = Math.max(0.1, Math.min(verticalFov, horizontalFov));

    const unclampedDistance = (radius / Math.sin(limitingFov / 2)) * 1.25;
    const distance = Math.min(
      controls.maxDistance,
      Math.max(controls.minDistance, unclampedDistance)
    );

    controls.target.copy(center);
    controls.object.position.copy(center).addScaledVector(DEFAULT_CAMERA_DIRECTION, distance);
    controls.update();
    refreshZoomPercent();
    return true;
  }

  export function zoomIn(): void {
    const controls = orbitControlsRef;
    if (!controls) return;
    // In current three OrbitControls, dollyOut moves the camera closer
    // (while dollyIn moves it farther), so map toolbar "+" accordingly.
    controls.dollyOut(1.2);
    controls.update();
    refreshZoomPercent();
  }

  export function zoomOut(): void {
    const controls = orbitControlsRef;
    if (!controls) return;
    controls.dollyIn(1.2);
    controls.update();
    refreshZoomPercent();
  }

  export function resetView(): void {
    if (frameToVisibleContent()) return;
    const controls = orbitControlsRef;
    if (!controls) return;
    controls.object.position.copy(DEFAULT_CAMERA_POSITION);
    controls.target.copy(DEFAULT_ORBIT_TARGET);
    controls.update();
    refreshZoomPercent();
  }

  $effect(() => {
    if (!orbitControlsRef) return;
    if (!didInitialAutoFrame) {
      if (frameToVisibleContent()) {
        didInitialAutoFrame = true;
      }
      return;
    }
    refreshZoomPercent();
  });

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

    if (segmentTools.has(store.activeTool)) {
      // Side-effecting variant: auto-create parents on user intent,
      // toast if anything is missing. Matches the 2D canvas behaviour.
      if (!store.tryActivateTool(store.activeTool)) {
        return;
      }
      isDrawing = true;
      drawStart = { x: point.x, z: point.z };
      drawCurrent = { x: point.x, z: point.z };
      return;
    }

    if (surfaceTools.has(store.activeTool)) {
      if (!store.tryActivateTool(store.activeTool)) {
        return;
      }
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
    } else if (itemTools.has(store.activeTool)) {
      const isCatalogItem = store.activeTool === "item";
      store.addNode(isCatalogItem ? "item" : "furniture", {
        posX: sc.x,
        posY: sc.y,
        parentId: store.resolveDefaultContentParentId(),
        width: 60,
        height: 60,
        name: isCatalogItem ? "Item" : "Furniture",
      });
    } else if (assetTools.has(store.activeTool)) {
      if (store.activeTool === "scan" || store.activeTool === "guide") {
        store.createAssetReference(store.activeTool, sc.x, sc.y);
      }
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

    const segmentType = resolveSegmentTypeFromTool(store.activeTool);
    if (segmentType) {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      if (Math.sqrt(dx * dx + dy * dy) > 10) {
        const centerX = (start.x + end.x) / 2;
        const centerY = (start.y + end.y) / 2;
        const needsHierarchyParent = segmentNeedsHierarchyParent(segmentType);
        const parentId = needsHierarchyParent
          ? store.resolveParentForCreation(segmentType, centerX, centerY)
          : store.resolveDefaultContentParentId();
        if (!store.requireParentForCreation(segmentType, parentId)) {
          isDrawing = false;
          drawStart = null;
          drawCurrent = null;
          return;
        }
        store.addNode(segmentType, {
          posX: start.x,
          posY: start.y,
          parentId,
          x2: end.x,
          y2: end.y,
          wallHeight: defaultSegmentHeight(segmentType),
          thickness: defaultSegmentThickness(segmentType),
          name: needsHierarchyParent ? defaultNameForNodeType(segmentType) : null,
        });
      }
    } else {
      const surfaceType = resolveSurfaceTypeFromTool(store.activeTool);
      if (!surfaceType) {
        isDrawing = false;
        drawStart = null;
        drawCurrent = null;
        return;
      }
      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const w = Math.abs(end.x - start.x);
      const h = Math.abs(end.y - start.y);
      if (w > 20 && h > 20) {
        const centerX = x + w / 2;
        const centerY = y + h / 2;
        const parentId = surfaceNeedsHierarchyParent(surfaceType)
          ? store.resolveParentForCreation(surfaceType, centerX, centerY)
          : store.resolveDefaultContentParentId();
        if (!store.requireParentForCreation(surfaceType, parentId)) {
          isDrawing = false;
          drawStart = null;
          drawCurrent = null;
          return;
        }
        store.addNode(surfaceType, {
          posX: x,
          posY: y,
          width: w,
          height: h,
          parentId,
          name: defaultNameForNodeType(surfaceType),
          elevation: defaultElevationForSurface(surfaceType),
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
    if (e.nativeEvent?.shiftKey) {
      // Toggle into the current selection. The click event path is not
      // guaranteed to fire after `stopPropagation` on pointerdown across
      // Threlte's event model, so handle multi-select here explicitly
      // rather than relying on the click handler as a backstop.
      store.selectNode(id, true);
      return;
    }
    if (!store.selectNode(id)) return;
    dragController.start(id, e.point);
  }

  // Draw preview geometry
  const wallPreview = $derived.by(() => {
    if (!isDrawing || !drawStart || !drawCurrent) return null;
    if (!segmentTools.has(store.activeTool)) return null;
    return { start: drawStart, end: drawCurrent };
  });

  const roomPreview = $derived.by(() => {
    if (!isDrawing || !drawStart || !drawCurrent) return null;
    if (!surfaceTools.has(store.activeTool)) return null;
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
      position={[DEFAULT_CAMERA_POSITION.x, DEFAULT_CAMERA_POSITION.y, DEFAULT_CAMERA_POSITION.z]}
      fov={50}
      near={0.1}
      far={500}
    >
      {#key isEditTool}
        <OrbitControls
          bind:ref={orbitControlsRef}
          enableDamping
          dampingFactor={0.1}
          maxPolarAngle={Math.PI / 2.1}
          minDistance={1}
          maxDistance={50}
          target={[DEFAULT_ORBIT_TARGET.x, DEFAULT_ORBIT_TARGET.y, DEFAULT_ORBIT_TARGET.z]}
          mouseButtons={orbitMouseButtons}
          onchange={handleOrbitControlsChange}
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
