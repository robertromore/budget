import {
  curveBasis,
  curveCardinal,
  curveCatmullRom,
  curveLinear,
  curveMonotoneX,
  curveNatural,
  curveStep,
  type CurveFactory,
} from "d3-shape";

/**
 * Map of curve string names to actual D3 curve functions
 * These are used by LayerChart components like Area, Spline, and Line
 */
export const CURVE_MAP: Record<string, CurveFactory> = {
  curveLinear,
  curveMonotoneX,
  curveCardinal,
  curveCatmullRom,
  curveNatural,
  curveBasis,
  curveStep,
};

/**
 * Get a D3 curve function from a string name
 * @param curveName - String name of the curve (e.g., 'curveLinear')
 * @returns The actual D3 curve function, or curveLinear as default
 */
export function getCurveFunction(curveName: string | undefined): CurveFactory {
  if (!curveName) return curveLinear;

  return CURVE_MAP[curveName] || curveLinear;
}

/**
 * Check if a value is a curve string that needs to be converted
 * @param value - Value to check
 * @returns True if the value is a string curve name
 */
export function isCurveString(value: any): value is string {
  return typeof value === "string" && value in CURVE_MAP;
}

/**
 * Transform config props to convert curve strings to functions
 * @param config - Configuration object that may contain curve property
 * @returns Config with curve string converted to function
 */
export function transformCurveInConfig(config: Record<string, any>): Record<string, any> {
  if (!config["curve"]) return config;

  // If curve is already a function, return as-is
  if (typeof config["curve"] === "function") return config;

  // If curve is a string (valid or invalid), convert to function
  if (typeof config["curve"] === "string") {
    return {
      ...config,
      curve: getCurveFunction(config["curve"]),
    };
  }

  return config;
}
