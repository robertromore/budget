<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import { cn } from '$lib/utils';
  import GripHorizontal from '@lucide/svelte/icons/grip-horizontal';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';

  interface Props {
    /** Day of quarter (1-92) */
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
    max = 92,
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

  // Two-phase selection: quarter selection -> day selection
  let selectedQuarter = $state<number | null>(null); // 0=Q1, 1=Q2, 2=Q3, 3=Q4

  // For relative dragging with modifiers
  let dragStartX = $state(0);
  let dragStartValue = $state(0);
  let currentModifier = $state<'none' | 'shift' | 'alt'>('none');

  // Quarter definitions with their month ranges
  const quarters = [
    { label: 'Q1', months: ['Jan', 'Feb', 'Mar'], startMonth: 0 },
    { label: 'Q2', months: ['Apr', 'May', 'Jun'], startMonth: 3 },
    { label: 'Q3', months: ['Jul', 'Aug', 'Sep'], startMonth: 6 },
    { label: 'Q4', months: ['Oct', 'Nov', 'Dec'], startMonth: 9 },
  ];

  // Day markers for scrubber: start and middle of each month in a quarter
  // Month 1: days 1-31, Month 2: days 32-59 (28 days), Month 3: days 60-92 (33 days)
  const dayMarkers = [
    { day: 1, label: '1st', monthIdx: 0 },    // Start of month 1
    { day: 16, label: '15th', monthIdx: 0 },  // Middle of month 1
    { day: 32, label: '1st', monthIdx: 1 },   // Start of month 2
    { day: 46, label: '15th', monthIdx: 1 },  // Middle of month 2
    { day: 60, label: '1st', monthIdx: 2 },   // Start of month 3
    { day: 75, label: '15th', monthIdx: 2 },  // Middle of month 3
  ];

  // Helper to convert day-of-quarter to a formatted date string
  // Uses the selected quarter for display
  function dayOfQuarterToDate(dayOfQuarter: number, quarterIndex: number | null): Date {
    const year = new Date().getFullYear();
    const startMonth = quarterIndex !== null ? quarters[quarterIndex].startMonth : 0;
    const date = new Date(year, startMonth, 1);
    date.setDate(dayOfQuarter);
    return date;
  }

  function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function formatDayOfQuarter(day: number): string {
    return formatDate(dayOfQuarterToDate(day, selectedQuarter));
  }

  // Current display value
  const displayValue = $derived(activeValue ?? value);

  // Get the month labels for the selected quarter with day markers
  const currentMarkers = $derived.by(() => {
    if (selectedQuarter === null) return [];
    const monthNames = quarters[selectedQuarter].months;
    return dayMarkers.map((marker) => ({
      ...marker,
      monthName: monthNames[marker.monthIdx],
      fullLabel: `${monthNames[marker.monthIdx]} ${marker.label}`,
    }));
  });

  // Find which button the current value falls into
  // Use visual button boundaries (6 equal-width buttons across 92 days)
  function getMarkerIndexForDay(day: number): number {
    // 6 buttons spanning days 1-92 (91 intervals)
    // Button boundaries at 1/6th intervals:
    // Button 0: days 1-16 (0% - 16.67%)
    // Button 1: days 17-31 (16.67% - 33.33%)
    // Button 2: days 32-47 (33.33% - 50%)
    // Button 3: days 48-62 (50% - 66.67%)
    // Button 4: days 63-77 (66.67% - 83.33%)
    // Button 5: days 78-92 (83.33% - 100%)
    const totalDays = max - min; // 91
    const buttonWidth = totalDays / 6;

    // Calculate which button this day falls into
    const buttonIndex = Math.floor((day - min) / buttonWidth);
    return Math.min(5, Math.max(0, buttonIndex));
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
      // Reset quarter selection when losing focus
      if (selectedQuarter !== null) {
        selectedQuarter = null;
      }
    }
  }

  function handleQuarterClick(quarterIndex: number) {
    selectedQuarter = quarterIndex;
  }

  function handleBackClick() {
    selectedQuarter = null;
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
      // Coarse control: snap to day markers (1st and 15th of each month)
      const x = clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      const targetDay = min + percent * (max - min);

      // Find the closest marker
      let closestDay = dayMarkers[0].day;
      for (const marker of dayMarkers) {
        if (Math.abs(marker.day - targetDay) < Math.abs(closestDay - targetDay)) {
          closestDay = marker.day;
        }
      }
      return Math.round(Math.min(max, Math.max(min, closestDay)));
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
    if (disabled || selectedQuarter === null) return;
    e.preventDefault();
    isDragging = true;
    dragStartX = e.clientX;
    dragStartValue = value;
    currentModifier = e.shiftKey ? 'shift' : e.altKey ? 'alt' : 'none';
    handleScrubberInteraction(e.clientX, e.shiftKey, e.altKey);
  }

  function handleTouchStart(e: TouchEvent) {
    if (disabled || selectedQuarter === null) return;
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

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Shift' || e.key === 'Alt') {
          dragStartX = 0;
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

  function handleMarkerClick(markerIndex: number) {
    value = dayMarkers[markerIndex].day;
    inputRef?.focus();
  }

  // Highlight style for markers based on selection
  function getMarkerStyle(markerIndex: number): string {
    const activeIdx = getMarkerIndexForDay(displayValue);

    if (markerIndex === activeIdx) {
      return 'bg-primary text-primary-foreground scale-105 rounded';
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
    value={formatDayOfQuarter(value)}
    onfocus={handleFocus}
    onblur={handleBlur}
    class={cn('cursor-pointer', inputClass)}
  />

  <!-- Scrubber - visible when focused -->
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
      {#if selectedQuarter === null}
        <!-- Phase 1: Quarter selection -->
        <div class="flex items-center justify-between gap-1">
          {#each quarters as quarter, index}
            <button
              type="button"
              class={cn(
                'flex flex-1 flex-col items-center justify-center rounded py-1 text-xs font-medium transition-all',
                'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
              onclick={() => handleQuarterClick(index)}
              tabindex={-1}
            >
              <span class="font-semibold">{quarter.label}</span>
              <span class="text-[9px] opacity-70">{quarter.months[0]}-{quarter.months[2]}</span>
            </button>
          {/each}
        </div>
        <p class="text-muted-foreground mt-1 text-center text-[10px]">
          Click a quarter to select day
        </p>
      {:else}
        <!-- Phase 2: Day selection within quarter -->
        <div class="flex items-center gap-1">
          <!-- Back button -->
          <button
            type="button"
            class="text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center rounded p-1 transition-all"
            onclick={handleBackClick}
            tabindex={-1}
            title="Back to quarters"
          >
            <ChevronLeft class="size-4" />
          </button>

          <!-- Day marker buttons (1st and 15th of each month) -->
          <div class="flex flex-1 items-center justify-between">
            {#each currentMarkers as marker, index}
              <button
                type="button"
                class={cn(
                  'flex flex-1 flex-col items-center justify-center py-0.5 text-[9px] font-medium transition-all',
                  getMarkerStyle(index)
                )}
                onclick={() => handleMarkerClick(index)}
                tabindex={-1}
              >
                <span class="text-[10px]">{marker.monthName}</span>
                <span class="opacity-70">{marker.label}</span>
              </button>
            {/each}
          </div>
        </div>
        <!-- Drag indicator -->
        <div class="text-muted-foreground mt-0.5 flex cursor-ew-resize justify-center opacity-40 hover:opacity-60">
          <GripHorizontal class="size-3.5" />
        </div>

        <!-- Instructions and modifier hint -->
        <p class="text-muted-foreground mt-1 text-center text-[10px]">
          Drag to select &middot;
          <kbd class="bg-muted rounded px-0.5">Shift</kbd> fine &middot;
          <kbd class="bg-muted rounded px-0.5">Alt</kbd> snap
        </p>
      {/if}
    </div>

    <!-- Active value indicator when dragging -->
    {#if isDragging && activeValue !== null && selectedQuarter !== null}
      <div
        class="bg-primary text-primary-foreground pointer-events-none absolute left-1/2 top-full z-20 mt-14 flex h-10 min-w-20 -translate-x-1/2 items-center justify-center rounded-lg px-3 text-sm font-bold shadow-lg"
      >
        {formatDayOfQuarter(activeValue)}
        {#if currentModifier !== 'none'}
          <span class="ml-1.5 text-[10px] font-normal opacity-70">
            {currentModifier === 'shift' ? '(fine)' : '(month)'}
          </span>
        {/if}
      </div>
    {/if}
  {/if}
</div>
