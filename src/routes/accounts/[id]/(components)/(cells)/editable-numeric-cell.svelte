<script lang="ts">
  import { NumericInput } from "$lib/components/input";

  let {
    value = $bindable(),
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
