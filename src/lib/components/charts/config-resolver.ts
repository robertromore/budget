/**
 * Configuration resolver for the unified chart system
 * Merges user configuration with smart defaults
 */

import type { 
  UnifiedChartProps, 
  ResolvedChartConfig,
  ChartDataPoint
} from './chart-config';
import {
  DEFAULT_AXES_CONFIG,
  DEFAULT_STYLING_CONFIG,
  DEFAULT_INTERACTIONS_CONFIG,
  DEFAULT_TIME_FILTERING_CONFIG,
  DEFAULT_CONTROLS_CONFIG,
  CHART_TYPE_DEFAULTS
} from './chart-config';
import type { ChartType } from './chart-types';
import { colorUtils } from '$lib/utils/colors';

/**
 * Deep merge utility for configuration objects
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  
  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];
    
    if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
      result[key] = deepMerge(targetValue || {} as any, sourceValue) as any;
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as any;
    }
  }
  
  return result;
}

/**
 * Resolves color configuration based on theme and data
 */
function resolveColors(
  colorConfig: string[] | 'auto', 
  data: ChartDataPoint[], 
  chartType: ChartType
): string[] {
  if (Array.isArray(colorConfig)) {
    return colorConfig.map(color => {
      // Convert named colors to CSS variables
      switch (color) {
        case 'primary': return 'hsl(var(--primary))';
        case 'secondary': return 'hsl(var(--secondary))';
        case 'success': return 'hsl(var(--success))';
        case 'destructive': return 'hsl(var(--destructive))';
        case 'warning': return 'hsl(var(--warning))';
        case 'muted': return 'hsl(var(--muted))';
        default: return color;
      }
    });
  }
  
  // Auto color generation based on data and chart type
  if (chartType === 'pie' || chartType === 'arc') {
    // For pie charts, generate colors based on unique categories
    const categories = [...new Set(data.map(d => d.category))];
    return categories.map((_, index) => colorUtils.getChartColor(index));
  }
  
  // For other chart types, use primary colors
  return [colorUtils.getChartColor(0), colorUtils.getChartColor(1)];
}

/**
 * Infers chart type based on data characteristics
 */
function inferChartType(data: ChartDataPoint[]): ChartType {
  if (data.length === 0) return 'bar';
  
  // Check if data has categories (suggests pie chart)
  const hasCategories = data.some(d => d.category !== undefined);
  if (hasCategories) {
    return 'pie';
  }
  
  // Check if x values are dates (suggests line chart)
  const hasDateX = data.some(d => d.x instanceof Date || 
    (typeof d.x === 'string' && !isNaN(Date.parse(d.x))));
  if (hasDateX) {
    return 'line';
  }
  
  // Default to bar chart
  return 'bar';
}

/**
 * Resolves the complete chart configuration
 */
export function resolveChartConfig(
  props: UnifiedChartProps
): ResolvedChartConfig & { 
  type: ChartType; 
  data: ChartDataPoint[];
  resolvedColors: string[];
} {
  // Infer chart type if not provided
  const chartType = props.type || inferChartType(props.data);
  
  // Get chart type specific defaults
  const typeDefaults = CHART_TYPE_DEFAULTS[chartType] || {};
  
  // Merge configurations with priority: user config > type defaults > system defaults
  const axes = deepMerge(
    deepMerge(DEFAULT_AXES_CONFIG, typeDefaults.axes || {}),
    props.axes || {}
  );
  
  const styling = deepMerge(
    deepMerge(DEFAULT_STYLING_CONFIG, typeDefaults.styling || {}),
    props.styling || {}
  );
  
  const interactions = deepMerge(
    deepMerge(DEFAULT_INTERACTIONS_CONFIG, typeDefaults.interactions || {}),
    props.interactions || {}
  );
  
  const timeFiltering = deepMerge(
    deepMerge(DEFAULT_TIME_FILTERING_CONFIG, typeDefaults.timeFiltering || {}),
    props.timeFiltering || {}
  );
  
  const controls = deepMerge(
    deepMerge(DEFAULT_CONTROLS_CONFIG, typeDefaults.controls || {}),
    props.controls || {}
  );
  
  // Resolve colors
  const resolvedColors = resolveColors(styling.colors, props.data, chartType);
  
  return {
    type: chartType,
    data: props.data,
    axes,
    styling: {
      ...styling,
      colors: resolvedColors
    },
    interactions,
    timeFiltering,
    controls,
    resolvedColors
  };
}

/**
 * Validates chart data and provides helpful error messages
 */
export function validateChartData(data: ChartDataPoint[]): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!Array.isArray(data)) {
    errors.push('Data must be an array');
    return { isValid: false, errors, warnings };
  }
  
  if (data.length === 0) {
    warnings.push('Data array is empty');
    return { isValid: true, errors, warnings };
  }
  
  // Check required fields
  data.forEach((item, index) => {
    if (item.x === undefined || item.x === null) {
      errors.push(`Data point at index ${index} is missing required 'x' field`);
    }
    
    if (item.y === undefined || item.y === null) {
      errors.push(`Data point at index ${index} is missing required 'y' field`);
    }
    
    if (typeof item.y !== 'number') {
      errors.push(`Data point at index ${index} has non-numeric 'y' value: ${item.y}`);
    }
  });
  
  // Check for consistency warnings
  const xTypes = [...new Set(data.map(d => typeof d.x))];
  if (xTypes.length > 1) {
    warnings.push(`Inconsistent x-axis data types found: ${xTypes.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Transforms raw data into standardized ChartDataPoint format
 */
export function standardizeChartData(
  rawData: any[], 
  mapping: {
    x: string;
    y: string;
    category?: string;
  }
): ChartDataPoint[] {
  return rawData.map(item => ({
    x: item[mapping.x],
    y: Number(item[mapping.y]) || 0,
    ...(mapping.category && { category: item[mapping.category] }),
    metadata: item
  }));
}

/**
 * Configuration helpers for common use cases
 */
export const configHelpers = {
  /**
   * Creates configuration for financial balance trends
   */
  balanceTrend: (overrides?: Partial<UnifiedChartProps>): UnifiedChartProps => ({
    type: 'line',
    axes: {
      x: { title: 'Date', rotateLabels: true },
      y: { title: 'Balance ($)', nice: true }
    },
    styling: {
      colors: ['primary'],
      grid: { show: true, horizontal: true }
    },
    timeFiltering: { enabled: true, field: 'date' },
    controls: { 
      show: true, 
      availableTypes: ['line', 'area', 'bar'],
      allowPeriodChange: true 
    },
    ...overrides,
    data: [] // Will be overridden by actual data
  }),

  /**
   * Creates configuration for income vs expenses comparison
   */
  incomeExpenses: (overrides?: Partial<UnifiedChartProps>): UnifiedChartProps => ({
    type: 'bar',
    axes: {
      x: { title: 'Month', rotateLabels: true },
      y: { title: 'Amount ($)', nice: true }
    },
    styling: {
      colors: ['success', 'destructive'],
      legend: { show: true, position: 'top' }
    },
    timeFiltering: { enabled: true, field: 'month' },
    ...overrides,
    data: [] // Will be overridden by actual data
  }),

  /**
   * Creates configuration for category breakdown pie chart
   */
  categoryBreakdown: (overrides?: Partial<UnifiedChartProps>): UnifiedChartProps => ({
    type: 'pie',
    styling: {
      legend: { show: true, position: 'right' }
    },
    ...overrides,
    data: [] // Will be overridden by actual data
  })
};