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

  // Wall direction and perpendicular
  const dx = x2 - x1;
  const dz = z2 - z1;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 0.01) return new THREE.BufferGeometry();

  // Perpendicular unit vector
  const px = -dz / len;
  const pz = dx / len;
  const halfT = thickness / 2;

  // 4-corner polygon for the wall footprint
  const shape = new THREE.Shape();
  shape.moveTo(x1 + px * halfT, z1 + pz * halfT);
  shape.lineTo(x2 + px * halfT, z2 + pz * halfT);
  shape.lineTo(x2 - px * halfT, z2 - pz * halfT);
  shape.lineTo(x1 - px * halfT, z1 - pz * halfT);
  shape.closePath();

  // Extrude upward
  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: wallHeight,
    bevelEnabled: false,
  };
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  // Rotate so extrusion goes along Y (up) instead of Z
  geometry.rotateX(-Math.PI / 2);
  // Shift up by elevation
  geometry.translate(0, wall.elevation ?? 0, 0);

  if (openings.length === 0) return geometry;

  // CSG: cut openings for doors and windows
  let wallBrush = new Brush(geometry);
  wallBrush.updateMatrixWorld();

  for (const opening of openings) {
    const ow = opening.width || 0.9;
    const oh = opening.height || (opening.nodeType === "door" ? 2.1 : 1.2);

    // Position opening along the wall
    const t = 0.5; // Center of wall by default
    const ox = x1 + dx * t;
    const oz = z1 + dz * t;

    // Vertical position: doors start at floor, windows at 1m
    const oy = opening.nodeType === "door" ? oh / 2 : 1.0 + oh / 2;

    const cutGeom = new THREE.BoxGeometry(ow, oh, thickness * 2);
    const cutBrush = new Brush(cutGeom);

    // Rotate the cut to align with wall direction
    const angle = Math.atan2(dz, dx);
    cutBrush.rotation.y = -angle;
    cutBrush.position.set(ox, oy + (wall.elevation ?? 0), oz);
    cutBrush.updateMatrixWorld();

    wallBrush = evaluator.evaluate(wallBrush, cutBrush, SUBTRACTION) as Brush;
  }

  return wallBrush.geometry;
}

// Scale factor: 2D coordinates use pixels (~20px grid), 3D uses meters
// We divide by a scale factor to convert pixel coordinates to meters
export const SCALE = 1 / 20; // 20 pixels = 1 meter
