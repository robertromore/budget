<script lang="ts">
import { DateInput } from '$lib/components/input';
import { type DateValue } from '@internationalized/date';

let {
  value = $bindable(),
  onSave,
}: {
  value: DateValue | undefined;
  onSave: (newValue: DateValue) => Promise<void>;
} = $props();

const handleSubmit = async (new_value: DateValue | undefined) => {
  if (new_value && onSave) {
    await onSave(new_value);
  }
};
</script>

<DateInput bind:value {handleSubmit} />
