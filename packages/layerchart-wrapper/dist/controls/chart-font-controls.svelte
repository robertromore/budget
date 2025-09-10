<script lang="ts">
  import { PencilLine } from '@lucide/svelte';
  import * as Select from "bits-ui";
  import { Label, Switch } from "bits-ui";

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
    allowFontChange = true
  }: Props = $props();

  const fontSizeOptions = [
    { value: '0.625rem', label: 'Extra Small (10px)', size: '10px' },
    { value: '0.75rem', label: 'Small (12px)', size: '12px' },
    { value: '0.875rem', label: 'Medium (14px)', size: '14px' },
    { value: '1rem', label: 'Regular (16px)', size: '16px' },
    { value: '1.125rem', label: 'Large (18px)', size: '18px' }
  ];

  const formatOptions = [
    { value: 'default', label: 'Default' },
    { value: 'currency', label: 'Currency' },
    { value: 'percentage', label: 'Percentage' },
    { value: 'number', label: 'Number' },
    { value: 'compact', label: 'Compact' }
  ];

  const selectedFontSizeOption = $derived.by(() =>
    fontSizeOptions.find(option => option.value === axisFontSize) || fontSizeOptions[1]
  );

  const selectedYAxisFormatOption = $derived.by(() =>
    formatOptions.find(option => option.value === yAxisFormat) || formatOptions[1]
  );

  const selectedXAxisFormatOption = $derived.by(() =>
    formatOptions.find(option => option.value === xAxisFormat) || formatOptions[0]
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
        <Label class="text-sm text-muted-foreground">Font Size</Label>
        <Select.Root
          type="single"
          bind:value={axisFontSize}
        >
          <Select.Trigger class="w-full">
            {selectedFontSizeOption?.label || 'Select font size'}
          </Select.Trigger>
          <Select.Content>
            {#each fontSizeOptions as option}
              <Select.Item value={option.value}>
                <div class="flex items-center justify-between w-full">
                  <span>{option.label}</span>
                  <span
                    class="ml-2 text-muted-foreground font-mono"
                    style="font-size: {option.size};"
                  >
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
        <Label class="text-sm text-muted-foreground">Rotate X-Axis Labels</Label>
        <Switch bind:checked={rotateXLabels} />
      </div>

      <!-- Y-Axis Format -->
      <div class="space-y-2">
        <Label class="text-sm text-muted-foreground">Y-Axis Format</Label>
        <Select.Root
          type="single"
          bind:value={yAxisFormat}
        >
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
        <Label class="text-sm text-muted-foreground">X-Axis Format</Label>
        <Select.Root
          type="single"
          bind:value={xAxisFormat}
        >
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
