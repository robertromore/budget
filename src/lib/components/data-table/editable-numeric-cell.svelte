<script lang="ts">
  import NumericInput from "../input/numeric-input.svelte";

  let {
    value = $bindable(),
    onUpdateValue,
  }: {
    value: number | undefined;
    onUpdateValue: (newValue: unknown) => void;
  } = $props();

  let open = $state(false);
  const handleSubmit = () => {
    open = false;
    console.log(value);
    onUpdateValue(value);
  };
</script>

<NumericInput bind:amount={value} onSubmit={handleSubmit} bind:open />
