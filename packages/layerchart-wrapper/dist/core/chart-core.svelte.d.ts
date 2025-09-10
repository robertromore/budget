import type { ResolvedChartConfig } from '../config/chart-config';
import type { ChartType } from '../config/chart-types';
import type { ChartDataProcessor } from '../processors/chart-data-processor.svelte';
interface ChartCoreProps {
    processor: ChartDataProcessor;
    chartType: ChartType;
    config: ResolvedChartConfig & {
        type: ChartType;
        data: any[];
        resolvedColors: string[];
    };
    viewMode?: 'combined' | 'side-by-side' | 'stacked' | 'overlaid';
    viewModeData?: {
        income?: any[];
        expenses?: any[];
        combined?: any[];
    };
    selectedCurve?: string;
    legendTitle?: string;
    yFieldLabels?: string[];
    showCrosshair?: boolean;
    crosshairAxis?: 'x' | 'y' | 'both' | 'none';
    crosshairStyle?: 'solid' | 'dashed' | 'dotted';
    crosshairOpacity?: number;
    showHighlightPoints?: boolean;
    highlightPointRadius?: number;
    class?: string;
}
declare const ChartCore: import("svelte").Component<ChartCoreProps, {}, "">;
type ChartCore = ReturnType<typeof ChartCore>;
export default ChartCore;
