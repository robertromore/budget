import type { ChartProps } from '../config/chart-config';
interface ChartCoreV2Props extends ChartProps {
    data: any[];
    chartType: string;
    seriesData?: any[];
    seriesColors?: string[];
    isMultiSeries?: boolean;
    config: any;
    class?: string;
}
declare const ChartCoreV2: import("svelte").Component<ChartCoreV2Props, {}, "">;
type ChartCoreV2 = ReturnType<typeof ChartCoreV2>;
export default ChartCoreV2;
