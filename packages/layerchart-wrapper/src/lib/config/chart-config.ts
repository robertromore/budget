import type { DateValue } from "@internationalized/date";
import { chartFormatters } from "@budget-shared/utils";
import type { ChartType } from "./chart-types";

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
  type: "missing_field" | "invalid_type" | "invalid_value" | "structure_error";
  message: string;
  dataIndex?: number;
  field?: string;
}

export interface ValidationWarning {
  type: "inconsistent_types" | "missing_optional" | "data_quality" | "performance";
  message: string;
  suggestion?: string;
}

export interface DataQualityMetrics {
  totalPoints: number;
  missingValues: number;
  duplicateKeys: number;
  dataTypes: {x: string[]; y: string[]};
  valueRanges: {x: [any, any]; y: [number, number]};
}

// Axis configuration
export interface AxisConfig {
  show?: boolean;
  title?: string;
  rotateLabels?: boolean;
  nice?: boolean;
  domain?: [number | null, number | null];
  format?: (value: any) => string;
  fontSize?: string;
  fontColor?: string;
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

export interface PointsConfig {
  show?: boolean;
  radius?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  fillOpacity?: number;
  strokeOpacity?: number;
}

export interface GridConfig {
  show?: boolean;
  horizontal?: boolean;
  vertical?: boolean;
  opacity?: number;
}

export interface LegendConfig {
  show?: boolean;
  position?: "top" | "bottom" | "left" | "right";
  spacing?: "normal" | "wide" | "compact";
  swatchSize?: "small" | "medium" | "large";
  fontSize?: "xs" | "sm" | "base";
}

export interface StylingConfig {
  colors?: string[] | "auto";
  theme?: "auto" | "light" | "dark";
  dimensions?: DimensionConfig;
  points?: PointsConfig;
  grid?: GridConfig;
  legend?: LegendConfig;
  labels?: LabelConfig;
}

// Interaction configuration
export interface TooltipConfig {
  enabled?: boolean;
  format?: "default" | "currency" | "percentage" | ((dataPoint: ChartDataPoint) => string);
  position?: "pointer" | "data"; // LayerChart only supports 'pointer' and 'data', not 'fixed'
  xOffset?: number;
  yOffset?: number;
  anchor?:
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";
  variant?: "default" | "invert" | "none";
  showTotal?: boolean; // For multi-series charts
  customContent?: (data: any, payload: any[]) => string; // Custom tooltip content
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

export interface HighlightConfig {
  enabled?: boolean;
  axis?: "x" | "y" | "both" | "none";
  showPoints?: boolean;
  showLines?: boolean;
  pointRadius?: number;
  lineStyle?: "solid" | "dashed" | "dotted";
  lineOpacity?: number;
}

export interface CrosshairConfig {
  enabled?: boolean;
  axis?: "x" | "y" | "both" | "none";
  style?: "solid" | "dashed" | "dotted";
  opacity?: number;
}

export interface ThresholdConfig {
  enabled?: boolean;
  value?: number;
  // Color configuration for areas above and below threshold
  aboveColor?: string;
  belowColor?: string;
  // Opacity configuration
  aboveOpacity?: number;
  belowOpacity?: number;
  // Optional gradient configuration
  useGradient?: boolean;
  // Optional line configuration for the threshold itself
  showLine?: boolean;
  lineColor?: string;
  lineStyle?: "solid" | "dashed" | "dotted";
  lineOpacity?: number;
  lineWidth?: number;
}

export interface InteractionConfig {
  tooltip?: TooltipConfig;
  highlight?: HighlightConfig;
  crosshair?: CrosshairConfig;
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
  placement?: "inside" | "outside" | "center";
  class?: string;
  offset?: {x?: number; y?: number};
}

export interface RuleConfig {
  show?: boolean;
  values?: number[];
  orientation?: "horizontal" | "vertical";
  class?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
}

export interface AnnotationConfig {
  type?: "labels" | "rules" | "both";
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
  allowPointsChange?: boolean;
  allowViewModeChange?: boolean;
  availableViewModes?: ("combined" | "side-by-side" | "stacked" | "overlaid")[];
  allowFontChange?: boolean;
  allowGridChange?: boolean;
  allowCrosshairChange?: boolean;
  allowHighlightChange?: boolean;
  allowLabelChange?: boolean;
  allowThresholdChange?: boolean;
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
  threshold?: ThresholdConfig;

  // Multi-series support
  yFields?: string[];
  yFieldLabels?: string[];
  colorField?: string;
  categoryField?: string;
  legendTitle?: string;

  // View mode support
  viewMode?: "combined" | "side-by-side" | "stacked" | "overlaid";
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
    title: "",
    rotateLabels: false,
    nice: false,
    domain: [null, null],
    format: (value: any) => String(value),
    fontSize: "0.75rem",
    fontColor: "hsl(var(--muted-foreground))",
  },
  y: {
    show: true,
    title: "",
    rotateLabels: false,
    nice: true,
    domain: [0, null],
    format: (value: any) => String(value),
    fontSize: "0.75rem",
    fontColor: "hsl(var(--muted-foreground))",
  },
  secondary: {
    show: false,
    title: "",
    rotateLabels: false,
    nice: true,
    domain: [null, null],
    format: (value: any) => String(value),
    fontSize: "0.75rem",
    fontColor: "hsl(var(--muted-foreground))",
  },
};

export const DEFAULT_STYLING_CONFIG: Required<StylingConfig> = {
  colors: "auto",
  theme: "auto",
  dimensions: {
    padding: {
      top: 20,
      right: 30,
      bottom: 80,
      left: 80,
    },
  },
  points: {
    show: false,
    radius: 6,
    fill: "auto",
    stroke: "auto",
    strokeWidth: 1,
    fillOpacity: 1.0,
    strokeOpacity: 1.0,
  },
  grid: {
    show: false,
    horizontal: true,
    vertical: false,
    opacity: 0.5,
  },
  legend: {
    show: false,
    position: "bottom",
    spacing: "normal",
    swatchSize: "medium",
    fontSize: "sm",
  },
  labels: {
    show: false,
    format: (datum: any) => {
      const value = typeof datum === "object" && datum !== null
        ? (datum.y ?? datum.value ?? datum.amount ?? 0)
        : datum;
      return String(Number(value) || 0);
    },
    placement: "outside",
    class: "text-xs fill-foreground",
    offset: {x: 0, y: 4},
  },
};

export const DEFAULT_INTERACTIONS_CONFIG: Required<InteractionConfig> = {
  tooltip: {
    enabled: true,
    format: "default",
    position: "pointer",
    xOffset: 10,
    yOffset: 10,
    anchor: "top-left",
    variant: "default",
    showTotal: false,
  },
  highlight: {
    enabled: true,
    axis: "both" as const,
    showPoints: true,
    showLines: true,
    pointRadius: 6,
    lineStyle: "solid" as const,
    lineOpacity: 1.0,
  },
  crosshair: {
    enabled: true,
    axis: "x" as const,
    style: "solid" as const,
    opacity: 0.7,
  },
  zoom: {
    enabled: false,
    resetButton: true,
  },
  pan: {
    enabled: false,
  },
  brush: {
    enabled: false,
  },
};

export const DEFAULT_TIME_FILTERING_CONFIG: Required<TimeFilteringConfig> = {
  enabled: false,
  field: "date",
  defaultPeriod: 0, // All time
  sourceData: [],
  sourceProcessor: (data) => data,
  sourceDateField: "date",
};

export const DEFAULT_THRESHOLD_CONFIG: Required<ThresholdConfig> = {
  enabled: true,
  value: 0, // Default threshold at zero (common for profit/loss, positive/negative)
  aboveColor: "hsl(142 71% 45%)", // Green for positive/above
  belowColor: "hsl(350 89% 60%)", // Red for negative/below
  aboveOpacity: 0.3,
  belowOpacity: 0.3,
  useGradient: true,
  showLine: true,
  lineColor: "hsl(var(--muted-foreground))",
  lineStyle: "dashed" as const,
  lineOpacity: 0.5,
  lineWidth: 1,
};

export const DEFAULT_CONTROLS_CONFIG: Required<ControlsConfig> = {
  show: false,
  availableTypes: ["bar", "line", "area"],
  allowTypeChange: true,
  allowPeriodChange: true,
  allowColorChange: false,
  allowCurveChange: false,
  allowPointsChange: false,
  allowViewModeChange: false,
  availableViewModes: ["combined", "side-by-side"],
  allowFontChange: false,
  allowGridChange: false,
  allowCrosshairChange: true,
  allowHighlightChange: false,
  allowLabelChange: false,
  allowThresholdChange: false,
};

export const DEFAULT_ANNOTATIONS_CONFIG: Required<AnnotationConfig> = {
  type: "labels",
  labels: {
    show: true,
    format: (datum: any) => {
      // Extract the numeric value from the data object
      const value =
        typeof datum === "object" && datum !== null
          ? (datum.y ?? datum.value ?? datum.amount ?? 0)
          : datum;
      return chartFormatters.currency(Number(value) || 0);
    },
    placement: "outside",
    class: "",
    offset: {x: 0, y: 4},
  },
  rules: {
    show: false,
    values: [],
    orientation: "horizontal",
    class: "stroke-muted-foreground/50",
    strokeWidth: 1,
    strokeDasharray: "2 2",
  },
};

// Configuration resolver utility type
export type ResolvedChartConfig = {
  axes: Required<AxesConfig>;
  styling: Required<StylingConfig>;
  interactions: Required<InteractionConfig>;
  timeFiltering: Required<TimeFilteringConfig>;
  controls: Required<ControlsConfig>;
  annotations: Required<AnnotationConfig>;
  threshold: Required<ThresholdConfig>;
};

// Smart defaults based on chart type
export const CHART_TYPE_DEFAULTS: Record<ChartType, Partial<UnifiedChartProps>> = {
  bar: {
    styling: {
      dimensions: {padding: {bottom: 80, left: 80}},
    },
  },
  line: {
    styling: {
      dimensions: {padding: {bottom: 60, left: 80}},
    },
  },
  area: {
    styling: {
      dimensions: {padding: {bottom: 60, left: 80}},
    },
  },
  spline: {
    styling: {
      dimensions: {padding: {bottom: 60, left: 80}},
    },
  },
  pie: {
    styling: {
      legend: {show: true, position: "right"},
      dimensions: {padding: {top: 60, right: 60, bottom: 60, left: 60}},
    },
    axes: {
      x: {show: false},
      y: {show: false},
    },
  },
  arc: {
    styling: {
      legend: {show: true, position: "right"},
      dimensions: {padding: {top: 60, right: 60, bottom: 60, left: 60}},
    },
    axes: {
      x: {show: false},
      y: {show: false},
    },
  },
  scatter: {
    styling: {
      dimensions: {padding: {bottom: 80, left: 80}},
    },
  },
  threshold: {
    styling: {
      dimensions: {padding: {bottom: 80, left: 80}},
    },
  },
  hull: {
    styling: {
      dimensions: {padding: {bottom: 80, left: 80}},
    },
  },
  calendar: {
    styling: {
      dimensions: {padding: {top: 20, right: 30, bottom: 40, left: 60}},
    },
    axes: {
      x: {show: false},
      y: {show: false},
    },
  },
};

// Common configuration presets for financial data
export const FINANCIAL_CHART_PRESETS = {
  balanceTrend: {
    type: "line" as ChartType,
    axes: {
      x: {title: "Date", rotateLabels: true},
      y: {title: "Balance ($)", nice: true},
    },
    styling: {
      colors: ["primary"],
      grid: {show: true, horizontal: true},
    },
    timeFiltering: {enabled: true, field: "date"},
    controls: {
      show: true,
      availableTypes: ["line", "area", "bar"],
      allowPeriodChange: true,
    },
  },

  incomeExpenses: {
    type: "bar" as ChartType,
    axes: {
      x: {title: "Month", rotateLabels: true},
      y: {title: "Amount ($)", nice: true},
    },
    styling: {
      colors: ["success", "destructive"],
      legend: {show: true, position: "top"},
    },
    timeFiltering: {enabled: true, field: "month"},
  },

  categoryBreakdown: {
    type: "pie" as ChartType,
    styling: {
      legend: {show: true, position: "right"},
    },
  },
} as const;
