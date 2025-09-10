interface ChartLegendProps {
    show: boolean;
    title?: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
    items: string[];
    colors: string[];
    spacing?: 'normal' | 'wide' | 'compact';
    variant?: 'swatches' | 'ramp';
    swatchSize?: 'small' | 'medium' | 'large';
    fontSize?: 'xs' | 'sm' | 'base';
    onItemClick?: (item: string, index: number) => void;
    onItemHover?: (item: string, index: number) => void;
    onItemLeave?: (item: string, index: number) => void;
    class?: string;
    itemClass?: string;
    swatchClass?: string;
}
declare const ChartLegend: import("svelte").Component<ChartLegendProps, {}, "">;
type ChartLegend = ReturnType<typeof ChartLegend>;
export default ChartLegend;
