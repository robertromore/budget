// Chart components
export { default as ChartWrapper } from './chart-wrapper.svelte';
export { default as ChartRenderer } from './chart-renderer.svelte';
export { default as ChartTypeSelector } from './chart-type-selector.svelte';
export { default as ChartPeriodControls } from './chart-period-controls.svelte';

// New unified chart system (Phase 1)
export { default as UnifiedChart } from './unified-chart.svelte';

// Re-export layerchart components for direct usage when needed
export {
  Chart,
  Svg,
  Bars,
  Area,
  Spline,
  Axis,
  Arc,
  Points,
  Pie,
  Hull,
  Labels,
  Rule,
  Grid,
  Legend,
  Threshold,
  Calendar
} from 'layerchart';

// Export chart utilities
export { colorUtils } from '$lib/utils/colors';

// Export chart types and constants
export * from './chart-types';

// Export new configuration system
export * from './chart-config';
export * from './config-resolver';

// Chart utilities
export * from '$lib/utils/chart-data';

// Legacy ChartSeries interface (for backward compatibility)
export interface ChartSeries {
  data: any[];
  type: 'bar' | 'area' | 'line' | 'scatter' | 'pie' | 'arc' | 'threshold' | 'calendar' | 'hull';
  color?: string;
  colorIndex?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  fillOpacity?: number;
  label?: string;
  // Additional properties for specific chart types
  r?: number | ((d: any) => number); // For scatter plots
  innerRadius?: number; // For pie/arc charts
  outerRadius?: number; // For pie/arc charts
  startAngle?: number; // For arc charts
  endAngle?: number; // For arc charts
  threshold?: number; // For threshold charts
}

// Legacy ChartConfig interface (for backward compatibility)
export interface ChartConfig {
  data: any[];
  series: ChartSeries[];
  x: string;
  y?: string | string[];
  padding?: { left?: number; right?: number; top?: number; bottom?: number };
  yDomain?: [number | null, number | null];
  yNice?: boolean;
  showLeftAxis?: boolean;
  showBottomAxis?: boolean;
  rotateBottomLabels?: boolean;
  class?: string;
}