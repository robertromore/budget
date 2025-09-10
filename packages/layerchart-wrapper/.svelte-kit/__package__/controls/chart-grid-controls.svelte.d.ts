interface Props {
    showGrid: boolean;
    showHorizontal: boolean;
    showVertical: boolean;
    gridOpacity: number;
    allowGridChange?: boolean;
    calculatedGridOpacity?: number;
}
declare const ChartGridControls: import("svelte").Component<Props, {}, "showGrid" | "showHorizontal" | "showVertical" | "gridOpacity">;
type ChartGridControls = ReturnType<typeof ChartGridControls>;
export default ChartGridControls;
