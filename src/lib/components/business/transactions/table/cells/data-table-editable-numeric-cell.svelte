<script lang="ts">
  import NumericInput from "$lib/components/input/numeric-input.svelte";

  let {
    value = $bindable(0),
    onUpdateValue,
  }: {
    value: number;
    onUpdateValue: (newValue: unknown) => void;
  } = $props();

  let open = $state(false);
  const handleSubmit = () => {
    open = false;
    onUpdateValue(value);
  };
</script>

<NumericInput bind:value={value} onSubmit={handleSubmit} bind:open />
