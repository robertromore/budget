<script lang="ts" generics="T extends Schema, S extends Zod.ZodTypeAny">
  import { BodyRow, DataColumn } from 'svelte-headless-table';
  import type { EditableEntityItem } from '../types';
  import EntityInput from '$lib/components/input/EntityInput.svelte';
  import type { Schema } from 'sveltekit-superforms';

  let { row, column, value, onUpdateValue, entityLabel }: {
    row: BodyRow<EditableEntityItem>;
    column: DataColumn<EditableEntityItem>;
    value: EditableEntityItem | undefined;
    onUpdateValue: (rowDataId: number, columnId: string, newValue: unknown) => void;
    entityLabel: string;
  } = $props();

  const handleSubmit = (entity: EditableEntityItem) => {
    if (row.isData()) {
      onUpdateValue(parseInt(row.dataId), column.id + 'Id', entity.id);
    }
  };
</script>

<EntityInput
  bind:entityLabel
  bind:value
  {handleSubmit}
/>
