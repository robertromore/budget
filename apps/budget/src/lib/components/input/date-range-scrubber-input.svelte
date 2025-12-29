<script lang="ts">
  import { cn } from '$lib/utils';
  import GripHorizontal from '@lucide/svelte/icons/grip-horizontal';

  interface Props {
    /** Start day of year (1-366) */
    startDay: number;
    /** Number of days in the period */
    duration: number;
    min?: number;
    max?: number;
    class?: string;
    disabled?: boolean;
  }

  let {
    startDay = $bindable(1),
    duration = $bindable(30),
    min = 1,
    max = 366,
    class: className,
    disabled = false,
  }: Props = $props();

  let scrubberRef: HTMLDivElement | null = $state(null);
  let isDragging = $state(false);
  let dragPhase = $state<'start' | 'range'>('start');
  let tempStartDay = $state<number | null>(null);
  let tempEndDay = $state<number | null>(null);

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

  // Current display values
  const displayStartDay = $derived(tempStartDay ?? startDay);
  const displayEndDay = $derived(tempEndDay ?? startDay + duration - 1);
  const displayDuration = $derived(displayEndDay - displayStartDay + 1);

  // Preview text
  const previewText = $derived(
    `${formatDayOfYear(displayStartDay)} → ${formatDayOfYear(displayEndDay)}`
  );

  // Calculate position percentages for the range highlight
  const rangeStartPercent = $derived(((displayStartDay - min) / (max - min)) * 100);
  const rangeEndPercent = $derived(((displayEndDay - min) / (max - min)) * 100);

  function calculateDayFromPosition(clientX: number): number {
    if (!scrubberRef) return min;
    const rect = scrubberRef.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    const rawDay = min + percent * (max - min);
    return Math.round(Math.min(max, Math.max(min, rawDay)));
  }

  function handleMouseDown(e: MouseEvent) {
    if (disabled) return;
    e.preventDefault();
    isDragging = true;
    dragPhase = 'start';
    const day = calculateDayFromPosition(e.clientX);
    tempStartDay = day;
    tempEndDay = day;
  }

  function handleTouchStart(e: TouchEvent) {
    if (disabled) return;
    isDragging = true;
    dragPhase = 'start';
    const day = calculateDayFromPosition(e.touches[0].clientX);
    tempStartDay = day;
    tempEndDay = day;
  }

  function handleMove(clientX: number) {
    if (!isDragging || tempStartDay === null) return;

    const day = calculateDayFromPosition(clientX);

    // Once we start moving, we're in range mode
    if (day !== tempStartDay) {
      dragPhase = 'range';
    }

    // Allow dragging in either direction
    if (day >= tempStartDay) {
      tempEndDay = day;
    } else {
      // If dragging backwards, swap start and end
      tempEndDay = tempStartDay;
      tempStartDay = day;
    }
  }

  function handleEnd() {
    if (tempStartDay !== null && tempEndDay !== null) {
      startDay = Math.min(tempStartDay, tempEndDay);
      const end = Math.max(tempStartDay, tempEndDay);
      duration = end - startDay + 1;
    }
    isDragging = false;
    dragPhase = 'start';
    tempStartDay = null;
    tempEndDay = null;
  }

  // Global listeners for drag
  $effect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        handleMove(e.touches[0].clientX);
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

  // Generate month labels for the scrubber
  const monthLabels = $derived.by(() => {
    const labels: { month: string; position: number }[] = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let m = 0; m < 12; m++) {
      const firstDayOfMonth = new Date(new Date().getFullYear(), m, 1);
      const dayOfYear = Math.ceil((firstDayOfMonth.getTime() - new Date(firstDayOfMonth.getFullYear(), 0, 0).getTime()) / 86400000);
      const position = ((dayOfYear - min) / (max - min)) * 100;
      if (position >= 0 && position <= 100) {
        labels.push({ month: months[m], position });
      }
    }
    return labels;
  });
</script>

<div class={cn('relative', className)}>
  <!-- Current selection display -->
  <div class="bg-muted mb-2 flex items-center justify-between rounded-md px-3 py-2 text-sm">
    <span class="text-muted-foreground">Period:</span>
    <span class="font-medium">
      {formatDayOfYear(startDay)} → {formatDayOfYear(startDay + duration - 1)}
      <span class="text-muted-foreground ml-1">({duration} days)</span>
    </span>
  </div>

  <!-- Range scrubber -->
  <div
    bind:this={scrubberRef}
    class="bg-muted/60 relative h-12 touch-none select-none rounded-lg"
    class:cursor-ew-resize={!disabled}
    class:opacity-50={disabled}
    onmousedown={handleMouseDown}
    ontouchstart={handleTouchStart}
    role="slider"
    tabindex={disabled ? -1 : 0}
    aria-valuenow={startDay}
    aria-valuemin={min}
    aria-valuemax={max}
    aria-label="Select date range"
  >
    <!-- Month labels -->
    <div class="absolute inset-x-0 top-1 flex">
      {#each monthLabels as { month, position }}
        <span
          class="text-muted-foreground/60 absolute -translate-x-1/2 text-[9px]"
          style="left: {position}%"
        >
          {month}
        </span>
      {/each}
    </div>

    <!-- Range highlight -->
    <div
      class="bg-primary/20 absolute bottom-0 top-4 rounded transition-all"
      style="left: {rangeStartPercent}%; width: {rangeEndPercent - rangeStartPercent}%"
    ></div>

    <!-- Start marker -->
    <div
      class="bg-primary absolute bottom-0 top-4 w-1 rounded-l transition-all"
      style="left: {rangeStartPercent}%"
    ></div>

    <!-- End marker -->
    <div
      class="bg-primary absolute bottom-0 top-4 w-1 rounded-r transition-all"
      style="left: {rangeEndPercent}%"
    ></div>

    <!-- Drag indicator -->
    <div class="text-muted-foreground absolute inset-x-0 bottom-1 flex justify-center opacity-40">
      <GripHorizontal class="size-4" />
    </div>
  </div>

  <!-- Active preview when dragging -->
  {#if isDragging}
    <div
      class="bg-primary text-primary-foreground pointer-events-none absolute left-1/2 top-full z-20 mt-2 flex h-10 min-w-32 -translate-x-1/2 items-center justify-center rounded-lg px-3 text-sm font-bold shadow-lg"
    >
      {previewText}
      <span class="ml-2 text-xs font-normal opacity-80">({displayDuration}d)</span>
    </div>
  {/if}

  <!-- Instructions -->
  <p class="text-muted-foreground mt-2 text-center text-xs">
    Click and drag to select date range
  </p>
</div>
