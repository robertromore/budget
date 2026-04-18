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
    elevationOffset = 0,
    onclick,
    onpointerdown,
  }: {
    node: FloorPlanNode;
    openings?: FloorPlanNode[];
    selected?: boolean;
    elevationOffset?: number;
    onclick?: PointerHandler;
    onpointerdown?: PointerHandler;
  } = $props();

  let geometry = $state(createGeom());

  function createGeom() {
    return createWallGeometry(
      {
        ...node,
        posX: node.posX * SCALE,
        posY: node.posY * SCALE,
        x2: (node.x2 ?? 0) * SCALE,
        y2: (node.y2 ?? 0) * SCALE,
        elevation: (node.elevation ?? 0) + elevationOffset,
      },
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
      elevationOffset,
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
  // Seed `builtFingerprint` with the fingerprint that corresponds to the
  // initial synchronous geometry build. `untrack` makes it explicit that
  // we only want the initial value here — subsequent updates happen
  // inside the `$effect` below, which owns the reactive dependency.
  let builtFingerprint = untrack(() => geometryFingerprint);
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

  // Unselected walls share the color-keyed preset directly — no clone,
  // no per-render GPU churn when arrow-key nudges or unrelated state
  // changes invalidate this derivation. Only pay for a clone when we
  // need to paint a selection emissive on top of the base material.
  const material = $derived.by(() => {
    const base = wallMaterial(node.color ?? undefined);
    if (!selected) return base;
    const mat = base.clone();
    mat.emissive = new THREE.Color("#3b82f6");
    mat.emissiveIntensity = 0.3;
    return mat;
  });

  // Only clones we created (selection highlight) need disposal; cached
  // presets are long-lived and owned by `disposeMaterials()`.
  let prevMaterial: THREE.Material | null = null;
  let prevMaterialOwned = false;
  $effect(() => {
    const current = material;
    const currentOwned = selected;
    untrack(() => {
      if (prevMaterial && prevMaterialOwned && prevMaterial !== current) {
        prevMaterial.dispose();
      }
      prevMaterial = current;
      prevMaterialOwned = currentOwned;
    });
  });
  onDestroy(() => {
    if (prevMaterialOwned) prevMaterial?.dispose();
  });
</script>

<T.Mesh
  {geometry}
  {material}
  castShadow
  receiveShadow
  {onclick}
  {onpointerdown}
/>
