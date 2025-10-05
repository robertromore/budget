<script lang="ts">
import type {EditableEntityItem} from '$lib/types';
import {EntityInput} from '$lib/components/input';
import type {Component as ComponentType} from 'svelte';

let {
  value,
  onUpdateValue,
  entityLabel,
  entities,
  management,
  icon,
}: {
  value?: EditableEntityItem;
  onUpdateValue: (newValue: unknown) => void;
  entityLabel: string;
  entities: EditableEntityItem[];
  management: {
    enable: boolean;
    component: ComponentType;
    onSave: (new_value: EditableEntityItem, is_new: boolean) => void;
    onDelete: (id: number) => void;
  };
  icon: ComponentType;
} = $props();

const handleSubmit = (entity?: EditableEntityItem) => {
  onUpdateValue(entity?.id);
};
</script>

<EntityInput bind:entityLabel bind:value bind:entities {icon} {handleSubmit} {management} />
