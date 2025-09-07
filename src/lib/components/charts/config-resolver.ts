/**
 * Configuration resolver for the unified chart system
 * Merges user configuration with smart defaults
 */

import type { 
  UnifiedChartProps, 
  ResolvedChartConfig,
  ChartDataPoint,
  ChartDataValidation,
  ValidationError,
  ValidationWarning,
  DataQualityMetrics
} from './chart-config';
import {
  DEFAULT_AXES_CONFIG,
  DEFAULT_STYLING_CONFIG,
  DEFAULT_INTERACTIONS_CONFIG,
  DEFAULT_TIME_FILTERING_CONFIG,
  DEFAULT_CONTROLS_CONFIG,
  DEFAULT_ANNOTATIONS_CONFIG,
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
    return colorConfig.map((color, index) => {
      // Convert named colors to resolved HSL strings for LayerChart compatibility
      switch (color) {
        case 'primary': return colorUtils.getChartColor(0); // Blue
        case 'secondary': return colorUtils.getChartColor(4); // Orange
        case 'success': return colorUtils.getChartColor(1); // Green
        case 'destructive': return colorUtils.getChartColor(2); // Red
        case 'warning': return colorUtils.getChartColor(3); // Yellow
        case 'muted': return colorUtils.getChartColor(7); // Gray/Pink
        default: 
          // If it's already an HSL string or hex color, return it
          if (color.startsWith('hsl(') || color.startsWith('#') || color.startsWith('rgb(')) {
            return color;
          }
          // Otherwise use indexed chart colors
          return colorUtils.getChartColor(index);
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
  // Merge controls first to get available types
  const controls = deepMerge(
    deepMerge(DEFAULT_CONTROLS_CONFIG, {}),
    props.controls || {}
  );
  
  // Infer chart type if not provided
  let chartType = props.type || inferChartType(props.data);
  
  // Validate chart type against available types if controls specify them
  if (controls.availableTypes && controls.availableTypes.length > 0) {
    if (!controls.availableTypes.includes(chartType)) {
      // Use first available type as fallback
      chartType = controls.availableTypes[0];
    }
  }
  
  // Get chart type specific defaults
  const typeDefaults = CHART_TYPE_DEFAULTS[chartType] || {};
  
  // Re-merge controls with type defaults
  const finalControls = deepMerge(
    deepMerge(DEFAULT_CONTROLS_CONFIG, typeDefaults.controls || {}),
    props.controls || {}
  );
  
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
  
  const annotations = deepMerge(
    deepMerge(DEFAULT_ANNOTATIONS_CONFIG, typeDefaults.annotations || {}),
    props.annotations || {}
  );
  
  // Resolve colors
  const resolvedColors = resolveColors(styling.colors, props.data, chartType);
  
  return {
    type: chartType,
    data: props.data,
    axes,
    styling,
    interactions,
    timeFiltering,
    controls: finalControls,
    annotations,
    resolvedColors
  };
}

/**
 * Enhanced chart data validation with comprehensive quality metrics
 */
export function validateChartData(
  data: ChartDataPoint[], 
  options?: { suppressDuplicateWarnings?: boolean }
): ChartDataValidation {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // Basic structure validation
  if (!Array.isArray(data)) {
    errors.push({
      type: 'structure_error',
      message: 'Data must be an array'
    });
    
    return {
      isValid: false,
      errors,
      warnings,
      dataQuality: {
        totalPoints: 0,
        missingValues: 0,
        duplicateKeys: 0,
        dataTypes: { x: [], y: [] },
        valueRanges: { x: [null, null], y: [0, 0] }
      }
    };
  }
  
  if (data.length === 0) {
    warnings.push({
      type: 'data_quality',
      message: 'Data array is empty',
      suggestion: 'Provide at least one data point for visualization'
    });
    
    return {
      isValid: true,
      errors,
      warnings,
      dataQuality: {
        totalPoints: 0,
        missingValues: 0,
        duplicateKeys: 0,
        dataTypes: { x: [], y: [] },
        valueRanges: { x: [null, null], y: [0, 0] }
      }
    };
  }
  
  // Data quality metrics
  let missingValues = 0;
  const xValues: any[] = [];
  const yValues: number[] = [];
  const xTypes = new Set<string>();
  const yTypes = new Set<string>();
  
  // Validate each data point
  data.forEach((item, index) => {
    // Check required x field
    if (item.x === undefined || item.x === null) {
      errors.push({
        type: 'missing_field',
        message: `Data point at index ${index} is missing required 'x' field`,
        dataIndex: index,
        field: 'x'
      });
      missingValues++;
    } else {
      xValues.push(item.x);
      xTypes.add(typeof item.x);
    }
    
    // Check required y field
    if (item.y === undefined || item.y === null) {
      errors.push({
        type: 'missing_field',
        message: `Data point at index ${index} is missing required 'y' field`,
        dataIndex: index,
        field: 'y'
      });
      missingValues++;
    } else if (typeof item.y !== 'number') {
      errors.push({
        type: 'invalid_type',
        message: `Data point at index ${index} has non-numeric 'y' value: ${item.y}`,
        dataIndex: index,
        field: 'y'
      });
    } else {
      yValues.push(item.y);
      yTypes.add(typeof item.y);
      
      // Check for invalid numbers
      if (!isFinite(item.y)) {
        errors.push({
          type: 'invalid_value',
          message: `Data point at index ${index} has invalid 'y' value (NaN or Infinity): ${item.y}`,
          dataIndex: index,
          field: 'y'
        });
      }
    }
  });
  
  // Calculate duplicate keys
  const uniqueKeys = new Set(xValues.map(x => String(x)));
  const duplicateKeys = xValues.length - uniqueKeys.size;
  
  // Generate warnings for data quality issues
  if (xTypes.size > 1) {
    warnings.push({
      type: 'inconsistent_types',
      message: `Inconsistent x-axis data types found: ${Array.from(xTypes).join(', ')}`,
      suggestion: 'Consider converting all x-axis values to a consistent type'
    });
  }
  
  if (duplicateKeys > 0 && !options?.suppressDuplicateWarnings) {
    warnings.push({
      type: 'data_quality',
      message: `Found ${duplicateKeys} duplicate x-axis values`,
      suggestion: 'Aggregate duplicate entries or ensure unique keys for better visualization'
    });
  }
  
  if (data.length > 1000) {
    warnings.push({
      type: 'performance',
      message: `Large dataset detected (${data.length} points)`,
      suggestion: 'Consider data aggregation or pagination for better performance'
    });
  }
  
  // Calculate value ranges
  const xRange: [any, any] = xValues.length > 0 
    ? [Math.min(...xValues.filter(x => typeof x === 'number')), Math.max(...xValues.filter(x => typeof x === 'number'))]
    : [null, null];
  const yRange: [number, number] = yValues.length > 0 
    ? [Math.min(...yValues), Math.max(...yValues)]
    : [0, 0];
  
  const dataQuality: DataQualityMetrics = {
    totalPoints: data.length,
    missingValues,
    duplicateKeys,
    dataTypes: {
      x: Array.from(xTypes),
      y: Array.from(yTypes)
    },
    valueRanges: { x: xRange, y: yRange }
  };
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    dataQuality
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