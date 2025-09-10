/**
 * Configuration resolver for the unified chart system
 * Merges user configuration with smart defaults
 */
import type { UnifiedChartProps, ResolvedChartConfig, ChartDataPoint, ChartDataValidation } from './chart-config';
import type { ChartType } from './chart-types';
/**
 * Resolves the complete chart configuration
 */
export declare function resolveChartConfig(props: UnifiedChartProps): ResolvedChartConfig & {
    type: ChartType;
    data: ChartDataPoint[];
    resolvedColors: string[];
};
/**
 * Enhanced chart data validation with comprehensive quality metrics
 */
export declare function validateChartData(data: ChartDataPoint[], options?: {
    suppressDuplicateWarnings?: boolean;
}): ChartDataValidation;
/**
 * Transforms raw data into standardized ChartDataPoint format
 */
export declare function standardizeChartData(rawData: any[], mapping: {
    x: string;
    y: string;
    category?: string;
}): ChartDataPoint[];
/**
 * Configuration helpers for common use cases
 */
export declare const configHelpers: {
    /**
     * Creates configuration for financial balance trends
     */
    balanceTrend: (overrides?: Partial<UnifiedChartProps>) => UnifiedChartProps;
    /**
     * Creates configuration for income vs expenses comparison
     */
    incomeExpenses: (overrides?: Partial<UnifiedChartProps>) => UnifiedChartProps;
    /**
     * Creates configuration for category breakdown pie chart
     */
    categoryBreakdown: (overrides?: Partial<UnifiedChartProps>) => UnifiedChartProps;
};
