<script lang="ts">
  import { Settings, Settings2 } from 'lucide-svelte';
  import * as Button  from "bits-ui";
  import * as ResponsiveSheet  from "bits-ui";
  import { DEFAULT_STYLING_CONFIG } from '../config/chart-config';
  import type { ChartType, ChartTypeOption } from '../config/chart-types';
  import ChartColorSelector from './chart-color-selector.svelte';
  import ChartCrosshairControls from './chart-crosshair-controls.svelte';
  import ChartCurveSelector from './chart-curve-selector.svelte';
  import ChartFontControls from './chart-font-controls.svelte';
  import ChartGridControls from './chart-grid-controls.svelte';
  import ChartHighlightControls from './chart-highlight-controls.svelte';
  import ChartLabelControls from './chart-label-controls.svelte';
  import ChartPeriodControls from './chart-period-controls.svelte';
  import ChartPointStyleControls from './chart-point-style-controls.svelte';
  import ChartThresholdControls from './chart-threshold-controls.svelte';
  import ChartTypeSelector from './chart-type-selector.svelte';
  import type { ViewModeOption } from './chart-view-mode-selector.svelte';
  import ChartViewModeSelector from './chart-view-mode-selector.svelte';

  // Organized Props Interface
  interface DataControlsProps {
    chartType: ChartType;
    availableChartTypes?: ChartTypeOption[];
    allowTypeChange?: boolean;
  }

  interface PeriodControlsProps {
    currentPeriod: string | number;
    periodData: Array<{key: string | number; label: string}>;
    allowPeriodChange?: boolean;
    enablePeriodFiltering?: boolean;
    dateField?: string;
  }

  interface StyleControlsProps {
    selectedColorScheme: string;
    allowColorChange?: boolean;

    selectedCurve: string;
    allowCurveChange?: boolean;

    showPoints: boolean;
    allowPointsChange?: boolean;
    pointRadius?: number;
    pointStrokeWidth?: number;
    pointFillOpacity?: number;
    pointStrokeOpacity?: number;

    selectedViewMode: ViewModeOption;
    availableViewModes?: ViewModeOption[];
    allowViewModeChange?: boolean;
  }

  interface FontControlsProps {
    axisFontSize?: string;
    rotateXLabels?: boolean;
    xAxisFormat?: string;
    yAxisFormat?: string;
    allowFontChange?: boolean;
  }

  interface GridControlsProps {
    showGrid?: boolean;
    showHorizontal?: boolean;
    showVertical?: boolean;
    gridOpacity?: number;
    allowGridChange?: boolean;
    calculatedGridOpacity?: number;
  }

  interface CrosshairControlsProps {
    showCrosshair?: boolean;
    crosshairAxis?: 'x' | 'y' | 'both' | 'none';
    crosshairStyle?: 'solid' | 'dashed' | 'dotted';
    crosshairOpacity?: number;
    allowCrosshairChange?: boolean;
    calculatedOpacity?: number; // Show the accessibility-aware calculated opacity
  }

  interface HighlightControlsProps {
    showHighlightPoints?: boolean;
    highlightPointRadius?: number;
    allowHighlightChange?: boolean;
  }

  interface LabelControlsProps {
    showLabels?: boolean;
    labelPlacement?: 'inside' | 'outside' | 'center';
    labelOffset?: number;
    labelFormat?: string;
    allowLabelChange?: boolean;
  }

  interface ThresholdControlsProps {
    thresholdEnabled?: boolean;
    thresholdValue?: number;
    thresholdAboveColor?: string;
    thresholdBelowColor?: string;
    thresholdAboveOpacity?: number;
    thresholdBelowOpacity?: number;
    thresholdShowLine?: boolean;
    thresholdLineOpacity?: number;
    allowThresholdChange?: boolean;
  }

  interface Props extends DataControlsProps, PeriodControlsProps, StyleControlsProps, FontControlsProps, GridControlsProps, CrosshairControlsProps, HighlightControlsProps, LabelControlsProps, ThresholdControlsProps {}

  // Destructured Props - Organized by Category
  let {
    // Data Controls
    chartType = $bindable('line'),
    availableChartTypes = [],
    allowTypeChange = false,

    // Period Controls
    currentPeriod = $bindable(0),
    periodData = [],
    allowPeriodChange = false,
    enablePeriodFiltering = false,
    dateField = 'date',

    // Style Controls
    selectedColorScheme = $bindable('default'),
    allowColorChange = false,
    selectedCurve = $bindable('curveLinear'),
    allowCurveChange = false,
    showPoints = $bindable(false),
    allowPointsChange = false,
    pointRadius = $bindable(DEFAULT_STYLING_CONFIG.points.radius ?? 6),
    pointStrokeWidth = $bindable(DEFAULT_STYLING_CONFIG.points.strokeWidth ?? 1),
    pointFillOpacity = $bindable(1.0),
    pointStrokeOpacity = $bindable(1.0),
    selectedViewMode = $bindable('combined'),
    availableViewModes = [],
    allowViewModeChange = false,

    // Font Controls
    axisFontSize = $bindable('0.75rem'),
    rotateXLabels = $bindable(false),
    xAxisFormat = $bindable('default'),
    yAxisFormat = $bindable('currency'),
    allowFontChange = false,

    // Grid Controls
    showGrid = $bindable(false),
    showHorizontal = $bindable(true),
    showVertical = $bindable(false),
    gridOpacity = $bindable(0.5),
    allowGridChange = false,
    calculatedGridOpacity,

    // Crosshair Controls
    showCrosshair = $bindable(true),
    crosshairAxis = $bindable('both'),
    crosshairStyle = $bindable('solid'),
    crosshairOpacity = $bindable(0.6),
    allowCrosshairChange = false,
    calculatedOpacity,

    // Highlight Controls
    showHighlightPoints = $bindable(true),
    highlightPointRadius = $bindable(6),
    allowHighlightChange = false,

    // Label Controls
    showLabels = $bindable(false),
    labelPlacement = $bindable('outside'),
    labelOffset = $bindable(4),
    labelFormat = $bindable('currency'),
    allowLabelChange = false,

    // Threshold Controls
    thresholdEnabled = $bindable(false),
    thresholdValue = $bindable(0),
    thresholdAboveColor = $bindable('hsl(142 71% 45%)'),
    thresholdBelowColor = $bindable('hsl(350 89% 60%)'),
    thresholdAboveOpacity = $bindable(0.3),
    thresholdBelowOpacity = $bindable(0.3),
    thresholdShowLine = $bindable(true),
    thresholdLineOpacity = $bindable(0.5),
    allowThresholdChange = false
  }: Props = $props();

  // Track which sections are open
  let styleControlsOpen = $state(false);

  // Check if we have any style controls to show
  const hasStyleControls = $derived(
    allowColorChange || allowCurveChange || allowPointsChange || allowViewModeChange || allowFontChange || allowGridChange || allowCrosshairChange || allowHighlightChange || allowLabelChange || allowThresholdChange
  );

  // Check if we have any data controls to show
  const hasDataControls = $derived(
    allowTypeChange || allowPeriodChange
  );
</script>

{#if hasDataControls || hasStyleControls}
  <div class="flex items-center justify-between gap-2 p-3 bg-muted/30 rounded-lg">
    <div class="flex items-center gap-4 flex-1">

      <!-- Chart Type Selection -->
      {#if allowTypeChange && availableChartTypes.length > 1}
        <ChartTypeSelector
          bind:chartType
          {availableChartTypes}
        />
      {/if}

      <!-- Time Period Filtering -->
      {#if allowPeriodChange && enablePeriodFiltering}
        <ChartPeriodControls
          bind:currentPeriod
          data={periodData}
          {dateField}
          {enablePeriodFiltering}
        />
      {/if}
    </div>

    {#if hasStyleControls}
      <div class="flex items-center gap-2">
        <ResponsiveSheet.Root bind:open={styleControlsOpen} side="right">

          <!-- Style Controls Trigger Button -->
          {#snippet trigger()}
            <Button.Root variant="ghost" size="sm" class="gap-2">
              <Settings class="h-4 w-4" />
              Style
              <span class="text-xs text-muted-foreground">
                {styleControlsOpen ? '−' : '+'}
              </span>
            </Button.Root>
          {/snippet}

          <!-- Style Controls Header -->
          {#snippet header()}
            <div class="flex items-center gap-2">
              <Settings2 class="h-4 w-4" />
              <div>
                <h2 class="text-lg font-semibold">Chart Style</h2>
                <p class="text-sm text-muted-foreground">Customize chart appearance and behavior</p>
              </div>
            </div>
          {/snippet}

          <!-- Style Controls Content -->
          {#snippet content()}
            <div class="space-y-8">
              {#if allowColorChange || allowCurveChange}
                <div class="space-y-4">
                  <div class="pb-2 border-b border-border">
                    <h3 class="text-sm font-semibold text-foreground">Visual Styling</h3>
                  </div>

                  <div class="space-y-4">
                    <!-- Color Scheme Selection -->
                    {#if allowColorChange}
                      <ChartColorSelector bind:selectedScheme={selectedColorScheme} />
                    {/if}

                    <!-- Line/Area Curve Selection -->
                    {#if allowCurveChange}
                      <ChartCurveSelector bind:curve={selectedCurve} {chartType} />
                    {/if}
                  </div>
                </div>
              {/if}

              {#if allowPointsChange}
                <div class="space-y-4">
                  <div class="pb-2 border-b border-border">
                    <h3 class="text-sm font-semibold text-foreground">Point Styling</h3>
                  </div>

                  <!-- Point Display and Styling -->
                  <ChartPointStyleControls
                    bind:showPoints
                    bind:pointRadius
                    bind:pointStrokeWidth
                    bind:pointFillOpacity
                    bind:pointStrokeOpacity
                    {chartType}
                  />
                </div>
              {/if}

              {#if allowViewModeChange}
                <div class="space-y-4">
                  <div class="pb-2 border-b border-border">
                    <h3 class="text-sm font-semibold text-foreground">Layout</h3>
                  </div>

                  <!-- View Mode (Combined vs Side-by-Side) -->
                  <ChartViewModeSelector
                    bind:viewMode={selectedViewMode}
                    {availableViewModes}
                  />
                </div>
              {/if}

              {#if allowFontChange || allowGridChange || allowCrosshairChange || allowLabelChange}
                <div class="space-y-4">
                  <div class="pb-2 border-b border-border">
                    <h3 class="text-sm font-semibold text-foreground">Axes & Grid</h3>
                  </div>

                  <div class="space-y-4">
                    <!-- Font Size and Label Rotation -->
                    {#if allowFontChange}
                      <ChartFontControls
                        bind:axisFontSize
                        bind:rotateXLabels
                        bind:xAxisFormat
                        bind:yAxisFormat
                        {allowFontChange}
                      />
                    {/if}

                    <!-- Grid Lines and Opacity -->
                    {#if allowGridChange}
                      <ChartGridControls
                        bind:showGrid
                        bind:showHorizontal
                        bind:showVertical
                        bind:gridOpacity
                        {allowGridChange}
                        calculatedGridOpacity={calculatedGridOpacity ?? undefined}
                      />
                    {/if}

                    <!-- Crosshair/Ruler Controls -->
                    {#if allowCrosshairChange}
                      <ChartCrosshairControls
                        bind:showCrosshair
                        bind:crosshairAxis
                        bind:crosshairStyle
                        bind:crosshairOpacity
                        {allowCrosshairChange}
                        calculatedOpacity={calculatedOpacity ?? undefined}
                      />
                    {/if}

                    <!-- Highlight Point Controls -->
                    {#if allowHighlightChange}
                      <ChartHighlightControls
                        bind:showHighlightPoints
                        bind:highlightPointRadius
                        {allowHighlightChange}
                      />
                    {/if}

                    <!-- Label Controls -->
                    {#if allowLabelChange}
                      <ChartLabelControls
                        bind:showLabels
                        bind:labelPlacement
                        bind:labelOffset
                        bind:labelFormat
                        {allowLabelChange}
                      />
                    {/if}

                    <!-- Threshold Controls -->
                    {#if allowThresholdChange}
                      <ChartThresholdControls
                        bind:enabled={thresholdEnabled}
                        bind:value={thresholdValue}
                        bind:aboveColor={thresholdAboveColor}
                        bind:belowColor={thresholdBelowColor}
                        bind:aboveOpacity={thresholdAboveOpacity}
                        bind:belowOpacity={thresholdBelowOpacity}
                        bind:showLine={thresholdShowLine}
                        bind:lineOpacity={thresholdLineOpacity}
                      />
                    {/if}
                  </div>
                </div>
              {/if}

            </div>
          {/snippet}
        </ResponsiveSheet.Root>
      </div>
    {/if}
  </div>
{/if}

