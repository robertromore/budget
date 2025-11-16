<script lang="ts">
// --- Imports ---
import { Button } from '$lib/components/ui/button';
import { Input } from '$lib/components/ui/input';
import * as Popover from '$lib/components/ui/popover';
import { currencyFormatter } from '$lib/utils/formatters';
import { cn } from '$lib/utils';
import Delete from '@lucide/svelte/icons/delete';

// --- Props ---
interface Props {
  value: number;
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
        <Input
          bind:value={new_amount}
          class="mb-2"
          bind:ref={input}
          placeholder="0.00"
          {id}
          onpaste={handlePaste} />

        <div class="keypad grid grid-cols-3 grid-rows-3 gap-2">
          {#each Array.from({ length: 9 }, (_, i) => i + 1) as i}
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
