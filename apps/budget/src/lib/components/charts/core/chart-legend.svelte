<!--
  Chart Legend Component
  Phase 2C Refactoring: Reusable legend component with proper LayerChart integration
  
  This component provides a configurable legend for charts with support for:
  - Multiple spacing modes (normal, wide, compact)
  - Title support
  - Multi-series legends
  - All position options (top, bottom, left, right)
  - Click and hover events
  - Custom styling through classes
-->

<script lang="ts">
import {Legend} from 'layerchart';
import {scaleOrdinal} from 'd3-scale';

// Props interface following Svelte 5 patterns
interface ChartLegendProps {
  // Display control
  show: boolean;

  // Legend configuration
  title?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';

  // Data
  items: string[]; // Legend item labels
  colors: string[]; // Corresponding colors

  // Styling
  spacing?: 'normal' | 'wide' | 'compact';
  variant?: 'swatches' | 'ramp';
  swatchSize?: 'small' | 'medium' | 'large';
  fontSize?: 'xs' | 'sm' | 'base';

  // Events
  onItemClick?: (item: string, index: number) => void;
  onItemHover?: (item: string, index: number) => void;
  onItemLeave?: (item: string, index: number) => void;

  // Custom classes
  class?: string;
  itemClass?: string;
  swatchClass?: string;
}

let {
  show,
  title,
  position = 'top',
  items,
  colors,
  spacing = 'normal',
  variant = 'swatches',
  swatchSize = 'small',
  fontSize = 'sm',
  onItemClick,
  onItemHover,
  onItemLeave,
  class: className = '',
  itemClass = '',
  swatchClass = '',
}: ChartLegendProps = $props();

// Create ordinal scale for legend
const legendScale = $derived.by(() => {
  if (!items || items.length === 0 || !colors || colors.length === 0) {
    return null;
  }

  // Map items to colors
  const effectiveColors = colors.slice(0, items.length);
  while (effectiveColors.length < items.length) {
    // Cycle through colors if not enough
    const colorIndex = effectiveColors.length % colors.length;
    const color = colors[colorIndex];
    if (color) {
      effectiveColors.push(color);
    } else {
      // Fallback color if array is somehow empty
      effectiveColors.push('hsl(var(--chart-1))');
    }
  }

  return scaleOrdinal().domain(items).range(effectiveColors);
});

// Determine spacing classes
const spacingClasses = $derived.by(() => {
  switch (spacing) {
    case 'compact':
      return 'gap-x-2 gap-y-0.5';
    case 'wide':
      return 'gap-x-6 gap-y-2';
    case 'normal':
    default:
      return 'gap-x-4 gap-y-1';
  }
});

// Determine swatch size classes
const swatchSizeClasses = $derived.by(() => {
  switch (swatchSize) {
    case 'small':
      return 'size-3';
    case 'large':
      return 'size-5';
    case 'medium':
    default:
      return 'size-4';
  }
});

// Determine font size classes
const fontSizeClasses = $derived.by(() => {
  switch (fontSize) {
    case 'xs':
      return 'text-xs';
    case 'base':
      return 'text-base';
    case 'sm':
    default:
      return 'text-sm';
  }
});

// Determine position alignment classes
const positionClasses = $derived.by(() => {
  switch (position) {
    case 'left':
      return 'justify-start';
    case 'right':
      return 'justify-end';
    case 'bottom':
    case 'top':
    default:
      return 'justify-center';
  }
});

// Determine orientation based on position
const orientation = $derived.by(() => 
  position === 'left' || position === 'right' ? 'vertical' : 'horizontal'
);

// Handle item interactions
function handleItemClick(_: MouseEvent, detail: {value: any; color: string}) {
  const index = items.indexOf(detail.value);
  if (index >= 0 && onItemClick) {
    onItemClick(detail.value, index);
  }
}

function handleItemHover(_: MouseEvent, detail: {value: any; color: string}) {
  const index = items.indexOf(detail.value);
  if (index >= 0 && onItemHover) {
    onItemHover(detail.value, index);
  }
}

function handleItemLeave(_: MouseEvent, detail: {value: any; color: string}) {
  const index = items.indexOf(detail.value);
  if (index >= 0 && onItemLeave) {
    onItemLeave(detail.value, index);
  }
}

// Build custom classes for LayerChart Legend
const legendClasses = $derived.by(() => ({
  // Root class with position alignment
  root: `${positionClasses} ${className}`,
  // Items container with proper spacing
  items: `lc-legend-swatch-group ${spacingClasses}`,
  // Individual item styling
  item: `flex items-center gap-1.5 ${fontSizeClasses} ${itemClass}`,
  // Swatch styling
  swatch: `${swatchSizeClasses} rounded ${swatchClass}`,
  // Label styling
  label: fontSizeClasses,
}));
</script>

{#if show && legendScale && items.length > 0}
  <Legend
    scale={legendScale}
    {variant}
    placement={position}
    {orientation}
    {...title ? {title} : {}}
    onclick={handleItemClick}
    onpointerenter={handleItemHover}
    onpointerleave={handleItemLeave}
    classes={legendClasses} />
{/if}
