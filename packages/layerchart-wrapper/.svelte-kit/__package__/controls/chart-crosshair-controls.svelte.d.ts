interface Props {
    showCrosshair: boolean;
    crosshairAxis: 'x' | 'y' | 'both' | 'none';
    crosshairStyle: 'solid' | 'dashed' | 'dotted';
    crosshairOpacity: number;
    allowCrosshairChange?: boolean;
    calculatedOpacity?: number;
}
declare const ChartCrosshairControls: import("svelte").Component<Props, {}, "showCrosshair" | "crosshairAxis" | "crosshairStyle" | "crosshairOpacity">;
type ChartCrosshairControls = ReturnType<typeof ChartCrosshairControls>;
export default ChartCrosshairControls;
