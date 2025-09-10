/**
 * Chart Data Processor Module
 * Phase 1 Refactoring: Centralized data processing logic for UnifiedChart
 *
 * This module extracts all $derived computations from unified-chart.svelte
 * to provide a clean, performant API for chart data transformation.
 */

import {getSchemeColors} from "$lib/utils/chart-colors";
import {aggregateForPerformance} from "$lib/utils/chart-data";
import {filterDataByPeriod, generatePeriodOptions} from "$lib/utils/chart-periods";
import {
  getDataAccessorsForChartType,
  isCircularChart,
  requiresHierarchicalData,
  supportsMultiSeries,
  transformDataForChartType,
} from "$lib/utils/chart-transformers";
import {colorUtils} from "$lib/utils/colors";
import {scaleBand} from "d3-scale";
import type {ChartDataPoint, DataQualityMetrics, ResolvedChartConfig} from "../config/chart-config";
import type {ChartType} from "../config/chart-types";

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
  // Core processed data
  chartData: ChartDataPoint[];
  filteredData: ChartDataPoint[];

  // Series information
  isMultiSeries: boolean;
  seriesList: string[];
  legendItems: string[];
  seriesData: ChartDataPoint[][];

  // Band scales for bar charts
  bandScale: any | undefined;
  incomeBandScale: any | undefined;
  expensesBandScale: any | undefined;

  // Color management
  effectiveColors: string[];

  // Period filtering
  availablePeriods: Array<{value: string | number; label: string}>;

  // Chart characteristics
  isChartCircular: boolean;
  isChartHierarchical: boolean;
  chartSupportsMultiSeries: boolean;

  // Data accessors
  dataAccessors: ReturnType<typeof getDataAccessorsForChartType>;

  // Performance metrics
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
export function createChartDataProcessor(props: ProcessorConfig): ChartDataProcessor {
  const {
    data,
    config,
    chartType,
    currentPeriod,
    viewMode,
    viewModeData,
    yFields,
    yFieldLabels,
    categoryField,
    enableColorScheme = false,
    selectedColorScheme = "default",
  } = props;

  // Chart characteristics using utilities
  const isChartCircular = isCircularChart(chartType);
  const isChartHierarchical = requiresHierarchicalData(chartType);
  const chartSupportsMultiSeries = supportsMultiSeries(chartType);

  // Get data accessors for the current chart type
  const dataAccessors = getDataAccessorsForChartType(chartType);

  // Select data based on view mode
  const selectedData = (() => {
    if (!viewModeData || viewMode === "combined") {
      return data;
    }
    // For side-by-side mode, return combined data for now
    return viewModeData.combined || data;
  })();

  // Filter data based on current period
  const filteredData = (() => {
    const dataToFilter = selectedData;
    if (!config.timeFiltering.enabled) return dataToFilter;

    // Only use transaction-based filtering for radial charts (pie/arc)
    const hasSourceData =
      config.timeFiltering.sourceData &&
      config.timeFiltering.sourceData.length > 0 &&
      config.timeFiltering.sourceProcessor;

    if (isChartCircular && hasSourceData) {
      // Filter source data first, then process (for radial charts only)
      const filteredSourceData =
        currentPeriod === 0 || currentPeriod === "0"
          ? config.timeFiltering.sourceData
          : filterDataByPeriod(
              config.timeFiltering.sourceData,
              config.timeFiltering.sourceDateField,
              currentPeriod
            );

      // Process filtered source data into chart data
      return config.timeFiltering.sourceProcessor(filteredSourceData);
    }

    // Default: filter chart data directly (for all linear charts: bar, line, area, etc.)
    return filterDataByPeriod(
      dataToFilter,
      config.timeFiltering.field,
      currentPeriod
    ) as ChartDataPoint[];
  })();

  // Prepare chart data for LayerChart with performance optimization and transformation
  const chartData = (() => {
    // Ensure we have valid data before processing
    if (!filteredData || filteredData.length === 0) {
      return [];
    }

    // Performance optimization: aggregate large datasets
    const dataToProcess =
      filteredData.length > 500 ? aggregateForPerformance(filteredData, 500) : filteredData;

    // Transform data based on chart type requirements
    const transformOptions: any = {
      categoryField: categoryField || "category",
      valueField: "y",
      seriesField: "series",
    };

    // Only add colors if they're not 'auto'
    if (config.styling.colors !== "auto") {
      transformOptions.colors = config.styling.colors as string[];
    }

    const transformed = transformDataForChartType(dataToProcess, chartType, transformOptions);

    // Special handling for bar charts with Date x-axis values
    if (chartType === "bar" && dataToProcess.length > 0 && !isChartCircular) {
      const firstItem = dataToProcess[0];
      const shouldConvertToCategories =
        firstItem &&
        firstItem.x instanceof Date &&
        dataToProcess.length <= 12 && // Only for small datasets
        !(
          chartSupportsMultiSeries &&
          yFields &&
          yFields.length > 1 &&
          filteredData.some((item) => item.series || item.category)
        );

      if (shouldConvertToCategories) {
        return dataToProcess.map((item) => ({
          ...item,
          x:
            item.x instanceof Date
              ? item.x.toLocaleDateString("en-US", {month: "short", year: "numeric"})
              : String(item.x),
        }));
      }
    }

    return Array.isArray(transformed) ? transformed : [transformed];
  })();

  // Detect if this is multi-series data
  const isMultiSeries =
    chartSupportsMultiSeries &&
    Boolean(
      yFields && yFields.length > 1 && filteredData.some((item) => item.series || item.category)
    );

  // Get unique series for multi-series charts
  const seriesList = (() => {
    if (!isMultiSeries) return [];

    const uniqueSeries = new Set<string>();
    chartData.forEach((item) => {
      if (item.series) uniqueSeries.add(item.series);
      else if (item.category) uniqueSeries.add(item.category);
    });

    return Array.from(uniqueSeries);
  })();

  // Use yFieldLabels if provided, otherwise use series list
  const legendItems = yFieldLabels && yFieldLabels.length > 0 ? yFieldLabels : seriesList;

  // Prepare series data for multi-series charts
  const seriesData = (() => {
    if (!isMultiSeries) return [];

    return seriesList.map((series) =>
      chartData.filter((d) => d.series === series || d.category === series)
    );
  })();

  // Create band scale for bar charts with string x values
  const bandScale = (() => {
    if (chartType === "bar" && chartData.length > 0 && !isChartCircular) {
      const scale = scaleBand()
        .domain(chartData.map((d) => String(d.x)))
        .range([0, 1]) // LayerChart expects normalized range
        .paddingInner(0.1)
        .paddingOuter(0.05);
      return scale;
    }
    return undefined;
  })();

  // Create band scales for side-by-side income and expenses charts
  const incomeBandScale = (() => {
    if (
      chartType === "bar" &&
      viewModeData?.income &&
      viewModeData.income.length > 0 &&
      !isChartCircular
    ) {
      const scale = scaleBand()
        .domain(viewModeData.income.map((d) => String(d.x)))
        .range([0, 1])
        .paddingInner(0.1)
        .paddingOuter(0.05);
      return scale;
    }
    return undefined;
  })();

  const expensesBandScale = (() => {
    if (
      chartType === "bar" &&
      viewModeData?.expenses &&
      viewModeData.expenses.length > 0 &&
      !isChartCircular
    ) {
      const scale = scaleBand()
        .domain(viewModeData.expenses.map((d) => String(d.x)))
        .range([0, 1])
        .paddingInner(0.1)
        .paddingOuter(0.05);
      return scale;
    }
    return undefined;
  })();

  // Resolve effective colors based on color scheme selection
  const effectiveColors = (() => {
    if (enableColorScheme) {
      return getSchemeColors(selectedColorScheme);
    }

    // Use resolved colors from config
    if (config.styling.colors === "auto") {
      // Generate default color palette
      return Array.from({length: 8}, (_, i) => colorUtils.getChartColor(i));
    }

    return config.styling.colors as string[];
  })();

  // Generate period options for time filtering
  const availablePeriods = (() => {
    if (!config.timeFiltering.enabled) return [];

    // Only use transaction-based filtering for radial charts (pie/arc) that need it
    const hasSourceData =
      config.timeFiltering.sourceData && config.timeFiltering.sourceData.length > 0;

    if (isChartCircular && hasSourceData) {
      const options = generatePeriodOptions(
        config.timeFiltering.sourceData,
        config.timeFiltering.sourceDateField
      );
      // Map Option[] to { value: string | number; label: string }[]
      return options.map((opt) => ({
        value: opt.key,
        label: opt.label,
      }));
    }

    // Default: use chart data for all other charts
    const options = generatePeriodOptions(data, config.timeFiltering.field);
    // Map Option[] to { value: string | number; label: string }[]
    return options.map((opt) => ({
      value: opt.key,
      label: opt.label,
    }));
  })();

  // Calculate data quality metrics
  const dataQuality: DataQualityMetrics = {
    totalPoints: chartData.length,
    missingValues: chartData.filter((d) => d.y === null || d.y === undefined).length,
    duplicateKeys: 0, // Would need more complex logic to detect duplicates
    dataTypes: {
      x: [...new Set(chartData.map((d) => typeof d.x))],
      y: [...new Set(chartData.map((d) => typeof d.y))],
    },
    valueRanges: {
      x: chartData.length > 0 ? [chartData[0].x, chartData[chartData.length - 1].x] : [null, null],
      y:
        chartData.length > 0
          ? [Math.min(...chartData.map((d) => d.y)), Math.max(...chartData.map((d) => d.y))]
          : [0, 0],
    },
  };

  return {
    // Core data
    chartData,
    filteredData,

    // Series information
    isMultiSeries,
    seriesList,
    legendItems,
    seriesData,

    // Scales
    bandScale,
    incomeBandScale,
    expensesBandScale,

    // Colors
    effectiveColors,

    // Period filtering
    availablePeriods,

    // Chart characteristics
    isChartCircular,
    isChartHierarchical,
    chartSupportsMultiSeries,

    // Data accessors
    dataAccessors,

    // Quality metrics
    dataQuality,
  };
}

/**
 * Creates a reactive chart data processor with automatic updates
 * This version uses Svelte 5's $derived for reactive computations
 */
export function createReactiveChartDataProcessor(
  getProps: () => ProcessorConfig
): () => ChartDataProcessor {
  // Return a function that computes the processor on demand
  // This allows it to be used with $derived.by() in components
  return () => createChartDataProcessor(getProps());
}
