<script lang="ts">
import {type DateValue} from '@internationalized/date';
import {DateInput} from '$lib/components/input';

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
