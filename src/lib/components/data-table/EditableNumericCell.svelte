<script lang="ts">
  import type { EditableNumericItem } from '../types';
  import NumericInput from '../input/NumericInput.svelte';
  import { BodyRow, DataColumn } from 'svelte-headless-table';

  let { row, column, value, onUpdateValue }: {
    row: BodyRow<EditableNumericItem>;
    column: DataColumn<EditableNumericItem>;
    value: EditableNumericItem | undefined;
    onUpdateValue: (rowDataId: number, columnId: string, newValue: unknown) => void;
  } = $props();

  let open = $state(false);
  const handleSubmit = () => {
    open = false;
    if (row.isData()) {
      onUpdateValue(parseInt(row.dataId), column.id, value);
    }
  };
</script>

<NumericInput bind:amount={value} onSubmit={handleSubmit} bind:open />
