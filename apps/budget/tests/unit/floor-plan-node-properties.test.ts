import { describe, expect, it } from "vitest";
import {
  getFloorPlanAssetProperties,
  patchFloorPlanNodeProperties,
  parseFloorPlanNodeProperties,
  stringifyFloorPlanNodeProperties,
} from "$lib/utils/floor-plan-node-properties";

describe("floor-plan-node-properties helpers", () => {
  it("patches only the targeted keys and preserves existing metadata", () => {
    const base = JSON.stringify({
      autoDetected: true,
      boundarySignature: "sig",
      lockAspectRatio: true,
    });
    const next = patchFloorPlanNodeProperties(base, {
      assetUrl: "https://example.com/plan.png",
      naturalWidth: 1200,
      naturalHeight: 900,
    });

    const parsed = parseFloorPlanNodeProperties(next);
    expect(parsed.autoDetected).toBe(true);
    expect(parsed.boundarySignature).toBe("sig");
    expect(parsed.assetUrl).toBe("https://example.com/plan.png");
    expect(parsed.naturalWidth).toBe(1200);
    expect(parsed.naturalHeight).toBe(900);
  });

  it("returns normalized asset properties with safe defaults", () => {
    const node = {
      properties: stringifyFloorPlanNodeProperties({
        assetUrl: " data:image/png;base64,abc ",
        naturalWidth: 1024,
        naturalHeight: 768,
      }),
    };
    const asset = getFloorPlanAssetProperties(node);
    expect(asset.assetUrl).toBe("data:image/png;base64,abc");
    expect(asset.naturalWidth).toBe(1024);
    expect(asset.naturalHeight).toBe(768);
    expect(asset.lockAspectRatio).toBe(true);
  });
});
