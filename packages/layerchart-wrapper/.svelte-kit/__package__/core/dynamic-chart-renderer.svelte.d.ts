import type { ChartType } from '../config/chart-types';
interface DynamicChartRendererProps {
    chartType: ChartType;
    data: any[];
    config?: Record<string, any>;
    seriesData?: any[];
    seriesColors?: string[];
    isMultiSeries: boolean;
    class?: string;
    threshold?: {
        enabled?: boolean;
        value?: number;
        aboveColor?: string;
        belowColor?: string;
        aboveOpacity?: number;
        belowOpacity?: number;
        showLine?: boolean;
        lineColor?: string;
        lineStyle?: 'solid' | 'dashed' | 'dotted';
        lineOpacity?: number;
        lineWidth?: number;
    };
}
declare const DynamicChartRenderer: import("svelte").Component<DynamicChartRendererProps, {}, "">;
type DynamicChartRenderer = ReturnType<typeof DynamicChartRenderer>;
export default DynamicChartRenderer;
