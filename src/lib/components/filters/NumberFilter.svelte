<script lang="ts">
  import Input from '$lib/components/ui/input/input.svelte';
  import { Slider } from "$lib/components/ui/slider/index.js";
  import { cn } from '$lib/utils';
  import { Button } from '../ui/button';

  type Props = {
    value: number[];
    class?: string;
    changeFilterValue: (new_value: unknown) => any;
    onClear?: () => {};
  };

  let { value = $bindable(), class: className, changeFilterValue, onClear }: Props = $props();

  let inputValue = $state(0);
  $effect(() => {
    inputValue = value[0];
  });
  $effect(() => {
    value[0] = inputValue;
  });

  const clear = () => {
    // value = [0];
    changeFilterValue(value);
    if (onClear) {
      onClear();
    }
  };
</script>

<div class={cn("relative w-full", className)}>
  <Input
    type="number"
    bind:value={inputValue}
    onchange={() => {
      changeFilterValue(value);
    }}
  />
  <Slider bind:value max={100} step={1} class="mt-3" />

  {#if (!Array.isArray(value) && value) || (Array.isArray(value) && value[0])}
    <!-- <Button
      variant="ghost"
      size="icon"
      class="absolute right-0 top-0 hover:bg-transparent"
      onclick={clear}
    >
      <span class="icon-[lucide--x]"></span>
    </Button> -->
  {/if}
</div>
