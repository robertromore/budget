<script lang="ts">
  import type { EditableEntityItem } from '../types';
  import EntityInput from '$lib/components/input/EntityInput.svelte';

  let { value, onUpdateValue, entityLabel, entities, enableManagement = false }: {
    value?: EditableEntityItem;
    onUpdateValue: (newValue: unknown) => void;
    entityLabel: string;
    entities: EditableEntityItem[];
    enableManagement: boolean;
  } = $props();

  const handleSubmit = (entity?: EditableEntityItem) => {
    onUpdateValue(entity?.id);
  };
</script>

<EntityInput
  bind:entityLabel
  bind:value
  bind:entities
  {handleSubmit}
  {enableManagement}
/>
