interface ThresholdControlsProps {
    enabled: boolean;
    value: number;
    aboveColor?: string;
    belowColor?: string;
    aboveOpacity?: number;
    belowOpacity?: number;
    showLine?: boolean;
    lineOpacity?: number;
}
declare const ChartThresholdControls: import("svelte").Component<ThresholdControlsProps, {}, "enabled" | "value" | "aboveColor" | "belowColor" | "aboveOpacity" | "belowOpacity" | "showLine" | "lineOpacity">;
type ChartThresholdControls = ReturnType<typeof ChartThresholdControls>;
export default ChartThresholdControls;
