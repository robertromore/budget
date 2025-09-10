import type { ResolvedChartConfig } from '../config/chart-config';
import type { ChartType } from '../config/chart-types';
import type { ChartDataProcessor, ViewModeData } from '../processors/chart-data-processor.svelte';
interface SideBySideChartViewProps {
    processor: ChartDataProcessor;
    chartType: ChartType;
    config: ResolvedChartConfig & {
        type: ChartType;
        data: any[];
        resolvedColors: string[];
    };
    viewModeData: ViewModeData;
    yFieldLabels?: string[] | undefined;
    className?: string;
    currentColorScheme: string;
    accessibleCrosshairOpacity: number;
}
declare const SideBySideChartView: import("svelte").Component<SideBySideChartViewProps, {}, "">;
type SideBySideChartView = ReturnType<typeof SideBySideChartView>;
export default SideBySideChartView;
