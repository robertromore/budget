<script lang="ts">
import {ResponsiveSheet} from '$lib/components/ui/responsive-sheet';
import * as Collapsible from '$lib/components/ui/collapsible';
import * as Select from '$lib/components/ui/select';
import {Button, buttonVariants} from '$lib/components/ui/button';
import {Input} from '$lib/components/ui/input';
import {Label} from '$lib/components/ui/label';
import {Badge} from '$lib/components/ui/badge';
import {Slider} from '$lib/components/ui/slider';
import {Check, ChevronDown, Palette} from '@lucide/svelte/icons';
import {cn} from '$lib/utils';

interface Props {
  value?: string;
  placeholder?: string;
  class?: string;
  onchange?: (event: CustomEvent<{value: string}>) => void;
}

let {value = '', placeholder = 'Select a color', class: className = '', onchange}: Props = $props();

let open = $state(false);
let advancedOpen = $state(false);
let customInput = $state(value || '#000000');
let colorFormat = $state<string>('hex');

// Advanced color picker state
let hue = $state(0);
let saturation = $state(100);
let lightness = $state(50);
let red = $state(0);
let green = $state(0);
let blue = $state(0);
let alpha = $state(100);

// Predefined color palette (ordered by ROYGBIV - 24 shades each)
const colorPalette = [
  // Red shades (24)
  '#fee2e2',
  '#fecaca',
  '#fca5a5',
  '#f87171',
  '#ef4444',
  '#dc2626',
  '#b91c1c',
  '#991b1b',
  '#7f1d1d',
  '#fee',
  '#fdd',
  '#fbb',
  '#f88',
  '#e55',
  '#c33',
  '#a11',
  '#800',
  '#600',
  '#f43f5e',
  '#be123c',
  '#881337',
  '#9f1239',
  '#ff0000',
  '#8b0000',

  // Orange shades (24)
  '#ffedd5',
  '#fed7aa',
  '#fdba74',
  '#fb923c',
  '#f97316',
  '#ea580c',
  '#c2410c',
  '#9a3412',
  '#7c2d12',
  '#ffe',
  '#fdc',
  '#fba',
  '#f97',
  '#e75',
  '#c52',
  '#a30',
  '#810',
  '#600',
  '#ff8c00',
  '#ff7f50',
  '#ff6347',
  '#ff4500',
  '#d2691e',
  '#a0522d',

  // Yellow shades (24)
  '#fef3c7',
  '#fde68a',
  '#fcd34d',
  '#fbbf24',
  '#f59e0b',
  '#d97706',
  '#b45309',
  '#92400e',
  '#78350f',
  '#ffc',
  '#ffb',
  '#ff9',
  '#f80',
  '#e70',
  '#c60',
  '#a50',
  '#840',
  '#630',
  '#ffff00',
  '#ffd700',
  '#ffec8b',
  '#eedd82',
  '#daa520',
  '#b8860b',

  // Green shades (24)
  '#d1fae5',
  '#a7f3d0',
  '#6ee7b7',
  '#34d399',
  '#10b981',
  '#059669',
  '#047857',
  '#065f46',
  '#064e3b',
  '#dfd',
  '#bfb',
  '#9f9',
  '#7d7',
  '#5b5',
  '#393',
  '#171',
  '#050',
  '#030',
  '#00ff00',
  '#00ff7f',
  '#32cd32',
  '#228b22',
  '#008000',
  '#006400',

  // Blue shades (24)
  '#dbeafe',
  '#bfdbfe',
  '#93c5fd',
  '#60a5fa',
  '#3b82f6',
  '#2563eb',
  '#1d4ed8',
  '#1e40af',
  '#1e3a8a',
  '#ddf',
  '#bbf',
  '#99f',
  '#77f',
  '#55f',
  '#33e',
  '#11c',
  '#009',
  '#007',
  '#0000ff',
  '#4169e1',
  '#1e90ff',
  '#00bfff',
  '#0080ff',
  '#0066cc',

  // Indigo/Cyan shades (24)
  '#e0e7ff',
  '#c7d2fe',
  '#a5b4fc',
  '#818cf8',
  '#6366f1',
  '#4f46e5',
  '#4338ca',
  '#3730a3',
  '#312e81',
  '#eef',
  '#ddf',
  '#ccf',
  '#aaf',
  '#88f',
  '#66e',
  '#44c',
  '#22a',
  '#008',
  '#00ffff',
  '#00e5ee',
  '#00ced1',
  '#20b2aa',
  '#5f9ea0',
  '#008b8b',

  // Violet/Purple shades (24)
  '#ede9fe',
  '#ddd6fe',
  '#c4b5fd',
  '#a78bfa',
  '#8b5cf6',
  '#7c3aed',
  '#6d28d9',
  '#5b21b6',
  '#4c1d95',
  '#fef',
  '#ede',
  '#dcd',
  '#cac',
  '#b9b',
  '#a8a',
  '#979',
  '#868',
  '#757',
  '#ff00ff',
  '#ee82ee',
  '#da70d6',
  '#ba55d3',
  '#9370db',
  '#8b008b',

  // Pink shades (24)
  '#fce7f3',
  '#fbcfe8',
  '#f9a8d4',
  '#f472b6',
  '#ec4899',
  '#db2777',
  '#be185d',
  '#9f1239',
  '#831843',
  '#ffe',
  '#fcd',
  '#fab',
  '#f89',
  '#e67',
  '#d45',
  '#c23',
  '#a01',
  '#800',
  '#ffc0cb',
  '#ffb6c1',
  '#ff69b4',
  '#ff1493',
  '#db7093',
  '#c71585',

  // Teal/Turquoise shades (24)
  '#ccfbf1',
  '#99f6e4',
  '#5eead4',
  '#2dd4bf',
  '#14b8a6',
  '#0d9488',
  '#0f766e',
  '#115e59',
  '#134e4a',
  '#cff',
  '#aee',
  '#8dd',
  '#6cc',
  '#4bb',
  '#2aa',
  '#099',
  '#088',
  '#077',
  '#40e0d0',
  '#48d1cc',
  '#00ced1',
  '#20b2aa',
  '#008b8b',
  '#00868b',

  // Neutral grays (24)
  '#ffffff',
  '#fafafa',
  '#f5f5f5',
  '#f0f0f0',
  '#e5e5e5',
  '#d4d4d4',
  '#a3a3a3',
  '#737373',
  '#525252',
  '#404040',
  '#262626',
  '#171717',
  '#000000',
  '#f3f4f6',
  '#e5e7eb',
  '#d1d5db',
  '#9ca3af',
  '#6b7280',
  '#4b5563',
  '#374151',
  '#1f2937',
  '#111827',
  '#0f172a',
  '#030712',
];

function handleColorSelect(color: string) {
  const normalized = normalizeHexColor(color);
  if (onchange) {
    const event = new CustomEvent('change', {detail: {value: normalized}});
    onchange(event);
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
    if (onchange) {
      const changeEvent = new CustomEvent('change', {detail: {value: color}});
      onchange(changeEvent);
    }
  }
}

function handleClear() {
  if (onchange) {
    const event = new CustomEvent('change', {detail: {value: ''}});
    onchange(event);
  }
  open = false;
}

function handleAdvancedColorChange(color: string) {
  if (onchange) {
    const event = new CustomEvent('change', {detail: {value: color}});
    onchange(event);
  }
}

function handleHslChange() {
  const rgb = hslToRgb(hue, saturation, lightness);
  red = rgb.r;
  green = rgb.g;
  blue = rgb.b;
}

// Update custom input when value changes externally
$effect(() => {
  if (value && isValidHexColor(value) && value !== customInput) {
    customInput = value;
    initializeFromHex(value);
  } else if (!value) {
    customInput = '#000000';
    initializeFromHex('#000000');
  }
});

// Initialize with default color
$effect(() => {
  if (customInput && isValidHexColor(customInput)) {
    initializeFromHex(customInput);
  }
});

// React to RGB changes and update hex output and HSL
$effect(() => {
  const hex = rgbToHex(red, green, blue);
  customInput = hex;

  // Update HSL to match RGB
  const hsl = rgbToHsl(red, green, blue);
  hue = hsl.h;
  saturation = hsl.s;
  lightness = hsl.l;

  // Only trigger change event if the user is actively changing colors
  if (open) {
    handleAdvancedColorChange(hex);
  }
});

// Color conversion utilities
function hexToRgb(hex: string): {r: number; g: number; b: number} | null {
  // Normalize 3-digit hex to 6-digit
  const normalized = normalizeHexColor(hex);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalized);
  return result && result[1] && result[2] && result[3]
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function rgbToHsl(r: number, g: number, b: number): {h: number; s: number; l: number} {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100)};
}

function hslToRgb(h: number, s: number, l: number): {r: number; g: number; b: number} {
  h = h / 360;
  s = s / 100;
  l = l / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

function formatColorValue(format: string): string {
  const rgb = {r: red, g: green, b: blue};
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
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
}

function normalizeHexColor(color: string): string {
  // Convert 3-digit hex to 6-digit hex
  if (/^#[0-9A-Fa-f]{3}$/.test(color)) {
    return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
  }
  return color;
}
</script>

<ResponsiveSheet bind:open class={className}>
  {#snippet trigger()}
    <div class={cn(buttonVariants({variant: 'outline'}), 'justify-start')}>
      <div class="flex items-center gap-2">
        {#if value && isValidHexColor(value)}
          <div
            class="border-border h-5 w-5 shrink-0 rounded-md border"
            style="background-color: {value}">
          </div>
          <span class="font-mono text-sm uppercase">{value}</span>
        {:else}
          <Palette class="text-muted-foreground h-4 w-4" />
          <span class="text-muted-foreground">{placeholder}</span>
        {/if}
      </div>
    </div>
  {/snippet}

  {#snippet header()}
    <h2 class="text-lg font-semibold">Color Picker</h2>
    <p class="text-muted-foreground text-sm">Choose a color or enter a custom value</p>
  {/snippet}

  {#snippet content()}
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
            class="font-mono" />
          <input
            type="color"
            value={customInput}
            oninput={handleCustomColorChange}
            class="-mt-0.5 size-10 cursor-pointer" />
        </div>
        {#if customInput && !isValidHexColor(customInput)}
          <p class="text-destructive text-xs">Please enter a valid hex color (e.g., #3b82f6)</p>
        {/if}
      </div>

      <!-- Color Palette -->
      <div class="space-y-2">
        <Label class="text-sm font-medium">Color Palette</Label>
        <div class="grid grid-cols-24">
          {#each colorPalette as color}
            <Button
              variant="ghost"
              size="sm"
              class="relative size-6 rounded-none p-0 transition-transform hover:scale-110"
              onclick={() => handleColorSelect(color)}
              title={color}>
              <div class="border-border h-full w-full border" style="background-color: {color}">
              </div>
              {#if value === color}
                <div class="absolute inset-0 flex items-center justify-center">
                  <Check class="h-4 w-4 text-white drop-shadow-sm" />
                </div>
              {/if}
            </Button>
          {/each}
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="flex justify-between border-t pt-2">
        <Badge variant="outline" class="text-xs">
          {colorPalette.length} preset colors
        </Badge>
        {#if value}
          <Button
            variant="ghost"
            size="sm"
            onclick={handleClear}
            class="text-muted-foreground hover:text-foreground text-xs">
            Clear
          </Button>
        {/if}
      </div>

      <!-- Advanced Options Collapsible -->
      <Collapsible.Root bind:open={advancedOpen}>
        <div class="border-t pt-4">
          <Collapsible.Trigger class="flex w-full items-center justify-between">
            <span class="text-sm font-medium">Advanced Options</span>
            <ChevronDown
              class="h-4 w-4 transition-transform duration-200 {advancedOpen
                ? 'rotate-180'
                : ''}" />
          </Collapsible.Trigger>
        </div>

        <Collapsible.Content class="space-y-4 pt-4">
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
                class="border-border size-12 rounded-md border"
                style="background-color: {rgbToHex(red, green, blue)}">
              </div>
              <div class="flex-1">
                <Input value={formatColorValue(colorFormat)} readonly class="font-mono text-sm" />
              </div>
            </div>
          </div>

          <!-- HSL Sliders -->
          <div class="space-y-3">
            <Label class="text-sm font-medium">HSL</Label>
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground text-xs">Hue</span>
                <span class="font-mono text-xs">{hue}°</span>
              </div>
              <Slider
                bind:value={hue}
                type="single"
                max={360}
                step={1}
                onValueChange={handleHslChange} />
            </div>
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground text-xs">Saturation</span>
                <span class="font-mono text-xs">{saturation}%</span>
              </div>
              <Slider
                bind:value={saturation}
                type="single"
                max={100}
                step={1}
                onValueChange={handleHslChange} />
            </div>
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground text-xs">Lightness</span>
                <span class="font-mono text-xs">{lightness}%</span>
              </div>
              <Slider
                bind:value={lightness}
                type="single"
                max={100}
                step={1}
                onValueChange={handleHslChange} />
            </div>
          </div>

          <!-- RGB Sliders -->
          <div class="space-y-3">
            <Label class="text-sm font-medium">RGB</Label>
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground text-xs">Red</span>
                <span class="font-mono text-xs">{red}</span>
              </div>
              <Slider bind:value={red} type="single" max={255} step={1} />
            </div>
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground text-xs">Green</span>
                <span class="font-mono text-xs">{green}</span>
              </div>
              <Slider bind:value={green} type="single" max={255} step={1} />
            </div>
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground text-xs">Blue</span>
                <span class="font-mono text-xs">{blue}</span>
              </div>
              <Slider bind:value={blue} type="single" max={255} step={1} />
            </div>
          </div>

          <!-- Alpha Slider -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground text-xs">Alpha</span>
              <span class="font-mono text-xs">{alpha}%</span>
            </div>
            <Slider bind:value={alpha} type="single" max={100} step={1} />
          </div>
        </Collapsible.Content>
      </Collapsible.Root>
    </div>
  {/snippet}
</ResponsiveSheet>
