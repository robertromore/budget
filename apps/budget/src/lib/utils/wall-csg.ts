import * as THREE from "three";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import type { FloorPlanNode } from "$core/schema/home/home-floor-plan-nodes";

const evaluator = new Evaluator();

export function createWallGeometry(
  wall: FloorPlanNode,
  openings: FloorPlanNode[]
): THREE.BufferGeometry {
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
    const oh = opening.height
      ? opening.height * SCALE
      : opening.nodeType === "door"
        ? 2.1
        : 1.2;

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
    cutBrush.position.set(ox, oy + (wall.elevation ?? 0), oz);
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

// Scale factor: 2D coordinates use pixels (~20px grid), 3D uses meters
export const SCALE = 1 / 20;
