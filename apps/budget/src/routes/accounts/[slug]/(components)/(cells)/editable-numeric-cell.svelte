<script lang="ts">
import {NumericInput} from '$lib/components/input';
import {useEditableCell} from '$lib/hooks/ui';
import {currencyFormatter} from '$lib/utils/formatters';

interface Props {
  value: number;
  format?: 'currency' | 'number';
  onSave: (newValue: number) => Promise<void>;
}

let {value = $bindable(), format = 'currency', onSave}: Props = $props();

const formatter = format === 'currency'
  ? (amount: number) => currencyFormatter.format(amount)
  : (amount: number) => String(amount);

const cellState = useEditableCell({
  initialValue: value,
  onSave: async (newValue: number) => {
    value = newValue;
    await onSave(newValue);
  },
  validator: (amount: number) => !isNaN(amount) && isFinite(amount),
  formatter,
});

// Sync external value changes
$effect(() => {
  if (value !== cellState.currentValue && !cellState.isEditing) {
    cellState.updateValue(value);
  }
});

let numericValue = $state(cellState.currentValue);
let open = $state(false);

$effect(() => {
  if (cellState.isEditing) {
    numericValue = cellState.currentValue;
    open = true;
  } else {
    open = false;
  }
});

function handleSubmit() {
  cellState.updateValue(numericValue);
  cellState.saveEdit();
}
</script>

<NumericInput bind:value={numericValue} bind:open onSubmit={handleSubmit} />
