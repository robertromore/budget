<script lang="ts">
  import { T } from "@threlte/core";
  import { onDestroy } from "svelte";
  import * as THREE from "three";
  import type { FloorPlanNode } from "$core/schema/home/home-floor-plan-nodes";
  import { getFloorPlanAssetProperties } from "$lib/utils/floor-plan-node-properties";
  import { SCALE } from "$lib/utils/wall-csg";

  type PointerHandler = (e: { stopPropagation?: () => void; nativeEvent?: PointerEvent }) => void;

  let {
    node,
    selected = false,
    elevationOffset = 0,
    onclick,
    onpointerdown,
  }: {
    node: FloorPlanNode;
    selected?: boolean;
    elevationOffset?: number;
    onclick?: PointerHandler;
    onpointerdown?: PointerHandler;
  } = $props();

  const width = $derived((node.width > 0 ? node.width : 220) * SCALE);
  const height = $derived((node.height > 0 ? node.height : 160) * SCALE);
  const centerX = $derived((node.posX + (node.width > 0 ? node.width : 220) / 2) * SCALE);
  const centerZ = $derived((node.posY + (node.height > 0 ? node.height : 160) / 2) * SCALE);
  const rotationY = $derived((-(node.rotation ?? 0) * Math.PI) / 180);
  const y = $derived(
    elevationOffset + (node.nodeType === "guide" ? 0.03 : 0.015)
  );
  const assetUrl = $derived(getFloorPlanAssetProperties(node).assetUrl);
  const baseOpacity = $derived(Math.max(0.05, Math.min(1, node.opacity)));
  const isLegacyMarker = $derived(!assetUrl && !(node.width > 0 && node.height > 0));
  const color = $derived(
    node.nodeType === "scan"
      ? selected
        ? "#93c5fd"
        : "#64748b"
      : selected
        ? "#fde68a"
        : "#f59e0b"
  );

  let texture = $state<THREE.Texture | null>(null);
  // Distinguish "no URL configured" from "URL was set but failed to load" so
  // the fallback plane can tint itself to signal the error instead of
  // silently showing the same placeholder as an empty asset.
  let loadError = $state(false);

  $effect(() => {
    const url = assetUrl;
    if (!url) {
      if (texture) {
        texture.dispose();
        texture = null;
      }
      loadError = false;
      return;
    }

    let disposed = false;
    loadError = false;
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (loaded) => {
        if (disposed) {
          loaded.dispose();
          return;
        }
        loaded.needsUpdate = true;
        if (texture) texture.dispose();
        texture = loaded;
        loadError = false;
      },
      undefined,
      () => {
        if (disposed) return;
        if (texture) {
          texture.dispose();
          texture = null;
        }
        loadError = true;
      }
    );

    return () => {
      disposed = true;
    };
  });

  onDestroy(() => {
    if (texture) {
      texture.dispose();
      texture = null;
    }
  });
</script>

{#if isLegacyMarker}
  <T.Mesh
    position.x={node.posX * SCALE}
    position.y={y + 0.12}
    position.z={node.posY * SCALE}
    {onclick}
    {onpointerdown}
  >
    <T.SphereGeometry args={[0.12, 16, 16]} />
    <T.MeshStandardMaterial color={color} />
  </T.Mesh>
{:else}
  <T.Mesh
    position.x={centerX}
    position.y={y}
    position.z={centerZ}
    rotation.x={-Math.PI / 2}
    rotation.y={rotationY}
    {onclick}
    {onpointerdown}
  >
    <T.PlaneGeometry args={[width, height]} />
    {#if texture}
      <T.MeshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        opacity={baseOpacity}
      />
    {:else}
      <T.MeshBasicMaterial
        color={loadError ? "#dc2626" : color}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        opacity={loadError ? Math.max(0.35, Math.min(0.55, baseOpacity)) : Math.min(0.3, baseOpacity)}
      />
    {/if}
  </T.Mesh>
{/if}
