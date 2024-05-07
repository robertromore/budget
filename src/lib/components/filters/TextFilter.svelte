<script lang="ts">
  import Input from '$lib/components/ui/input/input.svelte';
  import { cn } from '$lib/utils';
  import { Button } from '../ui/button';

  type Props = {
    value?: String;
    class?: string;
    changeFilterValue: (new_value: unknown) => any;
    onClear?: () => {};
  };

  let { value = $bindable(), class: className, changeFilterValue, onClear }: Props = $props();

  const clear = () => {
    value = undefined;
    changeFilterValue(value);
    if (onClear) {
      onClear();
    }
  };
</script>

<div class={cn("relative w-full", className)}>
  <Input
    bind:value
    onkeyup={() => {
      changeFilterValue(value);
    }}
  />
  {#if (!Array.isArray(value) && value) || (Array.isArray(value) && value[0] && value[0].value)}
    <Button
      variant="ghost"
      size="icon"
      class="absolute right-0 top-0 hover:bg-transparent"
      onclick={clear}
    >
      <span class="icon-[lucide--x]"></span>
    </Button>
  {/if}
</div>
