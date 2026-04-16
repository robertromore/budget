import * as THREE from "three";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import type { FloorPlanNode } from "$core/schema/home/home-floor-plan-nodes";

/**
 * `three-bvh-csg`'s `Evaluator` holds internal scratch buffers that are not
 * safe to share across interleaved evaluations. The previous implementation
 * used a module-level singleton — that was fine sequentially, but Svelte
 * reactivity can fire effects from multiple walls on the same tick, which
 * could corrupt the scratch state mid-evaluation.
 *
 * A per-invocation Evaluator is trivial to construct (no heavy init) and
 * eliminates the re-entrancy hazard. We still dispose intermediate geometry
 * at the end of each call so the new Evaluator doesn't leak.
 *
 * UNIT CONVENTIONS INSIDE THIS FUNCTION (important — these differ between
 * arguments):
 *   - `wall.posX, wall.posY, wall.x2, wall.y2` are in METRES. Callers
 *     (see `wall-mesh.svelte`) pre-multiply the store's pixel values by
 *     SCALE before calling this function.
 *   - `wall.wallHeight, wall.thickness, wall.elevation` are in METRES
 *     natively (stored that way in the schema).
 *   - `opening.posX, opening.posY, opening.width, opening.height` are in
 *     PIXELS (raw store values). This function only scales width; vertical
 *     cut height is derived from node type to match 3D mesh sizing.
 *   - `opening.posX, opening.posY` represent the CENTRE of the opening
 *     on the wall (matches `FloorPlanStore.placeOpening` output and the
 *     2D/3D anchor convention). The CSG projects that point onto the
 *     wall segment to find where to cut the hole.
 */
export function createWallGeometry(
  wall: FloorPlanNode,
  openings: FloorPlanNode[]
): THREE.BufferGeometry {
  const evaluator = new Evaluator();
  const x1 = wall.posX;
  const z1 = wall.posY;
  const x2 = wall.x2 ?? x1;
  const z2 = wall.y2 ?? z1;
  const thickness = wall.thickness ?? 0.15;
  const wallHeight = wall.wallHeight ?? 2.5;

  const dx = x2 - x1;
  const dz = z2 - z1;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 0.01) return new THREE.BufferGeometry();

  const px = -dz / len;
  const pz = dx / len;
  const halfT = thickness / 2;

  const shape = new THREE.Shape();
  shape.moveTo(x1 + px * halfT, z1 + pz * halfT);
  shape.lineTo(x2 + px * halfT, z2 + pz * halfT);
  shape.lineTo(x2 - px * halfT, z2 - pz * halfT);
  shape.lineTo(x1 - px * halfT, z1 - pz * halfT);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: wallHeight,
    bevelEnabled: false,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, wall.elevation ?? 0, 0);

  if (openings.length === 0) return geometry;

  // CSG: cut openings for doors and windows
  const disposables: THREE.BufferGeometry[] = [];
  let wallBrush = new Brush(geometry);
  wallBrush.updateMatrixWorld();

  const wallAngle = Math.atan2(dz, dx);

  for (const opening of openings) {
    const ow = (opening.width || 0.9) * SCALE;
    const oh = opening.nodeType === "door" ? (opening.wallHeight ?? 2.1) : 1.2;

    // Project opening position onto the wall segment to get parametric t
    const opx = (opening.posX ?? 0) * SCALE - x1;
    const opz = (opening.posY ?? 0) * SCALE - z1;
    const t = Math.max(0.05, Math.min(0.95, (opx * dx + opz * dz) / (len * len)));

    const ox = x1 + dx * t;
    const oz = z1 + dz * t;
    const oy =
      opening.nodeType === "door"
        ? oh / 2
        : 1.0 + oh / 2;

    const cutGeom = new THREE.BoxGeometry(ow, oh, thickness * 2);
    disposables.push(cutGeom);
    const cutBrush = new Brush(cutGeom);

    cutBrush.rotation.y = -wallAngle;
    cutBrush.position.set(ox, oy + (wall.elevation ?? 0) + (opening.elevation ?? 0), oz);
    cutBrush.updateMatrixWorld();

    const prevGeom = wallBrush.geometry;
    wallBrush = evaluator.evaluate(wallBrush, cutBrush, SUBTRACTION) as Brush;
    // Dispose intermediate geometry from previous iteration
    if (prevGeom !== geometry) {
      disposables.push(prevGeom);
    }
  }

  // Dispose all intermediates (but NOT the final result)
  for (const g of disposables) {
    g.dispose();
  }

  return wallBrush.geometry;
}

/**
 * Scale factor bridging the two coordinate systems used by the floor plan.
 *
 * Node geometry fields have mixed units:
 *   - `posX`, `posY`, `width`, `height`, `x2`, `y2` are stored in **pixels**
 *     to match the 2D SVG canvas (~20 pixels per grid cell).
 *   - `wallHeight`, `thickness`, `elevation` are stored in **metres** because
 *     they only have meaning in the 3D view.
 *
 * Multiply a pixel value by `SCALE` to convert to metres; divide by `SCALE`
 * to go the other way. Callers in the 3D viewer must NOT multiply the
 * already-metric fields by `SCALE`, and the 2D view must NOT divide them.
 */
export const SCALE = 1 / 20;
