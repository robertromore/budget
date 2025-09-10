/**
 * Chart types supported by the system
 */
export type ChartType = 'line' | 'area' | 'bar' | 'pie' | 'arc' | 'spline' | 'calendar' | 'scatter' | 'threshold' | 'hull';
/**
 * Transform data for specific chart types that need special formatting
 */
export declare function transformDataForChartType(data: any[], chartType: ChartType, options?: {
    categoryField?: string;
    valueField?: string;
    seriesField?: string;
    dateField?: string;
    hierarchyField?: string;
    colors?: string[];
}): any;
/**
 * Transform data for stacked charts (barstack, areastack)
 * @future Will be implemented when LayerChart supports stacked charts
 */
/**
 * Transform data for geographic charts
 * @future Will be implemented when LayerChart supports geo charts
 */
/**
 * Get the appropriate data accessor for a chart type
 */
export declare function getDataAccessorsForChartType(chartType: ChartType): {
    x: string;
    c: string;
    y?: undefined;
} | {
    x: string;
    y: string;
    c?: undefined;
};
/**
 * Determine if a chart type supports multi-series rendering
 */
export declare function supportsMultiSeries(chartType: ChartType): boolean;
/**
 * Determine if a chart type is circular/radial
 */
export declare function isCircularChart(chartType: ChartType): boolean;
/**
 * Determine if a chart type requires hierarchical data
 */
export declare function requiresHierarchicalData(chartType: ChartType): boolean;
/**
 * Get recommended chart types based on data characteristics
 */
export declare function recommendChartTypes(data: any[]): ChartType[];
//# sourceMappingURL=chart-transformers.d.ts.map