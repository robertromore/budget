/**
 * Configuration interfaces for the unified chart system
 * Phase 1: Simplified API with configuration objects
 */

import type { ChartType } from './chart-types';
import type { DateValue } from '@internationalized/date';
import { chartFormatters } from '$lib/utils/chart-formatters';

// Standardized data point interface
export interface ChartDataPoint {
  x: string | number | Date | DateValue;
  y: number;
  category?: string | undefined;
  series?: string | undefined;
  key?: string | undefined; // Unique identifier for Svelte's keyed each blocks
  metadata?: Record<string, any>;
}

// Extended validation interface for enhanced data quality checks
export interface ChartDataValidation {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  dataQuality: DataQualityMetrics;
}

export interface ValidationError {
  type: 'missing_field' | 'invalid_type' | 'invalid_value' | 'structure_error';
  message: string;
  dataIndex?: number;
  field?: string;
}

export interface ValidationWarning {
  type: 'inconsistent_types' | 'missing_optional' | 'data_quality' | 'performance';
  message: string;
  suggestion?: string;
}

export interface DataQualityMetrics {
  totalPoints: number;
  missingValues: number;
  duplicateKeys: number;
  dataTypes: { x: string[], y: string[] };
  valueRanges: { x: [any, any], y: [number, number] };
}

// Axis configuration
export interface AxisConfig {
  show?: boolean;
  title?: string;
  rotateLabels?: boolean;
  nice?: boolean;
  domain?: [number | null, number | null];
  format?: (value: any) => string;
}

export interface AxesConfig {
  x?: AxisConfig;
  y?: AxisConfig;
  secondary?: AxisConfig;
}

// Styling configuration
export interface DimensionConfig {
  padding?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

export interface GridConfig {
  show?: boolean;
  horizontal?: boolean;
  vertical?: boolean;
  opacity?: number;
}

export interface LegendConfig {
  show?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export interface StylingConfig {
  colors?: string[] | 'auto';
  theme?: 'auto' | 'light' | 'dark';
  dimensions?: DimensionConfig;
  grid?: GridConfig;
  legend?: LegendConfig;
}

// Interaction configuration
export interface TooltipConfig {
  enabled?: boolean;
  format?: 'default' | 'currency' | 'percentage' | ((dataPoint: ChartDataPoint) => string);
}

export interface ZoomConfig {
  enabled?: boolean;
  resetButton?: boolean;
}

export interface PanConfig {
  enabled?: boolean;
}

export interface BrushConfig {
  enabled?: boolean;
}

export interface InteractionConfig {
  tooltip?: TooltipConfig;
  zoom?: ZoomConfig;
  pan?: PanConfig;
  brush?: BrushConfig;
}

// Time filtering configuration
export interface TimeFilteringConfig {
  enabled?: boolean;
  field?: string;
  defaultPeriod?: string | number;
  // For transaction-based filtering where data needs to be processed first
  sourceData?: any[]; // Raw transaction/source data
  sourceProcessor?: (sourceData: any[]) => ChartDataPoint[]; // Function to process source data
  sourceDateField?: string; // Date field in source data
}

// Annotation configuration
export interface LabelConfig {
  show?: boolean;
  format?: (datum: any) => string;
  position?: 'top' | 'center' | 'auto';
  placement?: 'inside' | 'outside' | 'center';
  class?: string;
  offset?: { x?: number; y?: number };
}

export interface RuleConfig {
  show?: boolean;
  values?: number[];
  orientation?: 'horizontal' | 'vertical';
  class?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
}

export interface AnnotationConfig {
  type?: 'labels' | 'rules' | 'both';
  labels?: LabelConfig;
  rules?: RuleConfig;
}

// Controls configuration
export interface ControlsConfig {
  show?: boolean;
  availableTypes?: ChartType[];
  allowTypeChange?: boolean;
  allowPeriodChange?: boolean;
  allowColorChange?: boolean;
  allowCurveChange?: boolean;
  allowViewModeChange?: boolean;
  availableViewModes?: ('combined' | 'side-by-side' | 'stacked' | 'overlaid')[];
}

// Main unified chart props interface
export interface UnifiedChartProps {
  // Core data (required)
  data: ChartDataPoint[];
  
  // Chart type with smart default
  type?: ChartType;
  
  // Configuration objects (replace individual props)
  axes?: AxesConfig;
  styling?: StylingConfig;
  interactions?: InteractionConfig;
  timeFiltering?: TimeFilteringConfig;
  controls?: ControlsConfig;
  annotations?: AnnotationConfig;
  
  // Multi-series support
  yFields?: string[];
  yFieldLabels?: string[];
  colorField?: string;
  categoryField?: string;
  
  // View mode support
  viewMode?: 'combined' | 'side-by-side' | 'stacked' | 'overlaid';
  viewModeData?: {
    combined?: ChartDataPoint[];
    income?: ChartDataPoint[];
    expenses?: ChartDataPoint[];
    [key: string]: ChartDataPoint[] | undefined;
  };
  
  // Data validation options
  suppressDuplicateWarnings?: boolean;
  
  // Basic styling
  class?: string;
}

// Default configurations
export const DEFAULT_AXES_CONFIG: Required<AxesConfig> = {
  x: {
    show: true,
    title: '',
    rotateLabels: false,
    nice: false,
    domain: [null, null],
    format: (value: any) => String(value)
  },
  y: {
    show: true,
    title: '',
    rotateLabels: false,
    nice: true,
    domain: [0, null],
    format: (value: any) => String(value)
  },
  secondary: {
    show: false,
    title: '',
    rotateLabels: false,
    nice: true,
    domain: [null, null],
    format: (value: any) => String(value)
  }
};

export const DEFAULT_STYLING_CONFIG: Required<StylingConfig> = {
  colors: 'auto',
  theme: 'auto',
  dimensions: {
    padding: {
      top: 20,
      right: 30,
      bottom: 80,
      left: 80
    }
  },
  grid: {
    show: false,
    horizontal: false,
    vertical: false,
    opacity: 0.1
  },
  legend: {
    show: false,
    position: 'bottom'
  }
};

export const DEFAULT_INTERACTIONS_CONFIG: Required<InteractionConfig> = {
  tooltip: {
    enabled: true,
    format: 'default'
  },
  zoom: {
    enabled: false,
    resetButton: true
  },
  pan: {
    enabled: false
  },
  brush: {
    enabled: false
  }
};

export const DEFAULT_TIME_FILTERING_CONFIG: Required<TimeFilteringConfig> = {
  enabled: false,
  field: 'date',
  defaultPeriod: 0, // All time
  sourceData: [],
  sourceProcessor: (data) => data,
  sourceDateField: 'date'
};

export const DEFAULT_CONTROLS_CONFIG: Required<ControlsConfig> = {
  show: false,
  availableTypes: ['bar', 'line', 'area'],
  allowTypeChange: true,
  allowPeriodChange: true,
  allowColorChange: false,
  allowCurveChange: false,
  allowViewModeChange: false,
  availableViewModes: ['combined', 'side-by-side']
};

export const DEFAULT_ANNOTATIONS_CONFIG: Required<AnnotationConfig> = {
  type: 'labels',
  labels: {
    show: true,
    format: (datum: any) => {
      // Extract the numeric value from the data object
      const value = typeof datum === 'object' && datum !== null 
        ? (datum.y ?? datum.value ?? datum.amount ?? 0)
        : datum;
      return chartFormatters.currency(Number(value) || 0);
    },
    position: 'auto',
    placement: 'outside',
    class: '',
    offset: { x: 0, y: 0 }
  },
  rules: {
    show: false,
    values: [],
    orientation: 'horizontal',
    class: 'stroke-muted-foreground/50',
    strokeWidth: 1,
    strokeDasharray: '2 2'
  }
};

// Configuration resolver utility type
export type ResolvedChartConfig = {
  axes: Required<AxesConfig>;
  styling: Required<StylingConfig>;
  interactions: Required<InteractionConfig>;
  timeFiltering: Required<TimeFilteringConfig>;
  controls: Required<ControlsConfig>;
  annotations: Required<AnnotationConfig>;
};

// Smart defaults based on chart type
export const CHART_TYPE_DEFAULTS: Record<ChartType, Partial<UnifiedChartProps>> = {
  bar: {
    styling: {
      dimensions: { padding: { bottom: 80, left: 80 } }
    }
  },
  line: {
    styling: {
      dimensions: { padding: { bottom: 60, left: 80 } }
    }
  },
  area: {
    styling: {
      dimensions: { padding: { bottom: 60, left: 80 } }
    }
  },
  spline: {
    styling: {
      dimensions: { padding: { bottom: 60, left: 80 } }
    }
  },
  pie: {
    styling: {
      legend: { show: true, position: 'right' },
      dimensions: { padding: { top: 20, right: 120, bottom: 20, left: 20 } }
    },
    axes: {
      x: { show: false },
      y: { show: false }
    }
  },
  arc: {
    styling: {
      legend: { show: true, position: 'right' },
      dimensions: { padding: { top: 20, right: 120, bottom: 20, left: 20 } }
    },
    axes: {
      x: { show: false },
      y: { show: false }
    }
  },
  scatter: {
    styling: {
      dimensions: { padding: { bottom: 80, left: 80 } }
    }
  },
  threshold: {
    styling: {
      dimensions: { padding: { bottom: 80, left: 80 } }
    }
  },
  hull: {
    styling: {
      dimensions: { padding: { bottom: 80, left: 80 } }
    }
  },
  calendar: {
    styling: {
      dimensions: { padding: { top: 20, right: 30, bottom: 40, left: 60 } }
    },
    axes: {
      x: { show: false },
      y: { show: false }
    }
  }
};

// Common configuration presets for financial data
export const FINANCIAL_CHART_PRESETS = {
  balanceTrend: {
    type: 'line' as ChartType,
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
    }
  },
  
  incomeExpenses: {
    type: 'bar' as ChartType,
    axes: {
      x: { title: 'Month', rotateLabels: true },
      y: { title: 'Amount ($)', nice: true }
    },
    styling: {
      colors: ['success', 'destructive'],
      legend: { show: true, position: 'top' }
    },
    timeFiltering: { enabled: true, field: 'month' }
  },
  
  categoryBreakdown: {
    type: 'pie' as ChartType,
    styling: {
      legend: { show: true, position: 'right' }
    }
  }
} as const;