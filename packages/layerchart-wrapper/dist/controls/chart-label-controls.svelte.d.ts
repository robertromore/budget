interface Props {
    showLabels: boolean;
    labelPlacement: 'inside' | 'outside' | 'center';
    labelOffset?: number;
    labelFormat?: string;
    allowLabelChange: boolean;
}
declare const ChartLabelControls: import("svelte").Component<Props, {}, "showLabels" | "labelPlacement" | "labelOffset" | "labelFormat">;
type ChartLabelControls = ReturnType<typeof ChartLabelControls>;
export default ChartLabelControls;
