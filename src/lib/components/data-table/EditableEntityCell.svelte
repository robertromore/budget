<script lang="ts">
  import { BodyRow, DataColumn } from 'svelte-headless-table';
  import type { EditableEntityItem } from '../types';
  import EntityManager from '$lib/components/input/EntityInput.svelte';

  let { row, column, value, onUpdateValue, entityLabel } = $props<{
    row: BodyRow<EditableEntityItem>;
    column: DataColumn<EditableEntityItem>;
    value: EditableEntityItem | undefined;
    onUpdateValue: (rowDataId: number, columnId: string, newValue: unknown) => void;
    entityLabel: string
  }>();

  const handleSubmit = (entity: EditableEntityItem) => {
    if (row.isData()) {
      onUpdateValue(parseInt(row.dataId), column.id + 'Id', entity.id);
    }
  };
</script>

<EntityManager
  bind:entityLabel
  bind:value
  {handleSubmit}
/>
