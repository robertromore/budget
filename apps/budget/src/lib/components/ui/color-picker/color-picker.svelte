<script lang="ts">
  import { ColorSheet } from '$lib/components/ui/color-sheet';
  import * as Select from '$lib/components/ui/select';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Badge } from '$lib/components/ui/badge';
  import { Slider } from '$lib/components/ui/slider';
  import { Check, Settings } from '@lucide/svelte/icons';

  interface Props {
    value?: string;
    placeholder?: string;
    disabled?: boolean;
    class?: string;
    onchange?: (event: CustomEvent<{ value: string }>) => void;
  }

  let {
    value = '',
    placeholder = 'Select a color',
    disabled = false,
    class: className = '',
    onchange
  }: Props = $props();

  let open = $state(false);
  let customInput = $state(value || '#000000');
  let colorFormat = $state('hex');
  let sheetRef: any;

  // Advanced color picker state
  let hue = $state(0);
  let saturation = $state(100);
  let lightness = $state(50);
  let red = $state(0);
  let green = $state(0);
  let blue = $state(0);
  let alpha = $state(100);


  // Predefined color palette
  const colorPalette = [
    // Primary colors
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
    '#06b6d4', '#84cc16', '#f97316', '#6366f1',

    // Darker variants
    '#1e40af', '#dc2626', '#059669', '#d97706', '#7c3aed', '#db2777',
    '#0891b2', '#65a30d', '#ea580c', '#4f46e5',

    // Lighter variants
    '#60a5fa', '#f87171', '#34d399', '#fbbf24', '#a78bfa', '#f472b6',
    '#22d3ee', '#a3e635', '#fb923c', '#818cf8',

    // Neutral colors
    '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6',
    '#111827', '#1f2937', '#4b5563', '#d6d3d1', '#a8a29e', '#78716c'
  ];


  function handleColorSelect(color: string) {
    if (sheetRef?.handleColorChange) {
      sheetRef.handleColorChange(color);
    }
    open = false;
  }

  function handleCustomColorChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const color = target.value;
    customInput = color;

    // Validate hex color format and update advanced picker
    if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
      initializeFromHex(color);
      if (sheetRef?.handleColorChange) {
        sheetRef.handleColorChange(color);
      }
    }
  }

  function handleClear() {
    if (sheetRef?.handleColorChange) {
      sheetRef.handleColorChange('');
    }
    open = false;
  }

  function handleAdvancedColorChange(color: string) {
    if (sheetRef?.handleColorChange) {
      sheetRef.handleColorChange(color);
    }
  }

  // Update custom input when value changes externally
  $effect(() => {
    if (value && isValidHexColor(value)) {
      customInput = value;
      initializeFromHex(value);
    }
  });

  // Initialize with default color
  $effect(() => {
    if (customInput && isValidHexColor(customInput)) {
      initializeFromHex(customInput);
    }
  });

  // React to color changes and update hex output
  $effect(() => {
    const hex = rgbToHex(red, green, blue);
    customInput = hex;
    // Only trigger change event if the user is actively changing colors
    if (open) {
      handleAdvancedColorChange(hex);
    }
  });

  // Color conversion utilities
  function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result && result[1] && result[2] && result[3] ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  function rgbToHex(r: number, g: number, b: number): string {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }


  function formatColorValue(format: string): string {
    const rgb = { r: red, g: green, b: blue };
    const hsl = rgbToHsl(red, green, blue);

    switch (format) {
      case 'hex':
        return rgbToHex(rgb.r, rgb.g, rgb.b);
      case 'rgb':
        return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
      case 'rgba':
        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha / 100})`;
      case 'hsl':
        return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
      case 'hsla':
        return `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${alpha / 100})`;
      default:
        return rgbToHex(rgb.r, rgb.g, rgb.b);
    }
  }

  // Initialize color values from hex input
  function initializeFromHex(hex: string) {
    const rgb = hexToRgb(hex);
    if (rgb) {
      red = rgb.r;
      green = rgb.g;
      blue = rgb.b;
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      hue = hsl.h;
      saturation = hsl.s;
      lightness = hsl.l;
    }
  }


  function isValidHexColor(color: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  }
</script>

<ColorSheet
  bind:this={sheetRef}
  {value}
  {placeholder}
  {disabled}
  bind:open
  {onchange}
  class={className}
>
  {#snippet basicContent()}
    <div class="space-y-4">
        <!-- Custom Color Input -->
        <div class="space-y-2">
          <Label for="custom-color" class="text-sm font-medium">Custom Color</Label>
          <div class="flex gap-2">
            <Input
              id="custom-color"
              type="text"
              value={customInput}
              oninput={handleCustomColorChange}
              placeholder="#000000"
              class="font-mono"
            />
            <input
              type="color"
              value={customInput}
              oninput={handleCustomColorChange}
              class="w-10 h-10 rounded-md border border-border cursor-pointer"
            />
          </div>
          {#if customInput && !isValidHexColor(customInput)}
            <p class="text-xs text-destructive">Please enter a valid hex color (e.g., #3b82f6)</p>
          {/if}
        </div>

        <!-- Color Palette -->
        <div class="space-y-2">
          <Label class="text-sm font-medium">Color Palette</Label>
          <div class="grid grid-cols-8 gap-2">
            {#each colorPalette as color}
              <Button
                variant="ghost"
                size="sm"
                class="h-8 w-8 p-0 relative hover:scale-110 transition-transform"
                onclick={() => handleColorSelect(color)}
                title={color}
              >
                <div
                  class="h-6 w-6 rounded-md border border-border"
                  style="background-color: {color}"
                ></div>
                {#if value === color}
                  <div class="absolute inset-0 flex items-center justify-center">
                    <Check class="h-3 w-3 text-white drop-shadow-sm" />
                  </div>
                {/if}
              </Button>
            {/each}
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="flex justify-between pt-2 border-t">
          <Badge variant="outline" class="text-xs">
            {colorPalette.length} preset colors
          </Badge>
          {#if value}
            <Button
              variant="ghost"
              size="sm"
              onclick={handleClear}
              class="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </Button>
          {/if}
        </div>

        <!-- Navigation to Advanced -->
        <div class="flex justify-center pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onclick={() => sheetRef?.showAdvanced()}
            class="flex items-center gap-2"
          >
            <Settings class="h-4 w-4" />
            Advanced Options
          </Button>
        </div>
      </div>
    {/snippet}

    {#snippet advancedContent()}
      <div class="space-y-4">
        <!-- Color Format Selector -->
        <div class="space-y-2">
          <Label class="text-sm font-medium">Format</Label>
          <Select.Root type="single" bind:value={colorFormat}>
            <Select.Trigger class="w-full">
              <span class="text-sm">{colorFormat.toUpperCase()}</span>
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="hex">HEX</Select.Item>
              <Select.Item value="rgb">RGB</Select.Item>
              <Select.Item value="rgba">RGBA</Select.Item>
              <Select.Item value="hsl">HSL</Select.Item>
              <Select.Item value="hsla">HSLA</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>

        <!-- Color Preview -->
        <div class="space-y-2">
          <Label class="text-sm font-medium">Preview</Label>
          <div class="flex items-center gap-3">
            <div
              class="h-12 w-12 rounded-md border border-border"
              style="background-color: {rgbToHex(red, green, blue)}"
            ></div>
            <div class="flex-1">
              <Input
                value={formatColorValue(colorFormat)}
                readonly
                class="font-mono text-sm"
              />
            </div>
          </div>
        </div>

        <!-- HSL Sliders -->
        <div class="space-y-3">
          <Label class="text-sm font-medium">HSL</Label>
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted-foreground">Hue</span>
              <span class="text-xs font-mono">{hue}°</span>
            </div>
            <Slider
              bind:value={hue}
              type="single"
              max={360}
              step={1}
            />
          </div>
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted-foreground">Saturation</span>
              <span class="text-xs font-mono">{saturation}%</span>
            </div>
            <Slider
              bind:value={saturation}
              type="single"
              max={100}
              step={1}
            />
          </div>
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted-foreground">Lightness</span>
              <span class="text-xs font-mono">{lightness}%</span>
            </div>
            <Slider
              bind:value={lightness}
              type="single"
              max={100}
              step={1}
            />
          </div>
        </div>

        <!-- RGB Sliders -->
        <div class="space-y-3">
          <Label class="text-sm font-medium">RGB</Label>
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted-foreground">Red</span>
              <span class="text-xs font-mono">{red}</span>
            </div>
            <Slider
              bind:value={red}
              type="single"
              max={255}
              step={1}
            />
          </div>
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted-foreground">Green</span>
              <span class="text-xs font-mono">{green}</span>
            </div>
            <Slider
              bind:value={green}
              type="single"
              max={255}
              step={1}
            />
          </div>
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted-foreground">Blue</span>
              <span class="text-xs font-mono">{blue}</span>
            </div>
            <Slider
              bind:value={blue}
              type="single"
              max={255}
              step={1}
            />
          </div>
        </div>

        <!-- Alpha Slider -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted-foreground">Alpha</span>
            <span class="text-xs font-mono">{alpha}%</span>
          </div>
          <Slider
            bind:value={alpha}
            type="single"
            max={100}
            step={1}
          />
        </div>
      </div>
    {/snippet}
</ColorSheet>