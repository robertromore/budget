<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import Input from '$lib/components/ui/input/input.svelte';
  import * as Popover from '$lib/components/ui/popover';
  import { currencyFormatter } from '$lib/helpers/formatters';
  import { cn } from '$lib/utils';
  import type { EditableNumericItem } from '../types';

  let { amount = $bindable(), onSubmit, open = $bindable() }: {
    amount?: EditableNumericItem,
    onSubmit?: () => void,
    open?: boolean
  } = $props();


  let dialogOpen = $state(open || false);
  let new_amount = $state(amount?.value?.toString() || '0');
  $effect(() => {
    new_amount = amount?.value?.toString() || '0';
  });

  const select = (num: string) => () => {
    new_amount += num;
  };
  const backspace = () => {
    new_amount = new_amount?.substring(0, new_amount.length - 1);
  };
  const clear = () => new_amount = '';
  const submit = () => {
    amount = {
      value: parseFloat(new_amount),
      formatted: currencyFormatter.format(parseFloat(new_amount))
    }
    dialogOpen = false;
    onSubmit ? onSubmit() : null;
  };

  const valueWellFormatted = () => new_amount?.match(/\d+?\.\d{2}/) !== null;
  const handleKeyDown = (event: KeyboardEvent) => {
    if (dialogOpen) {
      if (new_amount?.includes('.') && event.key === '.') {
        event.preventDefault();
      }
      if (valueWellFormatted() && event.key in [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]) {
        event.preventDefault();
      }
      /*console.log(e.key);
      if (
        !valueWellFormatted() && e.key in Array.from({length: 10}, (_, i) => i)
        || !new_value.includes('.') && e.key === '.'
      ) {
        new_value += e.key;
      }
      else if (new_value && e.key == 'Backspace') {
        // new_value = new_value.substring(0, new_value.length - 1);
        // backspace();
      }
      else */
      if (new_amount && event.key == 'Enter') {
        submit();
      }
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
        <!-- <span class="relative flex w-full touch-none select-none items-center mt-3 mb-6" tabindex="0" role="button" aria-roledescription="Adjust" onmousedown={handleMouseDown} onmousemove={handleMouseMove} onmouseup={handleMouseUp}>
          <span class="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20" bind:this={track}></span>
          <span class="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 absolute" style="left: {handle_position}%; translate: -50%;" bind:this={handle}/>
          <span class="text-xs -bottom-5 left-0 absolute">-10</span>
          <span class="text-xs -bottom-5 left-[15.5%] -translate-x-[50%] absolute">-5</span>
          <span class="text-xs -bottom-5 left-[35%] -translate-x-[50%] absolute">-1</span>
          <span class="text-xs -bottom-5 left-[50%] -translate-x-[50%] absolute">0</span>
          <span class="text-xs -bottom-5 right-[35%] -translate-x-[50%] absolute">1</span>
          <span class="text-xs -bottom-5 right-[15.5%] -translate-x-[50%] absolute">5</span>
          <span class="text-xs -bottom-5 right-0 absolute">10</span>
        </span> -->
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
