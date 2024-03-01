<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import Input from '$lib/components/ui/input/input.svelte';
  import * as Popover from '$lib/components/ui/popover';
  import { currencyFormatter } from '$lib/helpers/formatters';
  import { cn } from '$lib/utils';
  import type { EditableNumericItem } from '../types';

  let { amount, onSubmit, open, value } = $props<{
    amount?: EditableNumericItem,
    onSubmit?: () => void,
    open?: boolean,
    value
  }>();

  let dialogOpen = $state(open || false);
  let new_amount = $state(amount?.formatted?.replace('$', '') || '0');

  const select = (num: string) => () => {
    new_amount += num;
  };
  const backspace = () => {
    new_amount = new_amount?.substring(0, new_amount.length - 1);
  };
  const clear = () => new_amount = '';
  const submit = () => {
    let new_amount_actual = parseFloat(new_amount);
    if (new_amount) {
      amount = {
        value: new_amount_actual,
        formatted: currencyFormatter.format(new_amount_actual)
      };
      value = new_amount_actual;
    }
    dialogOpen = false;
    onSubmit ? onSubmit() : null;
  };

  const valueWellFormatted = () => new_amount?.match(/\d+?\.\d{2}/) !== null;
  const handleKeyDown = (event: KeyboardEvent) => {
    if (new_amount?.includes('.') && event.key === '.') {
      event.preventDefault();
    }
    if (new_amount && event.key == 'Enter') {
      submit();
    }
  }
</script>

<svelte:window
  onkeydown={handleKeyDown}
/>

<div class="flex items-center space-x-4">
  <Popover.Root
    bind:open={dialogOpen}
    let:ids
  >
    <Popover.Trigger asChild let:builder>
      <Button
      variant="outline"
      class={cn(
        "w-[240px] justify-start text-left font-normal",
        !new_amount && "text-muted-foreground"
      )}
      builders={[builder]}
    >
      {amount?.formatted}
    </Button>
    </Popover.Trigger>
    <Popover.Content class="p-0" align="start">
      <div class="p-2">
        <Input bind:value={new_amount} class="mb-2" />
        <div class="keypad grid grid-cols-3 grid-rows-3 gap-2">
          {#each Array.from({length: 9}, (_, i) => i + 1) as i}
          <Button variant="outline" disabled={valueWellFormatted()} on:click={select(i.toString())}>{i}</Button>
          {/each}

          <Button variant="outline" disabled={new_amount?.includes('.')} on:click={select('.')}>.</Button>
          <Button variant="outline" disabled={valueWellFormatted()} on:click={select('0')}>0</Button>
          <Button variant="outline" disabled={!new_amount} on:click={backspace}>
            <span class="icon-[lucide--delete]"></span>
          </Button>

          <Button variant="outline" disabled={!new_amount} on:click={clear}>clear</Button>
          <Button class="col-span-2" disabled={!new_amount} on:click={submit}>submit</Button>
        </div>
      </div>
    </Popover.Content>
  </Popover.Root>
</div>
