import { type CurveFactory } from "d3-shape";
/**
 * Map of curve string names to actual D3 curve functions
 * These are used by LayerChart components like Area, Spline, and Line
 */
export declare const CURVE_MAP: Record<string, CurveFactory>;
/**
 * Get a D3 curve function from a string name
 * @param curveName - String name of the curve (e.g., 'curveLinear')
 * @returns The actual D3 curve function, or curveLinear as default
 */
export declare function getCurveFunction(curveName: string | undefined): CurveFactory;
/**
 * Check if a value is a curve string that needs to be converted
 * @param value - Value to check
 * @returns True if the value is a string curve name
 */
export declare function isCurveString(value: any): value is string;
/**
 * Transform config props to convert curve strings to functions
 * @param config - Configuration object that may contain curve property
 * @returns Config with curve string converted to function
 */
export declare function transformCurveInConfig(config: Record<string, any>): Record<string, any>;
//# sourceMappingURL=chart-curves.d.ts.map