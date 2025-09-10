import type { DateValue } from "@internationalized/date";
import type { ChartType } from "./chart-types";
export interface ChartDataPoint {
    x: string | number | Date | DateValue;
    y: number;
    category?: string | undefined;
    series?: string | undefined;
    key?: string | undefined;
    metadata?: Record<string, any>;
}
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
    dataTypes: {
        x: string[];
        y: string[];
    };
    valueRanges: {
        x: [any, any];
        y: [number, number];
    };
}
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
export interface TooltipConfig {
    enabled?: boolean;
    format?: "default" | "currency" | "percentage" | ((dataPoint: ChartDataPoint) => string);
    position?: "pointer" | "data";
    xOffset?: number;
    yOffset?: number;
    anchor?: "top" | "bottom" | "left" | "right" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
    variant?: "default" | "invert" | "none";
    showTotal?: boolean;
    customContent?: (data: any, payload: any[]) => string;
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
    aboveColor?: string;
    belowColor?: string;
    aboveOpacity?: number;
    belowOpacity?: number;
    useGradient?: boolean;
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
export interface TimeFilteringConfig {
    enabled?: boolean;
    field?: string;
    defaultPeriod?: string | number;
    sourceData?: any[];
    sourceProcessor?: (sourceData: any[]) => ChartDataPoint[];
    sourceDateField?: string;
}
export interface LabelConfig {
    show?: boolean;
    format?: (datum: any) => string;
    placement?: "inside" | "outside" | "center";
    class?: string;
    offset?: {
        x?: number;
        y?: number;
    };
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
export interface UnifiedChartProps {
    data: ChartDataPoint[];
    type?: ChartType;
    axes?: AxesConfig;
    styling?: StylingConfig;
    interactions?: InteractionConfig;
    timeFiltering?: TimeFilteringConfig;
    controls?: ControlsConfig;
    annotations?: AnnotationConfig;
    threshold?: ThresholdConfig;
    yFields?: string[];
    yFieldLabels?: string[];
    colorField?: string;
    categoryField?: string;
    legendTitle?: string;
    viewMode?: "combined" | "side-by-side" | "stacked" | "overlaid";
    viewModeData?: {
        combined?: ChartDataPoint[];
        income?: ChartDataPoint[];
        expenses?: ChartDataPoint[];
        [key: string]: ChartDataPoint[] | undefined;
    };
    suppressDuplicateWarnings?: boolean;
    class?: string;
}
export declare const DEFAULT_AXES_CONFIG: Required<AxesConfig>;
export declare const DEFAULT_STYLING_CONFIG: Required<StylingConfig>;
export declare const DEFAULT_INTERACTIONS_CONFIG: Required<InteractionConfig>;
export declare const DEFAULT_TIME_FILTERING_CONFIG: Required<TimeFilteringConfig>;
export declare const DEFAULT_THRESHOLD_CONFIG: Required<ThresholdConfig>;
export declare const DEFAULT_CONTROLS_CONFIG: Required<ControlsConfig>;
export declare const DEFAULT_ANNOTATIONS_CONFIG: Required<AnnotationConfig>;
export type ResolvedChartConfig = {
    axes: Required<AxesConfig>;
    styling: Required<StylingConfig>;
    interactions: Required<InteractionConfig>;
    timeFiltering: Required<TimeFilteringConfig>;
    controls: Required<ControlsConfig>;
    annotations: Required<AnnotationConfig>;
    threshold: Required<ThresholdConfig>;
};
export declare const CHART_TYPE_DEFAULTS: Record<ChartType, Partial<UnifiedChartProps>>;
export declare const FINANCIAL_CHART_PRESETS: {
    readonly balanceTrend: {
        readonly type: ChartType;
        readonly axes: {
            readonly x: {
                readonly title: "Date";
                readonly rotateLabels: true;
            };
            readonly y: {
                readonly title: "Balance ($)";
                readonly nice: true;
            };
        };
        readonly styling: {
            readonly colors: readonly ["primary"];
            readonly grid: {
                readonly show: true;
                readonly horizontal: true;
            };
        };
        readonly timeFiltering: {
            readonly enabled: true;
            readonly field: "date";
        };
        readonly controls: {
            readonly show: true;
            readonly availableTypes: readonly ["line", "area", "bar"];
            readonly allowPeriodChange: true;
        };
    };
    readonly incomeExpenses: {
        readonly type: ChartType;
        readonly axes: {
            readonly x: {
                readonly title: "Month";
                readonly rotateLabels: true;
            };
            readonly y: {
                readonly title: "Amount ($)";
                readonly nice: true;
            };
        };
        readonly styling: {
            readonly colors: readonly ["success", "destructive"];
            readonly legend: {
                readonly show: true;
                readonly position: "top";
            };
        };
        readonly timeFiltering: {
            readonly enabled: true;
            readonly field: "month";
        };
    };
    readonly categoryBreakdown: {
        readonly type: ChartType;
        readonly styling: {
            readonly legend: {
                readonly show: true;
                readonly position: "right";
            };
        };
    };
};
