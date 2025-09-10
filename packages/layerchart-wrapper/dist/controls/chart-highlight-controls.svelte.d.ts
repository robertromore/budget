interface Props {
    showHighlightPoints: boolean;
    highlightPointRadius: number;
    allowHighlightChange?: boolean;
}
declare const ChartHighlightControls: import("svelte").Component<Props, {}, "showHighlightPoints" | "highlightPointRadius">;
type ChartHighlightControls = ReturnType<typeof ChartHighlightControls>;
export default ChartHighlightControls;
