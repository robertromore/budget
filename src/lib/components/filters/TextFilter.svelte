<script lang="ts">
  import Input from '$lib/components/ui/input/input.svelte';

  type Props = {
    value?: String;
    class?: string;
    changeFilterValue: (new_value: unknown) => any;
  };

  let { value = $bindable(), class: className, changeFilterValue }: Props = $props();
</script>

<Input
  class={className}
  bind:value
  onkeyup={() => {
    changeFilterValue(value);
  }}
/>
