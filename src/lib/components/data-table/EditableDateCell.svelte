<script lang="ts">
  import { type DateValue } from '@internationalized/date';
  import { BodyRow, DataColumn } from 'svelte-headless-table';
  import DateInput from '$lib/components/input/DateInput.svelte';
  import type { EditableDateItem } from '../types';

  let { row, column, value, onUpdateValue } = $props<{
    row: BodyRow<EditableDateItem>;
    column: DataColumn<EditableDateItem>;
    value: DateValue | undefined;
    onUpdateValue: (rowDataId: number, columnId: string, newValue: unknown) => void;
  }>();

  const handleSubmit = (new_value: DateValue | DateValue[] | undefined) => {
    if (row.isData() && new_value) {
      if (Array.isArray(new_value)) {
        new_value = new_value[0];
      }
      onUpdateValue(parseInt(row.dataId), column.id, new_value);
    }
  };
</script>

<DateInput {value} {handleSubmit} />
