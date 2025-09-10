import { getSchemeColors } from "@budget-shared/utils";
import { aggregateForPerformance } from "@budget-shared/utils";
import { filterDataByPeriod, generatePeriodOptions } from "@budget-shared/utils";
import { getDataAccessorsForChartType, isCircularChart, requiresHierarchicalData, supportsMultiSeries, transformDataForChartType, } from "@budget-shared/utils";
import { colorUtils } from "@budget-shared/utils";
import { scaleBand } from "d3-scale";
// Memoization cache for expensive computations
const computationCache = new Map();
/**
 * Creates a cache key from the inputs to enable memoization
 */
function createCacheKey(data, chartType, config, additionalKeys = []) {
    const dataHash = data.length > 0
        ? `${data.length}-${JSON.stringify(data[0])}-${JSON.stringify(data[data.length - 1])}`
        : "empty";
    return `${dataHash}-${chartType}-${JSON.stringify(config)}-${additionalKeys.join("-")}`;
}
/**
 * Memoized wrapper for expensive data transformations
 */
function memoizeTransformation(key, computeFn, maxCacheSize = 50) {
    if (computationCache.has(key)) {
        return computationCache.get(key);
    }
    // Clear old entries if cache is getting too large
    if (computationCache.size >= maxCacheSize) {
        const firstKey = computationCache.keys().next().value;
        if (firstKey)
            computationCache.delete(firstKey);
    }
    const result = computeFn();
    computationCache.set(key, result);
    return result;
}
/**
 * Creates a reactive chart data processor with Svelte 5 patterns
 * All computations are optimized with proper dependency tracking
 */
export function createChartDataProcessor(props) {
    const { data, config, chartType, currentPeriod, viewMode, viewModeData, yFields, yFieldLabels, categoryField, enableColorScheme = false, selectedColorScheme = "default", } = props;
    // Chart characteristics using utilities
    const isChartCircular = isCircularChart(chartType);
    const isChartHierarchical = requiresHierarchicalData(chartType);
    const chartSupportsMultiSeries = supportsMultiSeries(chartType);
    // Get data accessors for the current chart type
    const dataAccessors = getDataAccessorsForChartType(chartType);
    // Streamlined data processing: select, filter, and prepare in single pipeline
    const processedData = (() => {
        // Step 1: Select data based on view mode
        const sourceData = !viewModeData || viewMode === "combined" ? data : viewModeData.combined || data;
        // Step 2: Apply time filtering if enabled
        if (!config.timeFiltering.enabled) {
            return sourceData;
        }
        // Special handling for circular charts with source data processing
        const hasSourceData = config.timeFiltering.sourceData?.length > 0 && config.timeFiltering.sourceProcessor;
        if (isChartCircular && hasSourceData) {
            const filteredSourceData = currentPeriod === 0 || currentPeriod === "0"
                ? config.timeFiltering.sourceData
                : filterDataByPeriod(config.timeFiltering.sourceData, config.timeFiltering.sourceDateField, currentPeriod);
            return config.timeFiltering.sourceProcessor(filteredSourceData);
        }
        // Default filtering for linear charts
        return filterDataByPeriod(sourceData, config.timeFiltering.field, currentPeriod);
    })();
    // Maintain compatibility with existing code
    const filteredData = processedData;
    // Prepare chart data for LayerChart with performance optimization and transformation
    const chartData = (() => {
        // Ensure we have valid data before processing
        if (!filteredData || filteredData.length === 0) {
            return [];
        }
        // Create cache key for this expensive computation
        const transformOptions = {
            categoryField: categoryField || "category",
            valueField: "y",
            seriesField: "series",
            colors: config.styling.colors !== "auto" ? config.styling.colors : undefined,
        };
        const cacheKey = createCacheKey(filteredData, chartType, transformOptions, [
            String(chartSupportsMultiSeries),
            String(yFields?.length || 0),
        ]);
        return memoizeTransformation(cacheKey, () => {
            // Performance optimization: aggregate large datasets
            const dataToProcess = filteredData.length > 500 ? aggregateForPerformance(filteredData, 500) : filteredData;
            // Transform data based on chart type requirements
            const transformOptionsInternal = {
                categoryField: categoryField || "category",
                valueField: "y",
                seriesField: "series",
            };
            // Only add colors if they're not 'auto'
            if (config.styling.colors !== "auto") {
                transformOptionsInternal.colors = config.styling.colors;
            }
            const transformed = transformDataForChartType(dataToProcess, chartType, transformOptionsInternal);
            const finalData = Array.isArray(transformed) ? transformed : [transformed];
            return finalData;
        });
    })();
    // Detect if this is multi-series data
    const isMultiSeries = chartSupportsMultiSeries &&
        Boolean(yFields && yFields.length > 1 && filteredData.some((item) => item.series || item.category));
    // Get unique series for multi-series charts
    const seriesList = (() => {
        if (!isMultiSeries)
            return [];
        const uniqueSeries = new Set();
        chartData.forEach((item) => {
            if (item.series)
                uniqueSeries.add(item.series);
            else if (item.category)
                uniqueSeries.add(item.category);
        });
        return Array.from(uniqueSeries);
    })();
    // Use yFieldLabels if provided, otherwise use series list
    const legendItems = yFieldLabels && yFieldLabels.length > 0 ? yFieldLabels : seriesList;
    // Prepare series data for multi-series charts
    const seriesData = (() => {
        if (!isMultiSeries)
            return [];
        const seriesKey = createCacheKey(chartData, "series", {}, seriesList);
        return memoizeTransformation(seriesKey, () => {
            return seriesList.map((series) => chartData.filter((d) => d.series === series || d.category === series));
        });
    })();
    // Create band scale for charts with categorical x values
    const bandScale = (() => {
        if (chartData.length > 0 && !isChartCircular) {
            const firstItem = chartData[0];
            const hasStringXValues = firstItem && typeof firstItem.x === "string";
            if (hasStringXValues || chartType === "bar") {
                const scale = scaleBand()
                    .domain(chartData.map((d) => String(d.x)))
                    .range([0, 1]) // LayerChart expects normalized range
                    .paddingInner(chartType === "bar" ? 0.1 : 0.05)
                    .paddingOuter(chartType === "bar" ? 0.05 : 0.02);
                return scale;
            }
        }
        return undefined;
    })();
    // Create band scales for side-by-side income and expenses charts
    const incomeBandScale = (() => {
        if (chartType === "bar" &&
            viewModeData?.income &&
            viewModeData.income.length > 0 &&
            !isChartCircular) {
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
        if (chartType === "bar" &&
            viewModeData?.expenses &&
            viewModeData.expenses.length > 0 &&
            !isChartCircular) {
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
            return Array.from({ length: 8 }, (_, i) => colorUtils.getChartColor(i));
        }
        return config.styling.colors;
    })();
    // Generate period options for time filtering
    const availablePeriods = (() => {
        if (!config.timeFiltering.enabled)
            return [];
        // Only use transaction-based filtering for radial charts (pie/arc) that need it
        const hasSourceData = config.timeFiltering.sourceData && config.timeFiltering.sourceData.length > 0;
        if (isChartCircular && hasSourceData) {
            const options = generatePeriodOptions(config.timeFiltering.sourceData, config.timeFiltering.sourceDateField);
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
    const dataQuality = {
        totalPoints: chartData.length,
        missingValues: chartData.filter((d) => d.y === null || d.y === undefined).length,
        duplicateKeys: 0, // Would need more complex logic to detect duplicates
        dataTypes: {
            x: [...new Set(chartData.map((d) => typeof d.x))],
            y: [...new Set(chartData.map((d) => typeof d.y))],
        },
        valueRanges: {
            x: chartData.length > 0 ? [chartData[0].x, chartData[chartData.length - 1].x] : [null, null],
            y: chartData.length > 0
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
export function createReactiveChartDataProcessor(getProps) {
    // Return a function that computes the processor on demand
    // This allows it to be used with $derived.by() in components
    return () => createChartDataProcessor(getProps());
}
