import type { FloorPlanNode } from "$core/schema/home/home-floor-plan-nodes";

export type FloorPlanNodeProperties = Record<string, unknown>;

export type FloorPlanAssetProperties = {
  assetUrl: string | null;
  naturalWidth: number | null;
  naturalHeight: number | null;
  lockAspectRatio: boolean;
};

export function parseFloorPlanNodeProperties(
  properties: string | null
): FloorPlanNodeProperties {
  if (!properties) return {};
  try {
    const parsed = JSON.parse(properties);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as FloorPlanNodeProperties;
  } catch {
    return {};
  }
}

export function stringifyFloorPlanNodeProperties(
  properties: FloorPlanNodeProperties
): string | null {
  const entries = Object.entries(properties).filter(([, value]) => {
    if (value === null || value === undefined) return false;
    if (typeof value === "string" && value.trim().length === 0) return false;
    return true;
  });
  if (entries.length === 0) return null;
  return JSON.stringify(Object.fromEntries(entries));
}

export function patchFloorPlanNodeProperties(
  currentProperties: string | null,
  patch: FloorPlanNodeProperties
): string | null {
  const next = parseFloorPlanNodeProperties(currentProperties);
  for (const [key, value] of Object.entries(patch)) {
    if (
      value === null ||
      value === undefined ||
      (typeof value === "string" && value.trim().length === 0)
    ) {
      delete next[key];
      continue;
    }
    next[key] = value;
  }
  return stringifyFloorPlanNodeProperties(next);
}

function readNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getFloorPlanAssetProperties(
  node: Pick<FloorPlanNode, "properties">
): FloorPlanAssetProperties {
  const props = parseFloorPlanNodeProperties(node.properties);
  return {
    assetUrl: readString(props.assetUrl),
    naturalWidth: readNumber(props.naturalWidth),
    naturalHeight: readNumber(props.naturalHeight),
    lockAspectRatio: readBoolean(props.lockAspectRatio, true),
  };
}
