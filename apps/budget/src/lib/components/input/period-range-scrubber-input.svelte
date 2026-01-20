<script lang="ts">
  import { cn } from '$lib/utils';
  import { formatShortDate } from '$lib/utils/date-formatters';
  import GripHorizontal from '@lucide/svelte/icons/grip-horizontal';

  interface Props {
    /** Start day of year (1-366) */
    startDay: number;
    /** Number of days in the period */
    duration: number;
    min?: number;
    max?: number;
    class?: string;
    inputClass?: string;
    disabled?: boolean;
  }

  let {
    startDay = $bindable(1),
    duration = $bindable(30),
    min = 1,
    max = 366,
    class: className,
    inputClass,
    disabled = false,
  }: Props = $props();

  // State declarations
  let containerRef: HTMLDivElement | null = $state(null);
  let inputRef: HTMLButtonElement | null = $state(null);
  let scrubberRef: HTMLDivElement | null = $state(null);
  let isFocused = $state(false);
  let isDragging = $state(false);

  // Two-phase selection: 'idle' -> 'selecting-start' -> 'start-selected' -> 'selecting-duration' -> 'idle'
  let selectionPhase = $state<'idle' | 'selecting-start' | 'start-selected' | 'selecting-duration'>('idle');
  let tempStartDay = $state<number | null>(null);
  let tempDuration = $state<number | null>(null);

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
    return formatShortDate(date);
  }

  function formatDayOfYear(day: number): string {
    return formatDate(dayOfYearToDate(day));
  }

  // Current display values
  const displayStartDay = $derived(tempStartDay ?? startDay);
  const displayDuration = $derived(tempDuration ?? duration);
  const displayEndDay = $derived(displayStartDay + displayDuration - 1);

  // Preview text based on phase
  const previewText = $derived.by(() => {
    if (selectionPhase === 'selecting-start' || selectionPhase === 'start-selected') {
      return formatDayOfYear(displayStartDay);
    }
    if (selectionPhase === 'selecting-duration') {
      return `${formatDayOfYear(displayStartDay)} → ${formatDayOfYear(displayEndDay)}`;
    }
    return '';
  });

  // Instructions text based on phase
  const instructionText = $derived.by(() => {
    if (selectionPhase === 'idle') {
      return 'Click and drag to select start day';
    }
    if (selectionPhase === 'selecting-start') {
      return 'Release to set start day';
    }
    if (selectionPhase === 'start-selected') {
      return 'Drag again to select duration';
    }
    if (selectionPhase === 'selecting-duration') {
      return 'Release to set duration';
    }
    return '';
  });

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


  function calculateValueFromPosition(clientX: number, shiftKey: boolean, altKey: boolean): number {
    if (!scrubberRef) return min;

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
      dragStartValue = selectionPhase === 'selecting-start' ? (tempStartDay ?? startDay) : (tempDuration ?? duration);
      currentModifier = newModifier;
    }
  }

  function handleBlur(e: FocusEvent) {
    if (scrubberRef?.contains(e.relatedTarget as Node)) {
      return;
    }
    if (!isDragging && selectionPhase === 'idle') {
      isFocused = false;
    }
  }

  function handleMouseDown(e: MouseEvent) {
    if (disabled) return;
    e.preventDefault();
    isDragging = true;
    dragStartX = e.clientX;
    currentModifier = e.shiftKey ? 'shift' : e.altKey ? 'alt' : 'none';

    const day = calculateValueFromPosition(e.clientX, e.shiftKey, e.altKey);
    dragStartValue = day;

    if (selectionPhase === 'idle' || selectionPhase === 'selecting-start') {
      // Phase 1: Selecting start day
      selectionPhase = 'selecting-start';
      tempStartDay = day;
      tempDuration = duration; // Keep current duration
    } else if (selectionPhase === 'start-selected' || selectionPhase === 'selecting-duration') {
      // Phase 2: Selecting duration
      selectionPhase = 'selecting-duration';
      const endDay = day;
      const newDuration = Math.max(1, endDay - displayStartDay + 1);
      tempDuration = Math.min(max - displayStartDay + 1, newDuration);
    }
  }

  function handleTouchStart(e: TouchEvent) {
    if (disabled) return;
    isDragging = true;
    dragStartX = e.touches[0].clientX;
    currentModifier = 'none';

    const day = calculateValueFromPosition(e.touches[0].clientX, false, false);
    dragStartValue = day;

    if (selectionPhase === 'idle' || selectionPhase === 'selecting-start') {
      selectionPhase = 'selecting-start';
      tempStartDay = day;
      tempDuration = duration;
    } else if (selectionPhase === 'start-selected' || selectionPhase === 'selecting-duration') {
      selectionPhase = 'selecting-duration';
      const endDay = day;
      const newDuration = Math.max(1, endDay - displayStartDay + 1);
      tempDuration = Math.min(max - displayStartDay + 1, newDuration);
    }
  }

  function handleMove(clientX: number, shiftKey: boolean, altKey: boolean) {
    if (!isDragging) return;

    updateModifier(shiftKey, altKey);
    const day = calculateValueFromPosition(clientX, shiftKey, altKey);

    if (selectionPhase === 'selecting-start') {
      tempStartDay = day;
    } else if (selectionPhase === 'selecting-duration') {
      const endDay = day;
      const newDuration = Math.max(1, endDay - displayStartDay + 1);
      tempDuration = Math.min(max - displayStartDay + 1, newDuration);
    }
  }

  function handleEnd() {
    isDragging = false;
    currentModifier = 'none';

    if (selectionPhase === 'selecting-start') {
      // Commit start day, move to phase 2
      if (tempStartDay !== null) {
        startDay = tempStartDay;
      }
      selectionPhase = 'start-selected';
    } else if (selectionPhase === 'selecting-duration') {
      // Commit duration, complete selection
      if (tempDuration !== null) {
        duration = tempDuration;
      }
      selectionPhase = 'idle';
      tempStartDay = null;
      tempDuration = null;
    }
  }

  function handleMonthClick(monthIndex: number) {
    const monthStart = monthItems[monthIndex].dayOfYear;
    const monthEnd = monthIndex < 11 ? monthItems[monthIndex + 1].dayOfYear - 1 : 366;

    if (selectionPhase === 'idle' || selectionPhase === 'selecting-start') {
      // Clicking a month in start phase sets start day to first of that month
      startDay = monthStart;
      tempStartDay = monthStart;
      selectionPhase = 'start-selected';
    } else if (selectionPhase === 'start-selected' || selectionPhase === 'selecting-duration') {
      // Clicking a month in duration phase sets end day to end of that month
      const newDuration = Math.max(1, monthEnd - displayStartDay + 1);
      duration = Math.min(max - displayStartDay + 1, newDuration);
      tempDuration = duration;
      selectionPhase = 'idle';
      tempStartDay = null;
      tempDuration = null;
    }
    inputRef?.focus();
  }

  function handleReset() {
    selectionPhase = 'idle';
    tempStartDay = null;
    tempDuration = null;
  }

  // Global listeners for drag
  $effect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.shiftKey, e.altKey);
      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        handleMove(e.touches[0].clientX, false, false);
      };

      // Handle modifier key changes during drag
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Shift' || e.key === 'Alt') {
          dragStartX = 0;
          dragStartValue = selectionPhase === 'selecting-start' ? (tempStartDay ?? startDay) : (tempDuration ?? duration);
        }
      };

      const handleKeyUp = (e: KeyboardEvent) => {
        if (e.key === 'Shift' || e.key === 'Alt') {
          dragStartX = 0;
          dragStartValue = selectionPhase === 'selecting-start' ? (tempStartDay ?? startDay) : (tempDuration ?? duration);
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

  // Check if a month contains a specific day
  function monthContainsDay(monthIndex: number, day: number): boolean {
    const monthStart = monthItems[monthIndex].dayOfYear;
    const monthEnd = monthIndex < 11 ? monthItems[monthIndex + 1].dayOfYear - 1 : 366;
    return day >= monthStart && day <= monthEnd;
  }

  // Highlight style for months based on selection
  function getMonthStyle(monthIndex: number): string {
    const inStartSelectedPhase = selectionPhase === 'start-selected' || selectionPhase === 'selecting-start';
    const inDurationPhase = selectionPhase === 'selecting-duration';
    const inIdlePhase = selectionPhase === 'idle';

    const monthStart = monthItems[monthIndex].dayOfYear;
    const monthEnd = monthIndex < 11 ? monthItems[monthIndex + 1].dayOfYear - 1 : 366;

    // In start-selected phase, highlight the month containing the start day
    if (inStartSelectedPhase && monthContainsDay(monthIndex, displayStartDay)) {
      return 'bg-primary text-primary-foreground rounded';
    }

    // Determine which range values to use
    const rangeStart = inIdlePhase ? startDay : displayStartDay;
    const rangeEnd = inIdlePhase ? startDay + duration - 1 : displayEndDay;

    // Check if this month overlaps with the selected range (show in both idle and selecting-duration phases)
    const rangeOverlaps = (inDurationPhase || inIdlePhase) && monthStart <= rangeEnd && monthEnd >= rangeStart;

    if (!rangeOverlaps) {
      return 'text-muted-foreground hover:text-foreground hover:bg-muted rounded';
    }

    // Determine if this is the first or last month in the range
    const prevMonthEnd = monthIndex > 0 ? monthItems[monthIndex].dayOfYear - 1 : 0;
    const nextMonthStart = monthIndex < 11 ? monthItems[monthIndex + 1].dayOfYear : 367;

    const prevMonthInRange = monthIndex > 0 && prevMonthEnd >= rangeStart;
    const nextMonthInRange = monthIndex < 11 && nextMonthStart <= rangeEnd;

    const isFirstInRange = !prevMonthInRange;
    const isLastInRange = !nextMonthInRange;

    // Base styles for items in range
    let styles = 'bg-primary/30 text-foreground';

    if (isFirstInRange && isLastInRange) {
      styles += ' rounded';
    } else if (isFirstInRange) {
      styles += ' rounded-l rounded-r-none';
    } else if (isLastInRange) {
      styles += ' rounded-r rounded-l-none';
    } else {
      styles += ' rounded-none';
    }

    return styles;
  }
</script>

<div bind:this={containerRef} class={cn('relative', className)}>
  <!-- Clickable display showing formatted date range -->
  <button
    bind:this={inputRef}
    type="button"
    {disabled}
    onclick={() => { isFocused = true; }}
    onblur={handleBlur}
    class={cn(
      'border-input bg-background ring-offset-background flex h-9 w-full items-center justify-between rounded-md border px-3 py-2 text-sm',
      'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
      isFocused && 'ring-ring ring-2 ring-offset-2',
      inputClass
    )}
  >
    <span class="font-medium">
      {formatDayOfYear(startDay)} → {formatDayOfYear(startDay + duration - 1)}
    </span>
    <span class="text-muted-foreground text-xs">({duration} days)</span>
  </button>

  <!-- Scrubber - visible when focused -->
  {#if isFocused || isDragging || selectionPhase !== 'idle'}
    <div
      bind:this={scrubberRef}
      class="bg-muted/80 absolute left-0 right-0 top-full z-10 mt-1 touch-none select-none rounded-md px-1 py-1.5 backdrop-blur-sm"
      onmousedown={handleMouseDown}
      ontouchstart={handleTouchStart}
      role="slider"
      tabindex={-1}
      aria-valuenow={displayStartDay}
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

    <!-- Phase indicator, instructions, and modifier hints -->
    <div class="mt-1 text-center text-[10px]">
      <p class="text-muted-foreground">
        {instructionText}
        {#if selectionPhase === 'start-selected'}
          <button
            type="button"
            class="text-primary ml-1 underline"
            onclick={handleReset}
          >
            Reset
          </button>
        {/if}
        <span class="mx-1">&middot;</span>
        <kbd class="bg-muted rounded px-0.5">Shift</kbd> fine
        <span class="mx-0.5">&middot;</span>
        <kbd class="bg-muted rounded px-0.5">Alt</kbd> month
      </p>
    </div>

    <!-- Active preview when dragging or in selection -->
    {#if isDragging || selectionPhase !== 'idle'}
      <div
        class="bg-primary text-primary-foreground pointer-events-none absolute left-1/2 top-full z-20 mt-8 flex h-10 min-w-24 -translate-x-1/2 items-center justify-center rounded-lg px-3 text-sm font-bold shadow-lg"
      >
        {previewText}
        {#if selectionPhase === 'selecting-duration'}
          <span class="ml-2 text-xs font-normal opacity-80">({displayDuration}d)</span>
        {/if}
        {#if currentModifier !== 'none'}
          <span class="ml-1.5 text-[10px] font-normal opacity-70">
            {currentModifier === 'shift' ? '(fine)' : '(month)'}
          </span>
        {/if}
      </div>
    {/if}
  {/if}
</div>
