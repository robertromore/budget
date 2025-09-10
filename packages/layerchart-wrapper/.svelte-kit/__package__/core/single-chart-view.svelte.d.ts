import type { ResolvedChartConfig } from '../config/chart-config';
import type { ChartType } from '../config/chart-types';
interface SingleChartViewProps {
    data: any[];
    chartType: ChartType;
    config: ResolvedChartConfig & {
        type: ChartType;
        data: any[];
        resolvedColors: string[];
    };
    bandScale?: any;
    dataAccessors: any;
    effectiveColors: string[];
    isChartCircular: boolean;
    isChartHierarchical: boolean;
    currentColorScheme: string;
    accessibleCrosshairOpacity: number;
    viewModeLabel?: string;
    colors: string[];
    xAxisTicks?: any[];
}
declare const SingleChartView: import("svelte").Component<SingleChartViewProps, {}, "">;
type SingleChartView = ReturnType<typeof SingleChartView>;
export default SingleChartView;
