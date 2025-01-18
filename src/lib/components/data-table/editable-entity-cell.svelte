<script lang="ts">
  import type { EditableEntityItem } from '$lib/types';
  import EntityInput from '$lib/components/input/entity-input.svelte';
  import type { Component } from 'svelte';

  let {
    value,
    onUpdateValue,
    entityLabel,
    entities,
    management
  }: {
    value?: EditableEntityItem;
    onUpdateValue: (newValue: unknown) => void;
    entityLabel: string;
    entities: EditableEntityItem[];
    management: {
      enable: boolean;
      component: Component;
      onSave: (new_value: EditableEntityItem, is_new: boolean) => void;
      onDelete: (id: number) => void;
    }
  } = $props();

  const handleSubmit = (entity?: EditableEntityItem) => {
    onUpdateValue(entity?.id);
  };
</script>

<EntityInput bind:entityLabel bind:value bind:entities {handleSubmit} {management} />
