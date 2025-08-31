<script lang="ts">
  import { type DateValue } from "@internationalized/date";
  import DateInput from "$lib/components/inputs/date/date-input.svelte";

  let {
    value = $bindable(),
    onUpdateValue,
  }: {
    value: DateValue | undefined;
    onUpdateValue?: (newValue: unknown) => void;
  } = $props();

  const handleSubmit = (new_value: DateValue | undefined) => {
    if (onUpdateValue) {
      onUpdateValue(new_value);
    }
  };
</script>

<DateInput bind:value {handleSubmit} />
