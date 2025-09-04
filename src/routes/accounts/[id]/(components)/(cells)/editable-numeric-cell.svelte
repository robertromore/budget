<script lang="ts">
  // Component imports
  import { NumericInput } from "$lib/components/input";
  
  // Hook imports
  import { useEditableCell } from "$lib/hooks/ui";
  
  // Utility imports
  import { currencyFormatter } from "$lib/utils/formatters";

  interface Props {
    value: number;
    onUpdateValue: (newValue: unknown) => void;
  }

  let {
    value = $bindable(),
    onUpdateValue
  }: Props = $props();

  // Use editable cell hook for consistent state management
  const cellState = useEditableCell({
    initialValue: value,
    onSave: async (newValue: number) => {
      value = newValue;
      onUpdateValue(newValue);
    },
    validator: (amount: number) => !isNaN(amount) && isFinite(amount),
    formatter: (amount: number) => currencyFormatter.format(amount)
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

{#if cellState.isEditing}
  <NumericInput 
    bind:value={numericValue}
    bind:open
    onSubmit={handleSubmit}
  />
{:else}
  <!-- Display mode with currency formatting -->
  <button 
    type="button"
    class="flex items-center justify-between group w-full text-left p-2 rounded hover:bg-muted transition-colors" 
    onclick={cellState.startEdit}
    onkeydown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        cellState.startEdit();
      }
    }}
    aria-label="Edit amount: {cellState.displayValue}"
  >
    <span class="flex-1">
      {cellState.displayValue}
    </span>
    <span class="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
      ✏️
    </span>
  </button>
{/if}
