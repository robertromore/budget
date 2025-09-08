<script lang="ts">
  import { UnifiedChart } from '$lib/components/charts';
  import type { ChartDataPoint } from '$lib/components/charts/config/chart-config';

  // Sample data for different chart types
  const basicData: ChartDataPoint[] = [
    { x: 'Jan', y: 1500 },
    { x: 'Feb', y: 2300 },
    { x: 'Mar', y: 1800 },
    { x: 'Apr', y: 2100 },
    { x: 'May', y: 2500 },
    { x: 'Jun', y: 2200 }
  ];

  const multiSeriesData: ChartDataPoint[] = [
    { x: 'Jan', y: 1500, series: 'Income' },
    { x: 'Jan', y: 1200, series: 'Expenses' },
    { x: 'Feb', y: 2300, series: 'Income' },
    { x: 'Feb', y: 1800, series: 'Expenses' },
    { x: 'Mar', y: 1800, series: 'Income' },
    { x: 'Mar', y: 1500, series: 'Expenses' },
    { x: 'Apr', y: 2100, series: 'Income' },
    { x: 'Apr', y: 1900, series: 'Expenses' },
    { x: 'May', y: 2500, series: 'Income' },
    { x: 'May', y: 2000, series: 'Expenses' },
    { x: 'Jun', y: 2200, series: 'Income' },
    { x: 'Jun', y: 2100, series: 'Expenses' }
  ];

  const pieData: ChartDataPoint[] = [
    { x: 'Groceries', y: 450, category: 'Groceries' },
    { x: 'Transportation', y: 320, category: 'Transportation' },
    { x: 'Entertainment', y: 280, category: 'Entertainment' },
    { x: 'Utilities', y: 200, category: 'Utilities' },
    { x: 'Other', y: 150, category: 'Other' }
  ];

  // Custom tooltip formatter
  const customTooltipContent = (data: any, payload: any[]) => {
    if (!data) return '';

    let html = `<div class="font-semibold">${data.x || 'Value'}</div>`;
    html += '<div class="mt-1 space-y-1">';

    if (payload && payload.length > 0) {
      payload.forEach(item => {
        const value = item.value || item.payload?.y || 0;
        html += `<div class="flex justify-between gap-4">
          <span>${item.label || item.name || 'Value'}:</span>
          <span class="font-mono">$${value.toLocaleString()}</span>
        </div>`;
      });
    } else {
      html += `<div class="font-mono">$${(data.y || 0).toLocaleString()}</div>`;
    }

    html += '</div>';
    return html;
  };
</script>

<div class="container mx-auto p-8 space-y-12">
  <h1 class="text-3xl font-bold mb-8">Tooltip Configuration Examples</h1>

  <!-- Basic tooltip with default settings -->
  <!-- <section class="space-y-4">
    <h2 class="text-xl font-semibold">1. Basic Tooltip (Default Settings)</h2>
    <p class="text-muted-foreground">
      Hover over the chart to see the default tooltip with currency formatting.
    </p>
    <div class="h-[400px] border rounded-lg p-4">
      <UnifiedChart
        data={basicData}
        type="bar"
        axes={{
          x: { title: 'Month' },
          y: { title: 'Amount ($)' }
        }}
        interactions={{
          tooltip: {
            enabled: true,
            format: 'currency'
          }
        }}
      />
    </div>
  </section> -->

  <!-- Multi-series with total -->
  <section class="space-y-4">
    <h2 class="text-xl font-semibold">2. Multi-Series Tooltip with Total</h2>
    <p class="text-muted-foreground">
      Shows multiple series in the tooltip with an optional total row.
    </p>
    <div class="h-[400px] border rounded-lg p-4">
      <UnifiedChart
        data={basicData}
        type="line"
        axes={{
          x: { title: 'Month' },
          y: { title: 'Amount ($)' }
        }}
        styling={{
          legend: { show: true, position: 'top' }
        }}
        interactions={{
          tooltip: {
            enabled: true,
            format: 'default',
            showTotal: true
          }
        }}
      />
    </div>
  </section>

  <!-- Customized tooltip position and styling -->
  <!-- <section class="space-y-4">
    <h2 class="text-xl font-semibold">3. Customized Tooltip Position & Style</h2>
    <p class="text-muted-foreground">
      Tooltip with custom offset, anchor position, and inverted variant.
    </p>
    <div class="h-[400px] border rounded-lg p-4">
      <UnifiedChart
        data={basicData}
        type="area"
        axes={{
          x: { title: 'Month' },
          y: { title: 'Sales' }
        }}
        styling={{
          colors: ['hsl(var(--chart-3))']
        }}
        interactions={{
          tooltip: {
            enabled: true,
            format: 'default',
            position: 'pointer',
            xOffset: 20,
            yOffset: -10,
            anchor: 'bottom-right',
            variant: 'invert'
          }
        }}
      />
    </div>
  </section> -->

  <!-- Pie chart with percentage formatting -->
  <!-- <section class="space-y-4">
    <h2 class="text-xl font-semibold">4. Pie Chart with Percentage Tooltip</h2>
    <p class="text-muted-foreground">
      Pie chart showing category breakdown with percentage formatting.
    </p>
    <div class="h-[400px] border rounded-lg p-4">
      <UnifiedChart
        data={pieData}
        type="pie"
        interactions={{
          tooltip: {
            enabled: true,
            format: 'currency',
            position: 'data'
          }
        }}
      />
    </div>
  </section> -->

  <!-- Custom tooltip content -->
  <!-- <section class="space-y-4">
    <h2 class="text-xl font-semibold">5. Custom Tooltip Content</h2>
    <p class="text-muted-foreground">
      Using a custom content function for complete control over tooltip display.
    </p>
    <div class="h-[400px] border rounded-lg p-4">
      <UnifiedChart
        data={multiSeriesData}
        type="bar"
        axes={{
          x: { title: 'Month' },
          y: { title: 'Financial Data' }
        }}
        styling={{
          legend: { show: true, position: 'top' }
        }}
        interactions={{
          tooltip: {
            enabled: true,
            customContent: customTooltipContent
          }
        }}
      />
    </div>
  </section> -->

  <!-- Disabled tooltip -->
  <!-- <section class="space-y-4">
    <h2 class="text-xl font-semibold">6. Disabled Tooltip</h2>
    <p class="text-muted-foreground">
      Chart with tooltip explicitly disabled.
    </p>
    <div class="h-[400px] border rounded-lg p-4">
      <UnifiedChart
        data={basicData}
        type="spline"
        axes={{
          x: { title: 'Month' },
          y: { title: 'Value' }
        }}
        interactions={{
          tooltip: {
            enabled: false
          }
        }}
      />
    </div>
  </section> -->

  <!-- Interactive controls example -->
  <!-- <section class="space-y-4">
    <h2 class="text-xl font-semibold">7. Chart with Controls and Tooltip</h2>
    <p class="text-muted-foreground">
      Full-featured chart with type selector, period controls, and tooltips.
    </p>
    <div class="h-[500px] border rounded-lg p-4">
      <UnifiedChart
        data={multiSeriesData}
        type="bar"
        axes={{
          x: { title: 'Period', rotateLabels: true },
          y: { title: 'Amount ($)', nice: true }
        }}
        styling={{
          legend: { show: true, position: 'top' },
          grid: { show: true, horizontal: true }
        }}
        interactions={{
          tooltip: {
            enabled: true,
            format: 'currency',
            showTotal: true,
            position: 'pointer',
            variant: 'default'
          }
        }}
        controls={{
          show: true,
          availableTypes: ['bar', 'line', 'area', 'spline'],
          allowTypeChange: true,
          allowColorChange: true,
          allowCurveChange: true
        }}
      />
    </div>
  </section> -->
</div>
