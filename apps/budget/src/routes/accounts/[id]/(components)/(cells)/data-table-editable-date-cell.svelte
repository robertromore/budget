<script lang="ts">
import {type DateValue} from '@internationalized/date';
import {DateInput} from '$lib/components/input';

let {
  value = $bindable(),
  onUpdateValue,
}: {
  value: DateValue | undefined;
  onUpdateValue?: (newValue: unknown) => void;
} = $props();

const handleSubmit = (new_value: DateValue | DateValue[] | undefined) => {
  console.log('handleSubmit called with:', new_value);
  if (onUpdateValue) {
    // Only submit valid single DateValue - reject arrays and undefined
    if (new_value && !Array.isArray(new_value)) {
      console.log('Calling onUpdateValue with valid date:', new_value);
      onUpdateValue(new_value);
    } else {
      console.warn('Invalid date value rejected:', new_value);
      // Don't call onUpdateValue for invalid dates
    }
  } else {
    console.warn('No onUpdateValue function provided');
  }
};
</script>

<DateInput bind:value {handleSubmit} />
