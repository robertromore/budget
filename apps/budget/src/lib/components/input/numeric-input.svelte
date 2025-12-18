<script lang="ts">
// --- Imports ---
import { Button } from '$lib/components/ui/button';
import { Input } from '$lib/components/ui/input';
import * as Popover from '$lib/components/ui/popover';
import { cn } from '$lib/utils';
import { currencyFormatter } from '$lib/utils/formatters';
import Delete from '@lucide/svelte/icons/delete';

// --- Props ---
interface Props {
  value: number | undefined;
  onSubmit?: () => void;
  open?: boolean;
  buttonClass?: string;
  id?: string;
  /** Optional formatter function for displaying the value. Defaults to currency formatter. */
  formatter?: (value: number) => string;
}

let {
  value = $bindable(),
  onSubmit,
  open = $bindable(),
  buttonClass,
  id,
  formatter = currencyFormatter.format,
}: Props = $props();

// --- State ---
let dialogOpen = $state(open || false);
let new_amount = $state((value || 0).toFixed(2));
let input: HTMLInputElement | null = $state(null);

// Sync external value changes to internal state
$effect(() => {
  new_amount = (value || 0).toFixed(2);
});

// Track if popover has been opened to prevent auto-submit on mount
let hasBeenOpened = $state(false);

// --- Scrubber State ---
let isScrubbing = $state(false);
let scrubStartX = $state(0);
let scrubStartValue = $state(0);
let lastX = $state(0);
let lastTime = $state(0);
let currentValue = $state(0);
let scrubMode = $state<'fine' | 'normal' | 'coarse' | 'turbo' | 'velocity'>('normal');

// Scrubber configuration
const SCRUB_THRESHOLD = 3; // minimum pixels before scrubbing activates
const BASE_SENSITIVITY = 0.01; // base value change per pixel
const VELOCITY_SCALE = 0.002; // how much velocity affects the multiplier
const MIN_MULTIPLIER = 0.5; // minimum velocity multiplier (slow movement)
const MAX_MULTIPLIER = 5; // maximum velocity multiplier (fast movement)
const VELOCITY_EXPONENT = 2; // Power for exponential velocity scaling in velocity mode

// Scrub mode display info
const scrubModes = [
  { key: 'fine', hotkey: 'shift', label: '0.1x' },
  { key: 'normal', hotkey: '', label: '1x' },
  { key: 'coarse', hotkey: 'cmd', label: '10x' },
  { key: 'turbo', hotkey: 'shift+cmd', label: '100x' },
  { key: 'velocity', hotkey: 'opt', label: 'velocity' },
] as const;

// --- Functions: Numeric Input Logic ---
const select = (num: string) => () => {
  new_amount += num;
};
const backspace = () => {
  new_amount = new_amount?.substring(0, new_amount.length - 1);
};
const clear = () => {
  new_amount = '';
  input?.focus();
};
const submit = () => {
  value = parseFloat(new_amount);
  dialogOpen = false;
  onSubmit?.();
};
const valueWellFormatted = () =>
  new_amount?.match(/\-?\d+?\.\d{2}/) !== null && new_amount !== '0.00';
const changeSign = () => {
  if (new_amount && new_amount !== '0.00' && new_amount !== '-') {
    new_amount = (parseFloat(new_amount) * -1).toString();
  } else if (new_amount === '-') {
    new_amount = '';
  } else {
    new_amount = '-';
  }
};

// --- Functions: Keyboard Handling ---
const handleKeyDown = (event: KeyboardEvent) => {
  if (!dialogOpen) return;

  // Allow paste, undo, redo (cmd+shift+z), and select all operations
  if (event.ctrlKey || event.metaKey) {
    if (['v', 'z', 'a'].includes(event.key.toLowerCase())) {
      return;
    }
  }

  if (new_amount?.includes('.') && event.key === '.') {
    event.preventDefault();
  }
  const target = event.target as HTMLInputElement;
  const start = target?.selectionStart || 0;
  const end = target?.selectionEnd || target?.value?.length;
  switch (event.key) {
    case 'Enter':
      if (new_amount) submit();
      break;
    case 'Backspace':
      break;
    case '.':
      // Allow period if one doesn't already exist (handled above)
      break;
    case '0':
    case '1':
    case '2':
    case '3':
    case '4':
    case '5':
    case '6':
    case '7':
    case '8':
    case '9':
      if (valueWellFormatted() && parseFloat(new_amount) != 0 && start === end) {
        event.preventDefault();
      }
      break;
    case '-':
      if ((new_amount.length > 0 && new_amount !== '0.00') || new_amount?.startsWith('-')) {
        event.preventDefault();
      }
      break;
    default:
      event.preventDefault();
  }
};

// --- Functions: Paste Handling ---
const handlePaste = (event: ClipboardEvent) => {
  if (!dialogOpen) return;

  event.preventDefault();
  const pastedText = event.clipboardData?.getData('text');
  if (!pastedText) return;

  // Strip all non-numeric characters except period and minus sign
  let cleaned = pastedText.replace(/[^0-9.-]/g, '');

  // Only allow one minus sign at the beginning
  const hasNegative = cleaned.startsWith('-');
  cleaned = cleaned.replace(/-/g, '');
  if (hasNegative) cleaned = '-' + cleaned;

  // Only allow one period
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }

  new_amount = cleaned;
};

// --- Functions: Scrubber ---
function handleInputMouseDown(e: MouseEvent) {
  // Only start tracking on left mouse button
  if (e.button !== 0) return;

  scrubStartX = e.clientX;
  lastX = e.clientX;
  lastTime = performance.now();
  scrubStartValue = parseFloat(new_amount) || 0;
  currentValue = scrubStartValue;

  // Add listeners for potential scrubbing
  window.addEventListener('mousemove', handleInputMouseMove);
  window.addEventListener('mouseup', handleInputMouseUp);
}

function handleInputMouseMove(e: MouseEvent) {
  const totalDeltaX = e.clientX - scrubStartX;

  // Only activate scrubbing after threshold
  if (!isScrubbing && Math.abs(totalDeltaX) > SCRUB_THRESHOLD) {
    isScrubbing = true;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';
    // Blur the input to prevent text selection during scrubbing
    input?.blur();
    // Clear any existing selection
    window.getSelection()?.removeAllRanges();
    // Reset tracking when scrubbing starts
    lastX = e.clientX;
    lastTime = performance.now();
    currentValue = scrubStartValue;
  }

  if (isScrubbing) {
    const now = performance.now();
    const deltaX = e.clientX - lastX;
    const deltaTime = now - lastTime;

    // Calculate velocity (pixels per millisecond)
    const velocity = deltaTime > 0 ? Math.abs(deltaX) / deltaTime : 0;

    // Convert velocity to a multiplier (faster movement = larger changes)
    // velocity of ~0.5 px/ms is moderate speed, ~2 px/ms is fast
    const velocityMultiplier = Math.min(
      MAX_MULTIPLIER,
      Math.max(MIN_MULTIPLIER, 1 + velocity * VELOCITY_SCALE * 1000)
    );

    // Apply modifier keys for precision and update mode indicator
    let keyMultiplier = 1;
    if (e.altKey) {
      // Velocity mode: exponential scaling based on movement speed
      keyMultiplier = Math.pow(velocity * 10 + 1, VELOCITY_EXPONENT);
      scrubMode = 'velocity';
    } else if (e.shiftKey && (e.ctrlKey || e.metaKey)) {
      keyMultiplier = 100; // Turbo control
      scrubMode = 'turbo';
    } else if (e.shiftKey) {
      keyMultiplier = 0.1; // Fine control
      scrubMode = 'fine';
    } else if (e.ctrlKey || e.metaKey) {
      keyMultiplier = 10; // Coarse control
      scrubMode = 'coarse';
    } else {
      scrubMode = 'normal';
    }

    // Calculate value change based on direction, velocity, and modifiers
    const direction = deltaX > 0 ? 1 : deltaX < 0 ? -1 : 0;
    const valueChange = direction * Math.abs(deltaX) * BASE_SENSITIVITY * velocityMultiplier * keyMultiplier;

    currentValue += valueChange;
    new_amount = currentValue.toFixed(2);

    // Update tracking for next frame
    lastX = e.clientX;
    lastTime = now;
  }
}

function handleInputMouseUp() {
  window.removeEventListener('mousemove', handleInputMouseMove);
  window.removeEventListener('mouseup', handleInputMouseUp);

  if (isScrubbing) {
    isScrubbing = false;
    scrubMode = 'normal';
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    value = parseFloat(new_amount);
  }
}
</script>

<svelte:window on:keydown={handleKeyDown} />

<!-- --- UI --- -->
<div class="flex items-center space-x-4">
  <!-- Numeric Input Popover -->
  <Popover.Root
    bind:open={dialogOpen}
    onOpenChange={(open) => {
      if (open) {
        hasBeenOpened = true;
        if (parseFloat(new_amount) == 0) {
          new_amount = '';
        }
      }
      // Auto-submit when closing if value has changed (but not on mount)
      if (!open && hasBeenOpened && new_amount && new_amount !== (value || 0).toString()) {
        const parsedValue = parseFloat(new_amount);
        if (!isNaN(parsedValue)) {
          value = parsedValue;
          onSubmit?.();
        }
      }
    }}>
    <Popover.Trigger>
      {#snippet child({ props })}
        <Button
          {...props}
          variant="outline"
          class={cn(
            'justify-start text-left font-normal',
            !new_amount && 'text-muted-foreground',
            buttonClass || 'w-36'
          )}>
          {formatter(parseFloat(new_amount) || 0)}
        </Button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content
      class="p-0"
      align="start"
      onEscapeKeydown={() => (new_amount = (value || 0).toString())}>
      <div class="p-2">
        <div class="relative">
          <Input
            bind:value={new_amount}
            class={cn('mb-2 cursor-ew-resize', isScrubbing && 'select-none')}
            bind:ref={input}
            placeholder="0.00"
            {id}
            onpaste={handlePaste}
            onmousedown={handleInputMouseDown} />
          <!-- Scrub mode indicator tabs -->
          {#if isScrubbing}
            <div
              class="absolute -top-9 left-1/2 -translate-x-1/2 flex items-center rounded-md border bg-background shadow-lg overflow-hidden">
              {#each scrubModes as mode (mode.key)}
                <div
                  class={cn(
                    'flex items-center gap-1 px-2 py-1 text-xs transition-colors',
                    scrubMode === mode.key
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground'
                  )}>
                  {#if mode.hotkey}
                    <kbd
                      class={cn(
                        'font-mono text-[10px] px-1 rounded',
                        scrubMode === mode.key
                          ? 'bg-primary-foreground/20'
                          : 'bg-muted'
                      )}>{mode.hotkey}</kbd>
                  {/if}
                  <span class="font-medium">{mode.label}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <div class="keypad grid grid-cols-3 grid-rows-3 gap-2">
          {#each Array.from({ length: 9 }, (_, i) => i + 1) as i (i)}
            <Button
              variant="outline"
              disabled={valueWellFormatted()}
              onclick={select(i.toString())}>
              {i}
            </Button>
          {/each}

          <Button variant="outline" disabled={new_amount?.includes('.')} onclick={select('.')}
            >.</Button>
          <Button variant="outline" disabled={valueWellFormatted()} onclick={select('0')}>0</Button>
          <Button variant="outline" disabled={!new_amount} onclick={backspace}>
            <Delete />
          </Button>

          <Button variant="outline" onclick={changeSign}>
            {#if !new_amount || parseFloat(new_amount) >= 0}
              -
            {:else}
              +
            {/if}
          </Button>
          <Button variant="outline" disabled={!new_amount} onclick={clear}>clear</Button>
          <Button disabled={!new_amount || new_amount === '-'} onclick={submit}>submit</Button>
        </div>
      </div>
    </Popover.Content>
  </Popover.Root>
</div>
