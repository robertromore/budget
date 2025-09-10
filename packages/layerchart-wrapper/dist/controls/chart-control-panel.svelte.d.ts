import type { ChartType, ChartTypeOption } from '../config/chart-types';
import type { ViewModeOption } from './chart-view-mode-selector.svelte';
interface DataControlsProps {
    chartType: ChartType;
    availableChartTypes?: ChartTypeOption[];
    allowTypeChange?: boolean;
}
interface PeriodControlsProps {
    currentPeriod: string | number;
    periodData: Array<{
        key: string | number;
        label: string;
    }>;
    allowPeriodChange?: boolean;
    enablePeriodFiltering?: boolean;
    dateField?: string;
}
interface StyleControlsProps {
    selectedColorScheme: string;
    allowColorChange?: boolean;
    selectedCurve: string;
    allowCurveChange?: boolean;
    showPoints: boolean;
    allowPointsChange?: boolean;
    pointRadius?: number;
    pointStrokeWidth?: number;
    pointFillOpacity?: number;
    pointStrokeOpacity?: number;
    selectedViewMode: ViewModeOption;
    availableViewModes?: ViewModeOption[];
    allowViewModeChange?: boolean;
}
interface FontControlsProps {
    axisFontSize?: string;
    rotateXLabels?: boolean;
    xAxisFormat?: string;
    yAxisFormat?: string;
    allowFontChange?: boolean;
}
interface GridControlsProps {
    showGrid?: boolean;
    showHorizontal?: boolean;
    showVertical?: boolean;
    gridOpacity?: number;
    allowGridChange?: boolean;
    calculatedGridOpacity?: number;
}
interface CrosshairControlsProps {
    showCrosshair?: boolean;
    crosshairAxis?: 'x' | 'y' | 'both' | 'none';
    crosshairStyle?: 'solid' | 'dashed' | 'dotted';
    crosshairOpacity?: number;
    allowCrosshairChange?: boolean;
    calculatedOpacity?: number;
}
interface HighlightControlsProps {
    showHighlightPoints?: boolean;
    highlightPointRadius?: number;
    allowHighlightChange?: boolean;
}
interface LabelControlsProps {
    showLabels?: boolean;
    labelPlacement?: 'inside' | 'outside' | 'center';
    labelOffset?: number;
    labelFormat?: string;
    allowLabelChange?: boolean;
}
interface ThresholdControlsProps {
    thresholdEnabled?: boolean;
    thresholdValue?: number;
    thresholdAboveColor?: string;
    thresholdBelowColor?: string;
    thresholdAboveOpacity?: number;
    thresholdBelowOpacity?: number;
    thresholdShowLine?: boolean;
    thresholdLineOpacity?: number;
    allowThresholdChange?: boolean;
}
interface Props extends DataControlsProps, PeriodControlsProps, StyleControlsProps, FontControlsProps, GridControlsProps, CrosshairControlsProps, HighlightControlsProps, LabelControlsProps, ThresholdControlsProps {
}
declare const ChartControlPanel: import("svelte").Component<Props, {}, "showCrosshair" | "crosshairAxis" | "crosshairStyle" | "crosshairOpacity" | "chartType" | "axisFontSize" | "rotateXLabels" | "xAxisFormat" | "yAxisFormat" | "showGrid" | "showHorizontal" | "showVertical" | "gridOpacity" | "showHighlightPoints" | "highlightPointRadius" | "showLabels" | "labelPlacement" | "labelOffset" | "labelFormat" | "currentPeriod" | "showPoints" | "pointRadius" | "pointStrokeWidth" | "pointFillOpacity" | "pointStrokeOpacity" | "selectedColorScheme" | "selectedCurve" | "selectedViewMode" | "thresholdEnabled" | "thresholdValue" | "thresholdAboveColor" | "thresholdBelowColor" | "thresholdAboveOpacity" | "thresholdBelowOpacity" | "thresholdShowLine" | "thresholdLineOpacity">;
type ChartControlPanel = ReturnType<typeof ChartControlPanel>;
export default ChartControlPanel;
