import type { ChartType, ChartTypeOption } from '../config/chart-types';
interface Props {
    chartType?: ChartType;
    availableChartTypes?: ChartTypeOption[];
}
declare const ChartTypeSelector: import("svelte").Component<Props, {}, "chartType">;
type ChartTypeSelector = ReturnType<typeof ChartTypeSelector>;
export default ChartTypeSelector;
