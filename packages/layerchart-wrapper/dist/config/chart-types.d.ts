export type ChartType = "bar" | "area" | "line" | "scatter" | "pie" | "arc" | "threshold" | "calendar" | "hull" | "spline";
export interface ChartSeries {
    data: any[];
    type: ChartType;
    color?: string;
    colorIndex?: number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    fillOpacity?: number;
    label?: string;
    r?: number | ((d: any) => number);
    innerRadius?: number;
    outerRadius?: number;
    startAngle?: number;
    endAngle?: number;
    threshold?: number;
    value?: string | ((d: any) => number);
    children?: string;
    source?: any;
    target?: any;
    keys?: string[];
    projection?: any;
}
export interface ChartTypeOption {
    value: ChartType;
    label: string;
    icon: any;
    description: string;
}
export interface ChartTypeGroup {
    label: string;
    options: ChartTypeOption[];
}
export declare const ALL_CHART_TYPES: ChartTypeGroup[];
