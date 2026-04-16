<script lang="ts">
  import { T } from "@threlte/core";
  import { onDestroy, untrack } from "svelte";
  import type { FloorPlanNode } from "$core/schema/home/home-floor-plan-nodes";
  import { createWallGeometry, SCALE } from "$lib/utils/wall-csg";
  import { wallMaterial } from "$lib/utils/material-presets";
  import * as THREE from "three";

  type PointerHandler = (e: { stopPropagation: () => void; nativeEvent?: PointerEvent }) => void;

  let {
    node,
    openings = [],
    selected = false,
    onclick,
    onpointerdown,
  }: {
    node: FloorPlanNode;
    openings?: FloorPlanNode[];
    selected?: boolean;
    onclick?: PointerHandler;
    onpointerdown?: PointerHandler;
  } = $props();

  let geometry = $state(createGeom());

  function createGeom() {
    return createWallGeometry(
      { ...node, posX: node.posX * SCALE, posY: node.posY * SCALE, x2: (node.x2 ?? 0) * SCALE, y2: (node.y2 ?? 0) * SCALE },
      openings
    );
  }

  /**
   * Fingerprint of every input that influences the baked geometry — wall
   * endpoints, thickness, height, and the full set of openings. The CSG
   * picks default opening heights from `nodeType`, so flipping a door to
   * a window via the properties panel must retrigger a rebuild; include
   * `nodeType` to cover that.
   */
  const geometryFingerprint = $derived(
    [
      node.posX,
      node.posY,
      node.x2,
      node.y2,
      node.wallHeight,
      node.thickness,
      node.elevation,
      ...openings.map(
        (o) =>
          `${o.id}:${o.nodeType}:${o.posX}:${o.posY}:${o.width}:${o.height}:${o.rotation}:${o.wallHeight}`
      ),
    ].join("|")
  );

  /**
   * Debounce CSG rebuilds. `three-bvh-csg` subtraction is expensive and the
   * fingerprint changes on every pointer-move while a door or window is
   * being dragged. Without debouncing we'd run a full CSG pass at 60 fps
   * for every wall with an opening — measurable frame drops.
   *
   * Rather than a "skip first run" flag, track the fingerprint that seeded
   * the initial synchronous build and rebuild only when the current value
   * differs. The first effect invocation sees the same fingerprint and is
   * a natural no-op; later refactors that mutate state between mount and
   * first-effect can't silently miss a rebuild.
   */
  const REBUILD_DEBOUNCE_MS = 80;
  let builtFingerprint = geometryFingerprint;
  let rebuildTimer: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    const current = geometryFingerprint;
    if (current === builtFingerprint) return;

    if (rebuildTimer !== null) clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => {
      rebuildTimer = null;
      const newGeom = createGeom();
      untrack(() => {
        const oldGeom = geometry;
        geometry = newGeom;
        builtFingerprint = current;
        if (oldGeom && oldGeom !== newGeom) oldGeom.dispose();
      });
    }, REBUILD_DEBOUNCE_MS);
  });

  onDestroy(() => {
    if (rebuildTimer !== null) clearTimeout(rebuildTimer);
    geometry?.dispose();
  });

  const material = $derived.by(() => {
    const mat = wallMaterial(node.color ?? undefined).clone();
    if (selected) {
      mat.emissive = new THREE.Color("#3b82f6");
      mat.emissiveIntensity = 0.3;
    }
    return mat;
  });

  // Dispose the prior material clone whenever the reactive derivation yields
  // a new one. Without this the clones accumulated on every selection /
  // color change, leaking GPU memory for the life of the scene.
  let prevMaterial: THREE.Material | null = null;
  $effect(() => {
    const current = material;
    untrack(() => {
      if (prevMaterial && prevMaterial !== current) {
        prevMaterial.dispose();
      }
      prevMaterial = current;
    });
  });
  onDestroy(() => prevMaterial?.dispose());
</script>

<T.Mesh
  {geometry}
  {material}
  castShadow
  receiveShadow
  {onclick}
  {onpointerdown}
/>
