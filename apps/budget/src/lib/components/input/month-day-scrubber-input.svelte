<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import { cn } from '$lib/utils';
  import GripHorizontal from '@lucide/svelte/icons/grip-horizontal';

  interface Props {
    /** Day of year (1-366) */
    value: number;
    min?: number;
    max?: number;
    class?: string;
    inputClass?: string;
    disabled?: boolean;
    id?: string;
  }

  let {
    value = $bindable(1),
    min = 1,
    max = 366,
    class: className,
    inputClass,
    disabled = false,
    id,
  }: Props = $props();

  // State declarations
  let containerRef: HTMLDivElement | null = $state(null);
  let inputRef: HTMLInputElement | null = $state(null);
  let scrubberRef: HTMLDivElement | null = $state(null);
  let isFocused = $state(false);
  let isDragging = $state(false);
  let activeValue = $state<number | null>(null);

  // For relative dragging with modifiers
  let dragStartX = $state(0);
  let dragStartValue = $state(0);
  let currentModifier = $state<'none' | 'shift' | 'alt'>('none');

  // Helper to convert day-of-year to a formatted date string
  function dayOfYearToDate(dayOfYear: number, year?: number): Date {
    const y = year ?? new Date().getFullYear();
    const date = new Date(y, 0, 1);
    date.setDate(dayOfYear);
    return date;
  }

  function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function formatDayOfYear(day: number): string {
    return formatDate(dayOfYearToDate(day));
  }

  // Current display value
  const displayValue = $derived(activeValue ?? value);

  // Month data for the scrubber
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Calculate the first day of each month (day of year)
  function getFirstDayOfMonth(monthIndex: number): number {
    const year = new Date().getFullYear();
    const date = new Date(year, monthIndex, 1);
    const startOfYear = new Date(year, 0, 0);
    const diff = date.getTime() - startOfYear.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  // Generate month items with their day-of-year values
  const monthItems = $derived(
    months.map((label, index) => ({
      label,
      dayOfYear: getFirstDayOfMonth(index),
    }))
  );

  // Check if a month contains a specific day
  function monthContainsDay(monthIndex: number, day: number): boolean {
    const monthStart = monthItems[monthIndex].dayOfYear;
    const monthEnd = monthIndex < 11 ? monthItems[monthIndex + 1].dayOfYear - 1 : 366;
    return day >= monthStart && day <= monthEnd;
  }

  function handleFocus() {
    isFocused = true;
  }

  function handleBlur(e: FocusEvent) {
    if (scrubberRef?.contains(e.relatedTarget as Node)) {
      return;
    }
    if (!isDragging) {
      isFocused = false;
    }
  }

  function calculateValueFromPosition(clientX: number, shiftKey: boolean, altKey: boolean): number {
    if (!scrubberRef) return value;

    const rect = scrubberRef.getBoundingClientRect();

    if (shiftKey) {
      // Fine control: relative movement, 1 day per 5px
      const deltaX = clientX - dragStartX;
      const dayDelta = Math.round(deltaX / 5);
      return Math.round(Math.min(max, Math.max(min, dragStartValue + dayDelta)));
    }

    if (altKey) {
      // Coarse control: snap to month boundaries
      const x = clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      const targetDay = min + percent * (max - min);

      // Find the closest month start
      let closestMonth = monthItems[0].dayOfYear;
      for (const month of monthItems) {
        if (Math.abs(month.dayOfYear - targetDay) < Math.abs(closestMonth - targetDay)) {
          closestMonth = month.dayOfYear;
        }
      }
      return Math.round(Math.min(max, Math.max(min, closestMonth)));
    }

    // Normal: absolute position
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    const rawValue = min + percent * (max - min);
    return Math.round(Math.min(max, Math.max(min, rawValue)));
  }

  function updateModifier(shiftKey: boolean, altKey: boolean) {
    const newModifier = shiftKey ? 'shift' : altKey ? 'alt' : 'none';
    if (newModifier !== currentModifier) {
      // Reset drag start when modifier changes for smooth transition
      dragStartX = 0;
      dragStartValue = value;
      currentModifier = newModifier;
    }
  }

  function handleScrubberInteraction(clientX: number, shiftKey: boolean, altKey: boolean) {
    updateModifier(shiftKey, altKey);
    const newValue = calculateValueFromPosition(clientX, shiftKey, altKey);
    activeValue = newValue;
    value = newValue;
  }

  function handleMouseDown(e: MouseEvent) {
    if (disabled) return;
    e.preventDefault();
    isDragging = true;
    dragStartX = e.clientX;
    dragStartValue = value;
    currentModifier = e.shiftKey ? 'shift' : e.altKey ? 'alt' : 'none';
    handleScrubberInteraction(e.clientX, e.shiftKey, e.altKey);
  }

  function handleTouchStart(e: TouchEvent) {
    if (disabled) return;
    isDragging = true;
    dragStartX = e.touches[0].clientX;
    dragStartValue = value;
    currentModifier = 'none';
    handleScrubberInteraction(e.touches[0].clientX, false, false);
  }

  // Global listeners for drag
  $effect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        handleScrubberInteraction(e.clientX, e.shiftKey, e.altKey);
      };

      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        handleScrubberInteraction(e.touches[0].clientX, false, false);
      };

      const handleEnd = () => {
        isDragging = false;
        activeValue = null;
        currentModifier = 'none';
        inputRef?.focus();
      };

      // Handle modifier key changes during drag
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Shift' || e.key === 'Alt') {
          dragStartX = 0; // Will be set on next move
          dragStartValue = value;
        }
      };

      const handleKeyUp = (e: KeyboardEvent) => {
        if (e.key === 'Shift' || e.key === 'Alt') {
          dragStartX = 0;
          dragStartValue = value;
        }
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleEnd);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleEnd);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      };
    }
  });

  function handleMonthClick(monthIndex: number) {
    const monthStart = monthItems[monthIndex].dayOfYear;
    value = monthStart;
    inputRef?.focus();
  }

  // Highlight style for months based on selection
  function getMonthStyle(monthIndex: number): string {
    if (monthContainsDay(monthIndex, displayValue)) {
      return 'bg-primary text-primary-foreground scale-110 rounded';
    }
    return 'text-muted-foreground hover:text-foreground hover:bg-muted rounded';
  }
</script>

<div bind:this={containerRef} class={cn('relative', className)}>
  <Input
    bind:ref={inputRef}
    {id}
    type="text"
    readonly
    {disabled}
    value={formatDayOfYear(value)}
    onfocus={handleFocus}
    onblur={handleBlur}
    class={cn('cursor-pointer', inputClass)}
  />

  <!-- Month scrubber - visible when focused -->
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
        {#each monthItems as month, index}
          <button
            type="button"
            class={cn(
              'flex flex-1 items-center justify-center py-0.5 text-[10px] font-medium transition-all',
              getMonthStyle(index)
            )}
            onclick={() => handleMonthClick(index)}
            tabindex={-1}
          >
            {month.label}
          </button>
        {/each}
      </div>
      <!-- Drag indicator -->
      <div class="text-muted-foreground mt-0.5 flex cursor-ew-resize justify-center opacity-40 hover:opacity-60">
        <GripHorizontal class="size-3.5" />
      </div>
    </div>

    <!-- Instructions and modifier hint -->
    <p class="text-muted-foreground mt-1 text-center text-[10px]">
      Drag to select &middot;
      <kbd class="bg-muted rounded px-0.5">Shift</kbd> fine &middot;
      <kbd class="bg-muted rounded px-0.5">Alt</kbd> month
    </p>

    <!-- Active value indicator when dragging -->
    {#if isDragging && activeValue !== null}
      <div
        class="bg-primary text-primary-foreground pointer-events-none absolute left-1/2 top-full z-20 mt-12 flex h-10 min-w-20 -translate-x-1/2 items-center justify-center rounded-lg px-3 text-sm font-bold shadow-lg"
      >
        {formatDayOfYear(activeValue)}
        {#if currentModifier !== 'none'}
          <span class="ml-1.5 text-[10px] font-normal opacity-70">
            {currentModifier === 'shift' ? '(fine)' : '(month)'}
          </span>
        {/if}
      </div>
    {/if}
  {/if}
</div>
