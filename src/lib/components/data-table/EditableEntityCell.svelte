<script lang="ts">
  import type { EditableEntityItem } from '../types';
  import EntityInput from '$lib/components/input/EntityInput.svelte';

  let { value, onUpdateValue, entityLabel }: {
    value: EditableEntityItem | undefined;
    onUpdateValue: (newValue: unknown) => void;
    entityLabel: string;
  } = $props();

  const handleSubmit = (entity: EditableEntityItem) => {
    onUpdateValue(entity.id);
  };
</script>

<EntityInput
  bind:entityLabel
  bind:value
  {handleSubmit}
/>
