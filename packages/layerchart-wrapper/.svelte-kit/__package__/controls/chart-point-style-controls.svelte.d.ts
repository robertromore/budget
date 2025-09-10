interface Props {
    showPoints: boolean;
    pointRadius: number;
    pointStrokeWidth: number;
    pointFillOpacity: number;
    pointStrokeOpacity: number;
    chartType: string;
}
declare const ChartPointStyleControls: import("svelte").Component<Props, {}, "showPoints" | "pointRadius" | "pointStrokeWidth" | "pointFillOpacity" | "pointStrokeOpacity">;
type ChartPointStyleControls = ReturnType<typeof ChartPointStyleControls>;
export default ChartPointStyleControls;
