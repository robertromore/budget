<script lang="ts">
  import * as Select from '$lib/components/ui/select';

  interface CurveOption {
    value: string;
    label: string;
    description: string;
  }

  interface Props {
    curve: string;
    chartType: string;
  }

  let { curve = $bindable('curveLinear'), chartType }: Props = $props();

  // Available curve options for line/spline charts
  const curveOptions: CurveOption[] = [
    {
      value: 'curveLinear',
      label: 'Linear',
      description: 'Straight lines between points'
    },
    {
      value: 'curveMonotoneX',
      label: 'Smooth',
      description: 'Smooth monotonic curves'
    },
    {
      value: 'curveCardinal',
      label: 'Cardinal',
      description: 'Smooth cardinal splines'
    },
    {
      value: 'curveCatmullRom',
      label: 'Catmull-Rom',
      description: 'Catmull-Rom splines'
    },
    {
      value: 'curveNatural',
      label: 'Natural',
      description: 'Natural cubic splines'
    },
    {
      value: 'curveBasis',
      label: 'Basis',
      description: 'B-spline curves'
    },
    {
      value: 'curveStep',
      label: 'Step',
      description: 'Step function'
    }
  ];

  // Only show curve selector for line/spline charts
  const showCurveSelector = $derived(['line', 'spline', 'area'].includes(chartType));
  const selectedCurveOption = $derived.by(() =>
    curveOptions.find(option => option.value === curve) || curveOptions[0]
  );
</script>

{#if showCurveSelector}
  <div class="flex items-center gap-2">
    <label for="curve-selector" class="text-sm font-medium">Curve:</label>
    <Select.Root type="single" bind:value={curve}>
      <Select.Trigger class="w-[140px]">
        <div class="flex items-center gap-2">
          <span>{selectedCurveOption.label}</span>
        </div>
      </Select.Trigger>
      <Select.Content>
        {#each curveOptions as curveOption}
          <Select.Item value={curveOption.value}>
            <div class="flex flex-col">
              <span>{curveOption.label}</span>
              <span class="text-xs text-muted-foreground">{curveOption.description}</span>
            </div>
          </Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
  </div>
{/if}
