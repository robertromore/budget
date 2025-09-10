import {describe, it, expect} from "vitest";
import {
  getCurveFunction,
  isCurveString,
  transformCurveInConfig,
  CURVE_MAP,
} from "$lib/utils/chart-curves";
import {
  curveLinear,
  curveMonotoneX,
  curveCardinal,
  curveCatmullRom,
  curveNatural,
  curveBasis,
  curveStep,
} from "d3-shape";

describe("chart-curves utility", () => {
  describe("getCurveFunction", () => {
    it("returns correct curve function for valid string names", () => {
      expect(getCurveFunction("curveLinear")).toBe(curveLinear);
      expect(getCurveFunction("curveMonotoneX")).toBe(curveMonotoneX);
      expect(getCurveFunction("curveCardinal")).toBe(curveCardinal);
      expect(getCurveFunction("curveCatmullRom")).toBe(curveCatmullRom);
      expect(getCurveFunction("curveNatural")).toBe(curveNatural);
      expect(getCurveFunction("curveBasis")).toBe(curveBasis);
      expect(getCurveFunction("curveStep")).toBe(curveStep);
    });

    it("returns curveLinear as default for invalid or undefined names", () => {
      expect(getCurveFunction(undefined)).toBe(curveLinear);
      expect(getCurveFunction("invalidCurve")).toBe(curveLinear);
      expect(getCurveFunction("")).toBe(curveLinear);
    });
  });

  describe("isCurveString", () => {
    it("returns true for valid curve string names", () => {
      expect(isCurveString("curveLinear")).toBe(true);
      expect(isCurveString("curveMonotoneX")).toBe(true);
      expect(isCurveString("curveStep")).toBe(true);
    });

    it("returns false for invalid values", () => {
      expect(isCurveString("invalidCurve")).toBe(false);
      expect(isCurveString(undefined)).toBe(false);
      expect(isCurveString(null)).toBe(false);
      expect(isCurveString(123)).toBe(false);
      expect(isCurveString(curveLinear)).toBe(false); // Already a function
    });
  });

  describe("transformCurveInConfig", () => {
    it("transforms curve string to function in config", () => {
      const config = {
        curve: "curveMonotoneX",
        strokeWidth: 2,
        fill: "blue",
      };

      const transformed = transformCurveInConfig(config);

      expect(transformed.curve).toBe(curveMonotoneX);
      expect(transformed.strokeWidth).toBe(2);
      expect(transformed.fill).toBe("blue");
    });

    it("returns config unchanged if curve is already a function", () => {
      const config = {
        curve: curveNatural,
        strokeWidth: 2,
      };

      const transformed = transformCurveInConfig(config);

      expect(transformed.curve).toBe(curveNatural);
      expect(transformed.strokeWidth).toBe(2);
    });

    it("returns config unchanged if no curve property", () => {
      const config = {
        strokeWidth: 2,
        fill: "red",
      };

      const transformed = transformCurveInConfig(config);

      expect(transformed).toEqual(config);
    });

    it("handles invalid curve strings by using default", () => {
      const config = {
        curve: "invalidCurveName",
        strokeWidth: 2,
      };

      const transformed = transformCurveInConfig(config);

      expect(transformed.curve).toBe(curveLinear);
      expect(transformed.strokeWidth).toBe(2);
    });
  });

  describe("CURVE_MAP", () => {
    it("contains all expected curve functions", () => {
      expect(CURVE_MAP.curveLinear).toBe(curveLinear);
      expect(CURVE_MAP.curveMonotoneX).toBe(curveMonotoneX);
      expect(CURVE_MAP.curveCardinal).toBe(curveCardinal);
      expect(CURVE_MAP.curveCatmullRom).toBe(curveCatmullRom);
      expect(CURVE_MAP.curveNatural).toBe(curveNatural);
      expect(CURVE_MAP.curveBasis).toBe(curveBasis);
      expect(CURVE_MAP.curveStep).toBe(curveStep);
    });

    it("has correct number of curve functions", () => {
      expect(Object.keys(CURVE_MAP).length).toBe(7);
    });
  });
});
