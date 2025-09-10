/**
 * Chart System Exports
 * Clean, package-ready exports without business logic
 */

// Main chart component
export {default as UnifiedChart} from "./unified-chart.svelte";

// Core components
export {default as ChartCore} from "./core/chart-core.svelte";
export {default as DynamicChartRenderer} from "./core/dynamic-chart-renderer.svelte";
export {default as ChartTooltip} from "./core/chart-tooltip.svelte";
export {default as ChartLegend} from "./core/chart-legend.svelte";

// Control components
export {default as ChartPeriodControls} from "./controls/chart-period-controls.svelte";
export {default as ChartTypeSelector} from "./controls/chart-type-selector.svelte";
export {default as ChartColorSelector} from "./controls/chart-color-selector.svelte";
export {default as ChartCurveSelector} from "./controls/chart-curve-selector.svelte";
export {default as ChartViewModeSelector} from "./controls/chart-view-mode-selector.svelte";

// Configuration and types
export * from "./config/chart-config";
export * from "./config/config-resolver";
export * from "./config/chart-types";
export * from "./config/layerchart-registry";

// Data processing
export * from "./processors/chart-data-processor.svelte";

// Re-export LayerChart components for convenience
export {
  Arc,
  Area,
  Axis,
  Bars,
  Calendar,
  Chart,
  Grid,
  Hull,
  Labels,
  Legend,
  Line,
  Pie,
  Points,
  Rule,
  Spline,
  Svg,
  Threshold,
} from "layerchart";

// Re-export generic chart utilities (NOT finance-specific)
export * from "$lib/utils/chart-data";
export * from "$lib/utils/chart-colors";
export * from "$lib/utils/chart-curves";
export * from "$lib/utils/chart-periods";

// Re-export color utilities (generic theming)
export {colorUtils} from "$lib/utils/colors";
