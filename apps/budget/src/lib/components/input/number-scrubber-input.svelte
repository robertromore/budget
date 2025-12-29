<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import { cn } from '$lib/utils';
  import GripHorizontal from '@lucide/svelte/icons/grip-horizontal';

  interface Props {
    value: number;
    min?: number;
    max?: number;
    step?: number;
    class?: string;
    inputClass?: string;
    disabled?: boolean;
    id?: string;
    /** Optional function to format all displayed values (input, buttons, preview) */
    formatDisplay?: (value: number) => string;
  }

  let {
    value = $bindable(1),
    min = 1,
    max = 31,
    step = 1,
    class: className,
    inputClass,
    disabled = false,
    id,
    formatDisplay,
  }: Props = $props();

  // Helper to format a value - uses formatDisplay if provided
  function format(val: number): string {
    return formatDisplay ? formatDisplay(val) : String(val);
  }

  // State declarations (must come before derived that reference them)
  let containerRef: HTMLDivElement | null = $state(null);
  let inputRef: HTMLInputElement | null = $state(null);
  let scrubberRef: HTMLDivElement | null = $state(null);
  let isFocused = $state(false);
  let isDragging = $state(false);
  let activeValue = $state<number | null>(null);
  let containerWidth = $state(0);

  // Format the preview value
  const formattedPreview = $derived(activeValue !== null ? format(activeValue) : '');

  // Determine if preview needs wider display (for formatted values like "23rd")
  const previewIsWide = $derived(formattedPreview.length > 3);

  // Button width estimate based on formatted string length
  const PADDING = 8; // px-1 on each side

  // Calculate button width based on formatted string length
  const buttonWidth = $derived(() => {
    // Use the longest formatted value to determine button width
    const maxFormatted = format(max);
    const chars = maxFormatted.length;
    // Base width + extra per character (e.g., "31st" = 4 chars)
    return 10 + (chars * 6);
  });

  // Calculate how many buttons can fit
  const maxButtons = $derived(Math.max(2, Math.floor((containerWidth - PADDING) / buttonWidth())));

  // Generate the display numbers - stable count, but current value replaces nearest interval number
  const displayNumbers = $derived.by(() => {
    const totalRange = max - min + 1;

    // If all numbers fit, show them all
    if (totalRange <= maxButtons) {
      return Array.from({ length: totalRange }, (_, i) => min + i);
    }

    // Calculate interval to show roughly maxButtons numbers
    const interval = Math.ceil(totalRange / maxButtons);

    // Generate evenly spaced numbers
    const intervalNumbers: number[] = [];
    for (let n = min; n <= max; n += interval) {
      intervalNumbers.push(n);
    }

    // Always include max if not already there
    if (intervalNumbers[intervalNumbers.length - 1] !== max) {
      intervalNumbers.push(max);
    }

    // If current value is already in the interval set, return as-is
    if (intervalNumbers.includes(value)) {
      return intervalNumbers;
    }

    // Find the nearest interval number to the current value and replace it
    let nearestIndex = 0;
    let nearestDistance = Math.abs(intervalNumbers[0] - value);

    for (let i = 1; i < intervalNumbers.length; i++) {
      const distance = Math.abs(intervalNumbers[i] - value);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    // Replace the nearest number with the current value
    const result = [...intervalNumbers];
    result[nearestIndex] = value;
    return result;
  });

  // Track container width
  $effect(() => {
    if (!containerRef) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerWidth = entry.contentRect.width;
      }
    });

    observer.observe(containerRef);
    return () => observer.disconnect();
  });

  function handleFocus() {
    isFocused = true;
  }

  function handleBlur(e: FocusEvent) {
    // Don't blur if clicking on scrubber
    if (scrubberRef?.contains(e.relatedTarget as Node)) {
      return;
    }
    if (!isDragging) {
      isFocused = false;
    }
  }

  function calculateValueFromPosition(clientX: number): number {
    if (!scrubberRef) return value;

    const rect = scrubberRef.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    const rawValue = min + percent * (max - min);
    // Round to nearest step
    const steppedValue = Math.round(rawValue / step) * step;
    return Math.min(max, Math.max(min, steppedValue));
  }

  function handleScrubberInteraction(clientX: number) {
    const newValue = calculateValueFromPosition(clientX);
    activeValue = newValue;
    value = newValue;
  }

  function handleMouseDown(e: MouseEvent) {
    if (disabled) return;
    e.preventDefault();
    isDragging = true;
    handleScrubberInteraction(e.clientX);
  }

  function handleTouchStart(e: TouchEvent) {
    if (disabled) return;
    isDragging = true;
    handleScrubberInteraction(e.touches[0].clientX);
  }

  // Global listeners for drag
  $effect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        handleScrubberInteraction(e.clientX);
      };

      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        handleScrubberInteraction(e.touches[0].clientX);
      };

      const handleEnd = () => {
        isDragging = false;
        activeValue = null;
        // Keep focus on input after scrubbing
        inputRef?.focus();
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleEnd);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleEnd);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleEnd);
      };
    }
  });

  function handleNumberClick(num: number) {
    value = num;
    inputRef?.focus();
  }
</script>

<div bind:this={containerRef} class={cn('relative', className)}>
  <Input
    bind:ref={inputRef}
    {id}
    type="text"
    readonly
    {disabled}
    value={format(value)}
    onfocus={handleFocus}
    onblur={handleBlur}
    class={cn('cursor-pointer tabular-nums', inputClass)}
  />

  <!-- Horizontal number scrubber - only visible when focused -->
  {#if isFocused || isDragging}
    <div
      bind:this={scrubberRef}
      class="bg-muted/80 absolute left-0 right-0 top-full z-10 mt-1 touch-none select-none rounded-md px-1 py-1.5 backdrop-blur-sm"
      onmousedown={handleMouseDown}
      ontouchstart={handleTouchStart}
      role="slider"
      tabindex={-1}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
    >
      <div class="flex items-center justify-between">
        {#each displayNumbers as num}
          <button
            type="button"
            class={cn(
              'flex flex-1 items-center justify-center rounded py-0.5 text-[10px] font-medium transition-all',
              num === value
                ? 'bg-primary text-primary-foreground scale-110'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
            onclick={() => handleNumberClick(num)}
            tabindex={-1}
          >
            {format(num)}
          </button>
        {/each}
      </div>
      <!-- Drag indicator -->
      <div class="text-muted-foreground mt-0.5 flex cursor-ew-resize justify-center opacity-40 hover:opacity-60">
        <GripHorizontal class="size-3.5" />
      </div>
    </div>

    <!-- Active value indicator when dragging -->
    {#if isDragging && activeValue !== null}
      <div
        class={cn(
          'bg-primary text-primary-foreground pointer-events-none absolute left-1/2 top-full z-20 mt-14 flex h-10 -translate-x-1/2 items-center justify-center rounded-lg font-bold shadow-lg',
          previewIsWide ? 'min-w-20 px-3 text-sm' : 'w-10 text-lg'
        )}
      >
        {formattedPreview}
      </div>
    {/if}
  {/if}
</div>
