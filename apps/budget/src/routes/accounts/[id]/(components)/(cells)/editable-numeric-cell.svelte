<script lang="ts">
// Component imports
import {NumericInput} from '$lib/components/input';

// Hook imports
import {useEditableCell} from '$lib/hooks/ui';

// Utility imports
import {currencyFormatter} from '$lib/utils/formatters';

interface Props {
  value: number;
  onUpdateValue: (newValue: unknown) => void;
}

let {value = $bindable(), onUpdateValue}: Props = $props();

// Use editable cell hook for consistent state management
const cellState = useEditableCell({
  initialValue: value,
  onSave: async (newValue: number) => {
    value = newValue;
    onUpdateValue(newValue);
  },
  validator: (amount: number) => !isNaN(amount) && isFinite(amount),
  formatter: (amount: number) => currencyFormatter.format(amount),
});

// Sync external value changes
$effect(() => {
  if (value !== cellState.currentValue && !cellState.isEditing) {
    cellState.updateValue(value);
  }
});

// Handle NumericInput's bindable value and submit
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
