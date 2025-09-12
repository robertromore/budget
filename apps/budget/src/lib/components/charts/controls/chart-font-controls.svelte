<script lang="ts">
import {PencilLine} from '$lib/components/icons';
import {Label} from '$lib/components/ui/label';
import {Switch} from '$lib/components/ui/switch';
import * as Select from '$lib/components/ui/select';

interface Props {
  axisFontSize: string;
  rotateXLabels: boolean;
  xAxisFormat?: string;
  yAxisFormat?: string;
  allowFontChange?: boolean;
}

let {
  axisFontSize = $bindable('0.75rem'),
  rotateXLabels = $bindable(false),
  xAxisFormat = $bindable('default'),
  yAxisFormat = $bindable('currency'),
  allowFontChange = true,
}: Props = $props();

const fontSizeOptions = [
  {value: '0.625rem', label: 'Extra Small (10px)', size: '10px'},
  {value: '0.75rem', label: 'Small (12px)', size: '12px'},
  {value: '0.875rem', label: 'Medium (14px)', size: '14px'},
  {value: '1rem', label: 'Regular (16px)', size: '16px'},
  {value: '1.125rem', label: 'Large (18px)', size: '18px'},
];

const formatOptions = [
  {value: 'default', label: 'Default'},
  {value: 'currency', label: 'Currency'},
  {value: 'percentage', label: 'Percentage'},
  {value: 'number', label: 'Number'},
  {value: 'compact', label: 'Compact'},
];

const selectedFontSizeOption = $derived.by(
  () => fontSizeOptions.find((option) => option.value === axisFontSize) || fontSizeOptions[1]
);

const selectedYAxisFormatOption = $derived.by(
  () => formatOptions.find((option) => option.value === yAxisFormat) || formatOptions[1]
);

const selectedXAxisFormatOption = $derived.by(
  () => formatOptions.find((option) => option.value === xAxisFormat) || formatOptions[0]
);
</script>

{#if allowFontChange}
  <div class="space-y-3">
    <div class="flex items-center gap-2">
      <PencilLine class="h-4 w-4" />
      <Label class="text-sm font-medium">Axis Font Size</Label>
    </div>

    <div class="space-y-3 pl-6">
      <!-- Font Size Selection -->
      <div class="space-y-2">
        <Label class="text-muted-foreground text-sm">Font Size</Label>
        <Select.Root type="single" bind:value={axisFontSize}>
          <Select.Trigger class="w-full">
            {selectedFontSizeOption?.label || 'Select font size'}
          </Select.Trigger>
          <Select.Content>
            {#each fontSizeOptions as option}
              <Select.Item value={option.value}>
                <div class="flex w-full items-center justify-between">
                  <span>{option.label}</span>
                  <span
                    class="text-muted-foreground ml-2 font-mono"
                    style="font-size: {option.size};">
                    Aa
                  </span>
                </div>
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>

      <!-- X-Axis Label Rotation -->
      <div class="flex items-center justify-between">
        <Label class="text-muted-foreground text-sm">Rotate X-Axis Labels</Label>
        <Switch bind:checked={rotateXLabels} />
      </div>

      <!-- Y-Axis Format -->
      <div class="space-y-2">
        <Label class="text-muted-foreground text-sm">Y-Axis Format</Label>
        <Select.Root type="single" bind:value={yAxisFormat}>
          <Select.Trigger class="w-full">
            {selectedYAxisFormatOption?.label || 'Currency'}
          </Select.Trigger>
          <Select.Content>
            {#each formatOptions as option}
              <Select.Item value={option.value}>
                {option.label}
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>

      <!-- X-Axis Format -->
      <div class="space-y-2">
        <Label class="text-muted-foreground text-sm">X-Axis Format</Label>
        <Select.Root type="single" bind:value={xAxisFormat}>
          <Select.Trigger class="w-full">
            {selectedXAxisFormatOption?.label || 'Default'}
          </Select.Trigger>
          <Select.Content>
            {#each formatOptions as option}
              <Select.Item value={option.value}>
                {option.label}
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
    </div>
  </div>
{/if}
