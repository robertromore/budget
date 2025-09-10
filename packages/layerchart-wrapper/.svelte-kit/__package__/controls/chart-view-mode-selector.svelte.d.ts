export type ViewModeOption = 'combined' | 'side-by-side' | 'stacked' | 'overlaid';
interface Props {
    viewMode: ViewModeOption;
    availableViewModes?: ViewModeOption[];
    showDescription?: boolean;
}
declare const ChartViewModeSelector: import("svelte").Component<Props, {}, "viewMode">;
type ChartViewModeSelector = ReturnType<typeof ChartViewModeSelector>;
export default ChartViewModeSelector;
