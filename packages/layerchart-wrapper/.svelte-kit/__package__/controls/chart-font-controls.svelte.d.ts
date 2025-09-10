interface Props {
    axisFontSize: string;
    rotateXLabels: boolean;
    xAxisFormat?: string;
    yAxisFormat?: string;
    allowFontChange?: boolean;
}
declare const ChartFontControls: import("svelte").Component<Props, {}, "axisFontSize" | "rotateXLabels" | "xAxisFormat" | "yAxisFormat">;
type ChartFontControls = ReturnType<typeof ChartFontControls>;
export default ChartFontControls;
