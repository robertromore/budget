<script lang="ts">
  import { Canvas, T } from "@threlte/core";
  import { OrbitControls } from "@threlte/extras";
  import { onDestroy } from "svelte";
  import * as THREE from "three";
  import type { FloorPlanStore } from "$lib/stores/floor-plan.svelte";
  import { SCALE } from "$lib/utils/wall-csg";
  import { disposeMaterials } from "$lib/utils/material-presets";
  import SceneContent from "./scene-content.svelte";

  let { store }: { store: FloorPlanStore } = $props();

  onDestroy(() => disposeMaterials());

  // Drawing state for wall/room tools
  let drawStart = $state<{ x: number; z: number } | null>(null);
  let drawCurrent = $state<{ x: number; z: number } | null>(null);
  let isDrawing = $state(false);

  // Drag state for select tool
  let dragNodeId = $state<string | null>(null);
  let dragStartPos = $state<{ x: number; z: number } | null>(null);

  // Tool determines OrbitControls mouse config
  const isEditTool = $derived(
    store.activeTool !== "select" && store.activeTool !== "pan"
  );

  const orbitMouseButtons = $derived(
    isEditTool
      ? { LEFT: null as any, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }
      : { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }
  );

  function toStoreCoords(point: THREE.Vector3) {
    return {
      x: store.snap(point.x / SCALE),
      y: store.snap(point.z / SCALE),
    };
  }

  function handleGroundPointerDown(e: any) {
    if (e.nativeEvent?.button !== 0) return;
    const point = e.point as THREE.Vector3;
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

    if (store.activeTool === "furniture" || store.activeTool === "door" || store.activeTool === "window") {
      const type = store.activeTool === "furniture" ? "furniture" : store.activeTool;
      store.addNode(type, {
        posX: sc.x,
        posY: sc.y,
        width: store.activeTool === "door" ? 40 : store.activeTool === "window" ? 60 : 60,
        height: store.activeTool === "door" ? 10 : store.activeTool === "window" ? 10 : 60,
        name: store.activeTool === "door" ? "Door" : store.activeTool === "window" ? "Window" : "Furniture",
      });
    }
  }

  function handleGroundPointerMove(e: any) {
    if (!isDrawing || !drawStart) return;
    const point = e.point as THREE.Vector3;
    drawCurrent = { x: point.x, z: point.z };
  }

  function handleGroundPointerUp(e: any) {
    if (!isDrawing || !drawStart || !drawCurrent) {
      // Handle drag end for node movement
      if (dragNodeId) {
        store.commitChange();
        dragNodeId = null;
        dragStartPos = null;
      }
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

  function handleMeshSelect(id: string, e: any) {
    if (store.activeTool !== "select") return;
    e.stopPropagation?.();
    store.selectNode(id, e.nativeEvent?.shiftKey ?? false);
  }

  function handleMeshDragStart(id: string, e: any) {
    if (store.activeTool !== "select" || e.nativeEvent?.button !== 0) return;
    e.stopPropagation?.();
    store.selectNode(id);
    dragNodeId = id;
    const point = e.point as THREE.Vector3;
    dragStartPos = { x: point.x, z: point.z };
  }

  function handleMeshDrag(e: any) {
    if (!dragNodeId || !dragStartPos) return;
    const point = e.point as THREE.Vector3;
    const dx = (point.x - dragStartPos.x) / SCALE;
    const dz = (point.z - dragStartPos.z) / SCALE;
    store.updateNode(dragNodeId, {
      posX: store.snap(store.nodes[dragNodeId].posX + dx),
      posY: store.snap(store.nodes[dragNodeId].posY + dz),
    });
    dragStartPos = { x: point.x, z: point.z };
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
        mouseButtons={orbitMouseButtons}
      />
    </T.PerspectiveCamera>

    <!-- Invisible ground plane for raycasting -->
    <T.Mesh
      rotation.x={-Math.PI / 2}
      position.y={0.001}
      onpointerdown={handleGroundPointerDown}
      onpointermove={(e) => { handleGroundPointerMove(e); handleMeshDrag(e); }}
      onpointerup={handleGroundPointerUp}
    >
      <T.PlaneGeometry args={[200, 200]} />
      <T.MeshBasicMaterial visible={false} />
    </T.Mesh>

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
