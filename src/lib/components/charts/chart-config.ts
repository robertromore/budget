/**
 * Configuration interfaces for the unified chart system
 * Phase 1: Simplified API with configuration objects
 */

import type { ChartType } from './chart-types';

// Standardized data point interface
export interface ChartDataPoint {
  x: string | number | Date;
  y: number;
  category?: string;
  metadata?: Record<string, any>;
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
  format?: (dataPoint: ChartDataPoint) => string;
}

export interface ZoomConfig {
  enabled?: boolean;
  resetButton?: boolean;
}

export interface InteractionConfig {
  tooltip?: TooltipConfig;
  zoom?: ZoomConfig;
}

// Time filtering configuration
export interface TimeFilteringConfig {
  enabled?: boolean;
  field?: string;
  defaultPeriod?: string | number;
}

// Controls configuration
export interface ControlsConfig {
  show?: boolean;
  availableTypes?: ChartType[];
  allowTypeChange?: boolean;
  allowPeriodChange?: boolean;
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
    format: (dataPoint: ChartDataPoint) => `${dataPoint.x}: ${dataPoint.y}`
  },
  zoom: {
    enabled: false,
    resetButton: true
  }
};

export const DEFAULT_TIME_FILTERING_CONFIG: Required<TimeFilteringConfig> = {
  enabled: false,
  field: 'date',
  defaultPeriod: 0 // All time
};

export const DEFAULT_CONTROLS_CONFIG: Required<ControlsConfig> = {
  show: false,
  availableTypes: ['bar', 'line', 'area'],
  allowTypeChange: true,
  allowPeriodChange: true
};

// Configuration resolver utility type
export type ResolvedChartConfig = {
  axes: Required<AxesConfig>;
  styling: Required<StylingConfig>;
  interactions: Required<InteractionConfig>;
  timeFiltering: Required<TimeFilteringConfig>;
  controls: Required<ControlsConfig>;
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