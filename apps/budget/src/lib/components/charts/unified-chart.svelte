<script lang="ts">
import ChartControlPanel from './controls/chart-control-panel.svelte';
import type {UnifiedChartProps} from './config/chart-config';
import {
  DEFAULT_STYLING_CONFIG,
  DEFAULT_INTERACTIONS_CONFIG,
  DEFAULT_AXES_CONFIG,
  DEFAULT_THRESHOLD_CONFIG,
} from './config/chart-config';
import ChartCore from './core/chart-core.svelte';
import {createReactiveChartDataProcessor} from './processors/chart-data-processor.svelte';
import {ALL_CHART_TYPES} from './config/chart-types';
import {resolveChartConfig, validateChartData} from './config/config-resolver';
import {calculateOptimalOpacity, createThemeDetector} from '$lib/utils/accessibility-colors';
import {chartFormatters} from '$lib/utils/chart-formatters';

// Props interface - maintain backward compatibility
let {
  data,
  type,
  axes,
  styling,
  interactions,
  timeFiltering,
  controls,
  annotations,
  threshold,
  yFields,
  yFieldLabels,
  categoryField,
  legendTitle,
  viewMode,
  viewModeData,
  suppressDuplicateWarnings = false,
  class: className = 'h-full w-full',
}: UnifiedChartProps = $props();

// Resolve complete configuration
const config = $derived.by(() =>
  resolveChartConfig({
    data,
    type,
    axes,
    styling,
    interactions,
    timeFiltering,
    controls,
    annotations,
    threshold,
  } as UnifiedChartProps)
);

// Validate data
const validation = $derived(validateChartData(data, {suppressDuplicateWarnings}));

// Control states - bindable for UI controls - initialize from config defaults
let currentChartType = $state(type || 'bar');
let currentPeriod = $state<string | number>(0);
let selectedColorScheme = $state('default');
let selectedCurve = $state('curveLinear');
let showPoints = $state(DEFAULT_STYLING_CONFIG.points.show);
let pointRadius = $state(DEFAULT_STYLING_CONFIG.points.radius);
let pointStrokeWidth = $state(DEFAULT_STYLING_CONFIG.points.strokeWidth);
let pointFillOpacity = $state(DEFAULT_STYLING_CONFIG.points.fillOpacity);
let pointStrokeOpacity = $state(DEFAULT_STYLING_CONFIG.points.strokeOpacity);
let selectedViewMode = $state(viewMode || 'combined');
let axisFontSize = $state(DEFAULT_AXES_CONFIG.x.fontSize);
let rotateXLabels = $state(DEFAULT_AXES_CONFIG.x.rotateLabels);
let xAxisFormat = $state('default');
let yAxisFormat = $state('currency');
let showGrid = $state(DEFAULT_STYLING_CONFIG.grid.show);
let showHorizontal = $state(DEFAULT_STYLING_CONFIG.grid.horizontal);
let showVertical = $state(DEFAULT_STYLING_CONFIG.grid.vertical);
let gridOpacity = $state(DEFAULT_STYLING_CONFIG.grid.opacity);
let showCrosshair = $state(DEFAULT_INTERACTIONS_CONFIG.crosshair.enabled);
let crosshairAxis = $state<'x' | 'y' | 'both' | 'none'>(
  DEFAULT_INTERACTIONS_CONFIG.crosshair.axis as 'x' | 'y' | 'both' | 'none'
);
let crosshairStyle = $state<'solid' | 'dashed' | 'dotted'>(
  DEFAULT_INTERACTIONS_CONFIG.crosshair.style
);
let crosshairOpacity = $state(DEFAULT_INTERACTIONS_CONFIG.crosshair.opacity); // Will be updated by effect to use accessibility-aware value
let showHighlightPoints = $state(DEFAULT_INTERACTIONS_CONFIG.highlight.showPoints);
let highlightPointRadius = $state(DEFAULT_INTERACTIONS_CONFIG.highlight.pointRadius);
let showLabels = $state(DEFAULT_STYLING_CONFIG.labels.show);
let labelPlacement = $state<'inside' | 'outside' | 'center'>(
  DEFAULT_STYLING_CONFIG.labels.placement
);
let labelOffset = $state(DEFAULT_STYLING_CONFIG.labels.offset?.y ?? 4);
let labelFormat = $state('currency');

// Threshold state management
let thresholdEnabled = $state(DEFAULT_THRESHOLD_CONFIG.enabled);
let thresholdValue = $state(DEFAULT_THRESHOLD_CONFIG.value);
let thresholdAboveColor = $state(DEFAULT_THRESHOLD_CONFIG.aboveColor);
let thresholdBelowColor = $state(DEFAULT_THRESHOLD_CONFIG.belowColor);
let thresholdAboveOpacity = $state(DEFAULT_THRESHOLD_CONFIG.aboveOpacity);
let thresholdBelowOpacity = $state(DEFAULT_THRESHOLD_CONFIG.belowOpacity);
let thresholdShowLine = $state(DEFAULT_THRESHOLD_CONFIG.showLine);
let thresholdLineOpacity = $state(DEFAULT_THRESHOLD_CONFIG.lineOpacity);

// Update chart type from config
$effect(() => {
  if (config.controls.availableTypes && config.controls.availableTypes.length > 0) {
    if (!config.controls.availableTypes.includes(config.type)) {
      currentChartType = config.controls.availableTypes[0]!;
    } else {
      currentChartType = config.type;
    }
  } else {
    currentChartType = config.type;
  }
});

// Update period from config
$effect(() => {
  currentPeriod = config.timeFiltering.defaultPeriod;
});

// Initialize grid controls from config defaults (only once)
let gridInitialized = $state(false);
let crosshairInitialized = $state(false);
let labelsInitialized = $state(false);
let thresholdInitialized = $state(false);

$effect(() => {
  if (!gridInitialized) {
    showGrid = config.styling.grid?.show ?? false;
    showHorizontal = config.styling.grid?.horizontal ?? true;
    showVertical = config.styling.grid?.vertical ?? false;
    gridOpacity = accessibleGridOpacity; // Use accessibility-aware opacity
    gridInitialized = true;
  }
});

// Initialize crosshair opacity with accessibility-aware value (only once)
$effect(() => {
  if (!crosshairInitialized) {
    crosshairOpacity = accessibleCrosshairOpacity;
    crosshairInitialized = true;
  }
});

// Initialize label controls from annotation config (only once)
$effect(() => {
  if (!labelsInitialized && config.controls.allowLabelChange) {
    // If there are existing annotation labels, inherit their settings
    if (config.annotations?.labels?.show) {
      showLabels = config.annotations.labels.show;
      labelPlacement = config.annotations.labels.placement || 'outside';
      labelOffset = config.annotations.labels.offset?.y || 4;
    }
    labelsInitialized = true;
  }
});

// Initialize threshold controls from config (only once)
$effect(() => {
  if (!thresholdInitialized) {
    if (config.threshold) {
      thresholdEnabled = config.threshold.enabled;
      thresholdValue = config.threshold.value;
      thresholdAboveColor = config.threshold.aboveColor;
      thresholdBelowColor = config.threshold.belowColor;
      thresholdAboveOpacity = config.threshold.aboveOpacity;
      thresholdBelowOpacity = config.threshold.belowOpacity;
      thresholdShowLine = config.threshold.showLine;
      thresholdLineOpacity = config.threshold.lineOpacity;
    }
    thresholdInitialized = true;
  }
});

// Create the reactive data processor with all configuration
const processor = createReactiveChartDataProcessor(() => ({
  data: data,
  config: config,
  chartType: currentChartType,
  currentPeriod,
  viewMode: selectedViewMode,
  viewModeData: viewModeData || {},
  yFields: yFields || [],
  yFieldLabels: yFieldLabels || [],
  categoryField: categoryField || 'category',
  enableColorScheme: config.controls.allowColorChange,
  selectedColorScheme,
}));

// Get processed data from the processor
const processorData = $derived.by(() => processor());

// Theme detection for accessibility-aware opacity calculations
const themeDetector = createThemeDetector();

// Map color scheme from effectiveColors (simplified mapping)
const currentColorScheme = $derived.by(() => {
  const primaryColor = processorData.effectiveColors[0];
  if (!primaryColor) return 'default';

  if (primaryColor.includes('22c55e') || primaryColor.includes('green')) return 'green';
  if (primaryColor.includes('f97316') || primaryColor.includes('orange')) return 'orange';
  if (primaryColor.includes('ef4444') || primaryColor.includes('red')) return 'red';
  if (primaryColor.includes('a855f7') || primaryColor.includes('purple')) return 'purple';
  return 'default'; // blue
});

// Calculate accessibility-aware opacity for crosshair
const accessibleCrosshairOpacity = $derived.by(() => {
  return calculateOptimalOpacity(currentColorScheme, themeDetector.mode);
});

// Calculate accessibility-aware opacity for grid lines (more subtle than crosshair)
const accessibleGridOpacity = $derived.by(() => {
  // Grid lines should be more subtle than crosshairs
  const baseOpacity = calculateOptimalOpacity(currentColorScheme, themeDetector.mode);
  return Math.max(0.1, baseOpacity * 0.4); // 40% of crosshair opacity, minimum 0.1
});

// Create formatter function based on labelFormat
const labelFormatter = $derived.by(() => {
  return (datum: any) => {
    const value =
      typeof datum === 'object' && datum !== null
        ? (datum.y ?? datum.value ?? datum.amount ?? datum)
        : datum;

    if (typeof value !== 'number') return String(value);

    switch (labelFormat) {
      case 'currency':
        return chartFormatters.currency(value);
      case 'percentage':
        return chartFormatters.percentage(value);
      case 'number':
        return chartFormatters.number(value);
      default:
        return String(value);
    }
  };
});

// Create Y-axis formatter function
const yAxisFormatter = $derived.by(() => {
  console.log('Creating Y-axis formatter for format:', yAxisFormat);
  return (value: any) => {
    console.log('Y-axis formatter called with value:', value, 'format:', yAxisFormat);
    if (typeof value !== 'number') return String(value);

    switch (yAxisFormat) {
      case 'currency':
        return chartFormatters.currency(value);
      case 'percentage':
        return chartFormatters.percentage(value);
      case 'number':
        return chartFormatters.number(value);
      case 'compact':
        return chartFormatters.numberCompact(value);
      case 'default':
      default:
        return chartFormatters.currency(value);
    }
  };
});

// Create X-axis formatter function
const xAxisFormatter = $derived.by(() => {
  console.log('Creating X-axis formatter for format:', xAxisFormat);
  return (value: any) => {
    console.log('X-axis formatter called with value:', value, 'format:', xAxisFormat);
    if (typeof value !== 'number') return String(value);

    switch (xAxisFormat) {
      case 'currency':
        return chartFormatters.currency(value);
      case 'percentage':
        return chartFormatters.percentage(value);
      case 'number':
        return chartFormatters.number(value);
      case 'compact':
        return chartFormatters.numberCompact(value);
      default:
        return String(value);
    }
  };
});

// Get available chart types for the selector
const availableChartTypes = $derived.by(() => {
  if (!config.controls.availableTypes) return [];

  return ALL_CHART_TYPES.flatMap((group) =>
    group.options.filter((option) => config.controls.availableTypes!.includes(option.value))
  );
});

// Loading and error states
const isLoading = $derived.by(() => data.length > 1000);
const hasRenderError = $state(false);

// Accessibility ID
const chartId = Math.random().toString(36).substring(2, 9);

// Error logging effect
$effect(() => {
  if (!validation.isValid) {
    console.error(
      'Chart data validation failed:',
      validation.errors.map((e: any) => e.message)
    );
  }

  if (validation.warnings.length > 0) {
    console.warn(
      'Chart data warnings:',
      validation.warnings.map((w: any) => w.message)
    );
  }

  if (validation.dataQuality.duplicateKeys > 0 && !suppressDuplicateWarnings) {
    console.warn(
      `Chart has ${validation.dataQuality.duplicateKeys} duplicate keys which may affect visualization`
    );
  }
});
</script>

<div
  class={className}
  role="img"
  aria-label={`${currentChartType} chart with ${processorData.chartData.length} data points`}
  aria-describedby={`chart-description-${chartId}`}>
  {#if hasRenderError}
    <!-- Render error state -->
    <div class="flex h-full items-center justify-center p-6 text-center">
      <div class="space-y-4">
        <h3 class="text-destructive text-lg font-semibold">Chart Rendering Error</h3>
        <p class="text-muted-foreground text-sm">
          The chart encountered an error during rendering. Please try again.
        </p>
      </div>
    </div>
  {:else if isLoading}
    <!-- Loading state -->
    <div class="flex h-full items-center justify-center">
      <div class="space-y-4 text-center">
        <div
          class="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-2 border-t-transparent">
        </div>
        <p class="text-muted-foreground text-sm">
          Loading chart... ({data.length.toLocaleString()} data points)
        </p>
      </div>
    </div>
  {:else if validation.isValid}
    <!-- Compact Controls Panel -->
    {#if config.controls.show}
      <div class="mb-4">
        <ChartControlPanel
          bind:chartType={currentChartType}
          {availableChartTypes}
          allowTypeChange={config.controls.allowTypeChange}
          bind:currentPeriod
          periodData={processorData.availablePeriods.map((p) => ({key: p.value, label: p.label}))}
          allowPeriodChange={config.controls.allowPeriodChange}
          enablePeriodFiltering={config.timeFiltering.enabled}
          dateField={config.timeFiltering.field}
          bind:selectedColorScheme
          allowColorChange={config.controls.allowColorChange}
          bind:selectedCurve
          allowCurveChange={config.controls.allowCurveChange}
          bind:showPoints
          allowPointsChange={config.controls.allowPointsChange}
          bind:pointRadius
          bind:pointStrokeWidth
          bind:pointFillOpacity
          bind:pointStrokeOpacity
          bind:selectedViewMode
          availableViewModes={config.controls.availableViewModes || ['combined', 'side-by-side']}
          allowViewModeChange={config.controls.allowViewModeChange}
          bind:axisFontSize
          bind:rotateXLabels
          bind:xAxisFormat
          bind:yAxisFormat
          allowFontChange={config.controls.allowFontChange}
          bind:showGrid
          bind:showHorizontal
          bind:showVertical
          bind:gridOpacity
          allowGridChange={config.controls.allowGridChange}
          calculatedGridOpacity={accessibleGridOpacity}
          bind:showCrosshair
          bind:crosshairAxis
          bind:crosshairStyle
          bind:crosshairOpacity
          allowCrosshairChange={config.controls.allowCrosshairChange}
          calculatedOpacity={accessibleCrosshairOpacity}
          bind:showHighlightPoints
          bind:highlightPointRadius
          allowHighlightChange={config.controls.allowHighlightChange}
          bind:showLabels
          bind:labelPlacement
          bind:labelOffset
          bind:labelFormat
          allowLabelChange={config.controls.allowLabelChange}
          bind:thresholdEnabled
          bind:thresholdValue
          bind:thresholdAboveColor
          bind:thresholdBelowColor
          bind:thresholdAboveOpacity
          bind:thresholdBelowOpacity
          bind:thresholdShowLine
          bind:thresholdLineOpacity
          allowThresholdChange={config.controls.allowThresholdChange} />
      </div>
    {/if}

    <!-- Chart rendering via ChartCore -->
    <ChartCore
      processor={processorData}
      chartType={currentChartType}
      config={{
        ...config,
        type: currentChartType,
        data: data,
        resolvedColors: config.controls.allowColorChange
          ? processorData.effectiveColors
          : config.resolvedColors,
        axes: {
          ...config.axes,
          x: {
            ...config.axes.x,
            format: xAxisFormatter,
            ...(config.controls.allowFontChange
              ? {
                  fontSize: axisFontSize,
                  rotateLabels: rotateXLabels,
                }
              : {}),
          },
          y: {
            ...config.axes.y,
            format: yAxisFormatter,
            ...(config.controls.allowFontChange
              ? {
                  fontSize: axisFontSize,
                }
              : {}),
          },
        },
        styling: {
          ...config.styling,
          points: {
            ...config.styling.points,
            show: config.controls.allowPointsChange
              ? showPoints
              : (config.styling.points?.show ?? false),
            radius: config.controls.allowPointsChange
              ? pointRadius
              : (config.styling.points?.radius ?? 3),
            strokeWidth: config.controls.allowPointsChange
              ? pointStrokeWidth
              : (config.styling.points?.strokeWidth ?? 0),
            fillOpacity: config.controls.allowPointsChange
              ? pointFillOpacity
              : (config.styling.points?.fillOpacity ?? 1.0),
            strokeOpacity: config.controls.allowPointsChange
              ? pointStrokeOpacity
              : (config.styling.points?.strokeOpacity ?? 1.0),
          },
          grid: {
            ...config.styling.grid,
            show: config.controls.allowGridChange ? showGrid : (config.styling.grid?.show ?? false),
            horizontal: config.controls.allowGridChange
              ? showHorizontal
              : (config.styling.grid?.horizontal ?? false),
            vertical: config.controls.allowGridChange
              ? showVertical
              : (config.styling.grid?.vertical ?? false),
            opacity: config.controls.allowGridChange
              ? gridOpacity
              : (config.styling.grid?.opacity ?? 0.5),
          },
          labels: {
            ...config.styling.labels,
            show: config.controls.allowLabelChange
              ? showLabels
              : (config.styling.labels?.show ?? false),
            placement: config.controls.allowLabelChange
              ? labelPlacement
              : (config.styling.labels?.placement ?? 'outside'),
            offset: config.controls.allowLabelChange
              ? {y: labelOffset}
              : (config.styling.labels?.offset ?? {y: 4}),
            format: config.controls.allowLabelChange
              ? labelFormatter
              : (config.styling.labels?.format ?? labelFormatter),
          },
        },
        threshold: {
          ...config.threshold,
          enabled: config.controls.allowThresholdChange
            ? thresholdEnabled
            : config.threshold.enabled,
          value: config.controls.allowThresholdChange ? thresholdValue : config.threshold.value,
          aboveColor: config.controls.allowThresholdChange
            ? thresholdAboveColor
            : config.threshold.aboveColor,
          belowColor: config.controls.allowThresholdChange
            ? thresholdBelowColor
            : config.threshold.belowColor,
          aboveOpacity: config.controls.allowThresholdChange
            ? thresholdAboveOpacity
            : config.threshold.aboveOpacity,
          belowOpacity: config.controls.allowThresholdChange
            ? thresholdBelowOpacity
            : config.threshold.belowOpacity,
          showLine: config.controls.allowThresholdChange
            ? thresholdShowLine
            : config.threshold.showLine,
          lineOpacity: config.controls.allowThresholdChange
            ? thresholdLineOpacity
            : config.threshold.lineOpacity,
        },
      }}
      viewMode={selectedViewMode}
      viewModeData={viewModeData || {}}
      {...legendTitle ? {legendTitle} : {}}
      {...config.controls.allowCurveChange ? {selectedCurve} : {}}
      {...yFieldLabels ? {yFieldLabels} : {}}
      {showCrosshair}
      {crosshairAxis}
      {crosshairStyle}
      {crosshairOpacity}
      {showHighlightPoints}
      {highlightPointRadius}
      class="h-full w-full" />
  {:else}
    <!-- Error state with enhanced error display -->
    <div class="flex h-full items-center justify-center p-6 text-center">
      <div class="max-w-md space-y-4">
        <h3 class="text-destructive text-lg font-semibold">Chart Data Error</h3>
        <div class="space-y-3">
          {#each validation.errors as error}
            <div class="bg-destructive/5 border-destructive/20 rounded-md border p-3 text-sm">
              <div class="text-destructive font-medium">
                {error.type.replace('_', ' ').toUpperCase()}
              </div>
              <div class="text-muted-foreground mt-1">{error.message}</div>
              {#if error.dataIndex !== undefined}
                <div class="text-muted-foreground mt-1 text-xs">
                  Data point: {error.dataIndex}{error.field ? ` (field: ${error.field})` : ''}
                </div>
              {/if}
            </div>
          {/each}
        </div>

        <!-- Data quality summary even in error state -->
        {#if validation.dataQuality.totalPoints > 0}
          <div class="text-muted-foreground border-t pt-2 text-xs">
            <div>Total data points: {validation.dataQuality.totalPoints}</div>
            <div>Missing values: {validation.dataQuality.missingValues}</div>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Screen reader description -->
  <div id={`chart-description-${chartId}`} class="sr-only">
    {#if validation.isValid && processorData.chartData.length > 0}
      <p>
        This is a {currentChartType} chart displaying {processorData.chartData.length} data points.
        {#if validation.dataQuality.valueRanges.y[0] !== validation.dataQuality.valueRanges.y[1]}
          Values range from {validation.dataQuality.valueRanges.y[0]} to {validation.dataQuality
            .valueRanges.y[1]}.
        {/if}
        {#if validation.warnings.length > 0 && validation.warnings[0]}
          Note: {validation.warnings[0].message}
        {/if}
      </p>
    {:else if !validation.isValid}
      <p>Chart contains invalid data and cannot be displayed.</p>
    {:else}
      <p>Chart has no data to display.</p>
    {/if}
  </div>
</div>
