import { getDataAccessorsForChartType } from "@budget-shared/utils";
import type { ChartDataPoint, DataQualityMetrics, ResolvedChartConfig } from "../config/chart-config";
import type { ChartType } from "../config/chart-types";
/**
 * View mode data structure for side-by-side or stacked views
 */
export interface ViewModeData {
    combined?: ChartDataPoint[];
    income?: ChartDataPoint[];
    expenses?: ChartDataPoint[];
    [key: string]: ChartDataPoint[] | undefined;
}
/**
 * Chart data processor interface with all computed values
 */
export interface ChartDataProcessor {
    chartData: ChartDataPoint[];
    filteredData: ChartDataPoint[];
    isMultiSeries: boolean;
    seriesList: string[];
    legendItems: string[];
    seriesData: ChartDataPoint[][];
    bandScale: any | undefined;
    incomeBandScale: any | undefined;
    expensesBandScale: any | undefined;
    effectiveColors: string[];
    availablePeriods: Array<{
        value: string | number;
        label: string;
    }>;
    isChartCircular: boolean;
    isChartHierarchical: boolean;
    chartSupportsMultiSeries: boolean;
    dataAccessors: ReturnType<typeof getDataAccessorsForChartType>;
    dataQuality: DataQualityMetrics;
}
/**
 * Configuration for the chart data processor
 */
export interface ProcessorConfig {
    data: ChartDataPoint[];
    config: ResolvedChartConfig;
    chartType: ChartType;
    currentPeriod: string | number;
    viewMode: string;
    viewModeData?: ViewModeData;
    yFields?: string[];
    yFieldLabels?: string[];
    categoryField?: string;
    enableColorScheme?: boolean;
    selectedColorScheme?: string;
}
/**
 * Creates a reactive chart data processor with Svelte 5 patterns
 * All computations are optimized with proper dependency tracking
 */
export declare function createChartDataProcessor(props: ProcessorConfig): ChartDataProcessor;
/**
 * Creates a reactive chart data processor with automatic updates
 * This version uses Svelte 5's $derived for reactive computations
 */
export declare function createReactiveChartDataProcessor(getProps: () => ProcessorConfig): () => ChartDataProcessor;
