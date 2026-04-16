import { describe, expect, it } from "vitest";

/**
 * FP-M9 regression test.
 *
 * The floor-plan SVG canvas relies on `preserveAspectRatio="none"` and
 * converts pointer coordinates to store coordinates by scaling clientX /
 * clientY independently against the rendered width/height. If the SVG ever
 * stops using `preserveAspectRatio="none"`, this math silently miscomputes
 * (the viewBox letterboxes inside the rect, so x and y have different
 * effective offsets).
 *
 * This test isolates the math from the component so the invariant is
 * verified without a browser. `floor-plan-canvas.svelte` inlines an
 * equivalent function; if the production code diverges from this reference
 * implementation, the test should be updated to import the real helper.
 */
function svgPoint(
  e: { clientX: number; clientY: number },
  rect: { left: number; top: number; width: number; height: number },
  viewBox: { x: number; y: number; width: number; height: number }
): { x: number; y: number } {
  const scaleX = viewBox.width / rect.width;
  const scaleY = viewBox.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX + viewBox.x,
    y: (e.clientY - rect.top) * scaleY + viewBox.y,
  };
}

describe("floor-plan svgPoint (cursor → world mapping)", () => {
  const baseRect = { left: 0, top: 0, width: 1200, height: 800 };
  const baseViewBox = { x: 0, y: 0, width: 1200, height: 800 };

  it("maps identity viewBox directly", () => {
    expect(svgPoint({ clientX: 100, clientY: 200 }, baseRect, baseViewBox)).toEqual({
      x: 100,
      y: 200,
    });
  });

  it("scales independently in x and y when rect aspect differs from viewBox", () => {
    const rect = { left: 0, top: 0, width: 600, height: 800 };
    // 50% horizontal scale, 100% vertical scale — only valid with
    // preserveAspectRatio="none".
    expect(svgPoint({ clientX: 300, clientY: 400 }, rect, baseViewBox)).toEqual({
      x: 600,
      y: 400,
    });
  });

  it("respects viewBox pan offsets", () => {
    const viewBox = { x: 500, y: -200, width: 1200, height: 800 };
    expect(svgPoint({ clientX: 0, clientY: 0 }, baseRect, viewBox)).toEqual({
      x: 500,
      y: -200,
    });
  });

  it("applies zoom (smaller viewBox, same rect)", () => {
    const viewBox = { x: 0, y: 0, width: 600, height: 400 };
    // Rect is 1200×800, viewBox is 600×400 → 2x zoom.
    expect(svgPoint({ clientX: 1200, clientY: 800 }, baseRect, viewBox)).toEqual({
      x: 600,
      y: 400,
    });
  });

  it("handles rect offset from the page origin", () => {
    const rect = { left: 50, top: 100, width: 1200, height: 800 };
    expect(svgPoint({ clientX: 50, clientY: 100 }, rect, baseViewBox)).toEqual({
      x: 0,
      y: 0,
    });
  });
});
