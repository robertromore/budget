/**
 * Generic chart data transformation utilities
 * These functions are reusable across any application domain
 */
/**
 * Generic chart data point interface
 */
export interface ChartDataPoint {
    x?: any;
    y?: any;
    name?: string;
    value?: number;
    color?: string;
    [key: string]: any;
}
/**
 * Generic data transformer with flexible mapping
 */
export declare function transformData<T extends Record<string, any>>(data: T[], mapping: {
    x: keyof T | ((item: T) => any);
    y: keyof T | ((item: T) => number);
    category?: keyof T | ((item: T) => string);
    series?: keyof T | ((item: T) => string);
    metadata?: (item: T, index: number) => any;
}): ChartDataPoint[];
/**
 * Groups data points by a specified field
 */
export declare function groupDataBy<T extends ChartDataPoint>(data: T[], groupField: 'x' | 'category' | 'series', aggregation?: 'sum' | 'average' | 'count' | 'min' | 'max'): ChartDataPoint[];
/**
 * Sorts data points by a specified field
 */
export declare function sortData(data: ChartDataPoint[], field?: 'x' | 'y' | 'category' | 'series', order?: 'asc' | 'desc'): ChartDataPoint[];
/**
 * Filters data points by value range
 */
export declare function filterByRange(data: ChartDataPoint[], field: 'x' | 'y', min?: number | Date, max?: number | Date): ChartDataPoint[];
/**
 * Calculates moving average for time series data
 */
export declare function calculateMovingAverage(data: ChartDataPoint[], windowSize?: number): ChartDataPoint[];
/**
 * Normalizes data to percentage (0-100)
 */
export declare function normalizeToPercentage(data: ChartDataPoint[], groupBy?: 'x' | 'category' | 'series'): ChartDataPoint[];
/**
 * Fills gaps in time series data
 */
export declare function fillTimeSeriesGaps(data: ChartDataPoint[], interval: 'day' | 'week' | 'month', fillValue?: number | 'interpolate' | 'previous'): ChartDataPoint[];
/**
 * Stacks data for stacked charts
 */
export declare function stackData(data: ChartDataPoint[], stackBy?: 'category' | 'series'): ChartDataPoint[];
/**
 * Aggregates large datasets for better performance
 * Reduces the number of data points while preserving trends
 */
export declare function aggregateForPerformance(data: ChartDataPoint[], maxPoints?: number): ChartDataPoint[];
//# sourceMappingURL=chart-data.d.ts.map