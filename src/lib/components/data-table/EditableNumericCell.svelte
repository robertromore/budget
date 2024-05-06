<script lang="ts">
  import type { EditableNumericItem } from '../types';
  import NumericInput from '../input/NumericInput.svelte';

  let {
    value,
    onUpdateValue
  }: {
    value: EditableNumericItem | undefined;
    onUpdateValue: (newValue: unknown) => void;
  } = $props();

  let open = $state(false);
  const handleSubmit = () => {
    open = false;
    onUpdateValue(value);
  };
</script>

<NumericInput bind:amount={value} onSubmit={handleSubmit} bind:open />
