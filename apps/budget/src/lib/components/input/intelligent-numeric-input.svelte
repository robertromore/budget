<script lang="ts">
// --- Imports ---
import {Button} from '$lib/components/ui/button';
import {Input} from '$lib/components/ui/input';
import * as Popover from '$lib/components/ui/popover';
import {currencyFormatter} from '$lib/utils/formatters';
import {cn} from '$lib/utils';
import SuggestionBadge from '$lib/components/ui/suggestion-badge.svelte';
import Delete from '@lucide/svelte/icons/delete';

interface AmountSuggestion {
  type: 'smart' | 'intelligent' | 'insight' | 'auto' | 'info';
  reason: string;
  confidence?: number;
  suggestedAmount: number;
  onApply?: () => void;
}

// --- Props ---
interface Props {
  value: number;
  onSubmit?: () => void;
  open?: boolean;
  buttonClass?: string;
  suggestion?: AmountSuggestion;
  showSuggestionBadge?: boolean;
}

let {
  value = $bindable(),
  onSubmit,
  open = $bindable(),
  buttonClass,
  suggestion,
  showSuggestionBadge = true,
}: Props = $props();

// --- State ---
let dialogOpen = $state(open || false);
let new_amount = $state((value || 0).toFixed(2));
let input: HTMLInputElement | null = $state(null);
let suggestionDismissed = $state(false);

// Sync external value changes to internal state
$effect(() => {
  new_amount = (value || 0).toFixed(2);
});

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

// --- Suggestion Logic ---
const applySuggestion = () => {
  if (suggestion?.suggestedAmount) {
    new_amount = suggestion.suggestedAmount.toFixed(2);
    value = suggestion.suggestedAmount;
  }
  if (suggestion?.onApply) {
    suggestion.onApply();
  }
  suggestionDismissed = false;
};

const dismissSuggestion = () => {
  suggestionDismissed = true;
};

// Check if current value matches suggestion
const isSuggestionApplied = $derived.by(() => {
  return suggestion?.suggestedAmount && Math.abs(value - suggestion.suggestedAmount) < 0.01; // Account for floating point precision
});

// Show suggestion if it exists, hasn't been dismissed, and current value doesn't match suggestion
const shouldShowSuggestion = $derived.by(() => {
  return suggestion && showSuggestionBadge && !suggestionDismissed && !isSuggestionApplied;
});

// --- Functions: Keyboard Handling ---
const handleKeyDown = (event: KeyboardEvent) => {
  if (!dialogOpen) return;
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
</script>

<svelte:window on:keydown={handleKeyDown} />

<!-- --- UI --- -->
<div class="flex flex-col space-y-2">
  <!-- Suggestion Badge (appears above the input when suggestion is available) -->
  {#if shouldShowSuggestion}
    <div class="flex items-center justify-between">
      <SuggestionBadge
        type={suggestion?.type || 'info'}
        variant="accent"
        {...suggestion?.confidence !== undefined && {confidence: suggestion.confidence}}
        reason={suggestion?.reason || 'Suggested amount'}
        dismissible={true}
        onDismiss={dismissSuggestion}
        onApply={applySuggestion}>
        Suggested: {currencyFormatter.format(suggestion?.suggestedAmount || 0)}
      </SuggestionBadge>
    </div>
  {/if}

  <!-- Numeric Input -->
  <div class="flex items-center space-x-4">
    <!-- Numeric Input Popover -->
    <Popover.Root
      bind:open={dialogOpen}
      onOpenChange={(open) => {
        if (open && parseFloat(new_amount) == 0) {
          new_amount = '';
        }
      }}>
      <Popover.Trigger>
        {#snippet child({props})}
          <Button
            {...props}
            variant="outline"
            class={cn(
              'justify-start text-left font-normal transition-all duration-200',
              !new_amount && 'text-muted-foreground',
              shouldShowSuggestion && 'ring-2 ring-purple-200 dark:ring-purple-800',
              isSuggestionApplied && 'ring-2 ring-green-200 dark:ring-green-800',
              buttonClass || 'w-36'
            )}>
            {currencyFormatter.format(parseFloat(new_amount) || 0)}

            <!-- Applied indicator -->
            {#if isSuggestionApplied}
              <SuggestionBadge type="smart" variant="success" applied={true} class="ml-auto" />
            {/if}
          </Button>
        {/snippet}
      </Popover.Trigger>
      <Popover.Content
        class="p-0"
        align="start"
        onEscapeKeydown={() => (new_amount = value!.toString())}>
        <div class="p-2">
          <!-- Suggestion in keypad -->
          {#if shouldShowSuggestion}
            <div class="bg-accent/5 border-accent/20 mb-2 rounded border p-2">
              <div class="mb-2 flex items-center justify-between">
                <span class="text-muted-foreground text-xs">Suggested amount:</span>
                <SuggestionBadge
                  type={suggestion?.type || 'info'}
                  {...suggestion?.confidence !== undefined && {confidence: suggestion.confidence}}
                  class="text-xs" />
              </div>
              <Button
                variant="outline"
                class="bg-accent/10 border-accent/20 w-full"
                onclick={() => {
                  applySuggestion();
                  dialogOpen = false;
                }}>
                {currencyFormatter.format(suggestion?.suggestedAmount || 0)}
              </Button>
            </div>
          {/if}

          <Input bind:value={new_amount} class="mb-2" bind:ref={input} placeholder="0.00" />

          <div class="keypad grid grid-cols-3 grid-rows-3 gap-2">
            {#each Array.from({length: 9}, (_, i) => i + 1) as i}
              <Button
                variant="outline"
                disabled={valueWellFormatted()}
                onclick={select(i.toString())}>
                {i}
              </Button>
            {/each}

            <Button variant="outline" disabled={new_amount?.includes('.')} onclick={select('.')}
              >.</Button>
            <Button variant="outline" disabled={valueWellFormatted()} onclick={select('0')}
              >0</Button>
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
</div>
