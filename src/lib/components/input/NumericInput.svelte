<script lang="ts">
  import { Button } from '../ui/button';
  import Icon from '@iconify/svelte';
  import Input from '../ui/input/input.svelte';

  let { value, onSubmit } = $props<{
    value: string,
    onSubmit: () => void
  }>();

  let new_value = $state(value.replace('$', ''));

  const select = (num: string) => () => {
    new_value += num;
  };
  const backspace = () => {
    new_value = new_value.substring(0, new_value.length - 1);
  };
  const clear = () => new_value = '';
  const submit = () => {
    value = new_value;
    onSubmit();
  };

  const valueWellFormatted = () => new_value.match(/\d+?\.\d{2}/) !== null;
  const handleKeyDown = (e: KeyboardEvent) => {
    if (new_value.includes('.') && e.key === '.') {
      e.preventDefault();
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
    if (new_value && e.key == 'Enter') {
      submit();
    }
  }
</script>

<svelte:window on:keydown={handleKeyDown}/>

<div class="p-2">
  <Input bind:value={new_value} class="mb-2" />
  <div class="keypad grid grid-cols-3 grid-rows-3 gap-2">
    {#each Array.from({length: 9}, (_, i) => i + 1) as i}
    <Button variant="outline" disabled={valueWellFormatted()} on:click={select(i.toString())}>{i}</Button>
    {/each}

    <Button variant="outline" disabled={new_value.includes('.')} on:click={select('.')}>.</Button>
    <Button variant="outline" disabled={valueWellFormatted()} on:click={select('0')}>0</Button>
    <Button variant="outline" disabled={!new_value} on:click={backspace}>
      <Icon icon="ic:baseline-keyboard-backspace"/>
    </Button>

    <Button variant="outline" disabled={!new_value} on:click={clear}>clear</Button>
    <Button class="col-span-2" disabled={!new_value} on:click={submit}>submit</Button>
  </div>
</div>
