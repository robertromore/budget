<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { cn } from "$lib/utils";
  import * as Command from "$lib/components/ui/command";
  import * as Popover from "$lib/components/ui/popover";
  import type { EditableEntityItem } from "$lib/types";
  import Plus from "@lucide/svelte/icons/plus";
  import Pencil from "@lucide/svelte/icons/pencil";
  import MoveLeft from "@lucide/svelte/icons/move-left";
  import Check from "@lucide/svelte/icons/check";
  import type { Component as ComponentType } from "svelte";
  import Fuse from 'fuse.js';

  let {
    entityLabel = $bindable(),
    entities = $bindable(),
    defaultValue,
    value = $bindable(),
    handleSubmit,
    class: className,
    buttonClass,
    management,
    icon: Icon,
  }: {
    entityLabel: string;
    entities: EditableEntityItem[];
    value?: EditableEntityItem;
    defaultValue?: number | unknown;
    handleSubmit?: (selected?: EditableEntityItem) => void;
    class?: string;
    buttonClass?: string;
    management?: {
      enable: boolean;
      component: ComponentType;
      onSave: (new_value: EditableEntityItem, is_new: boolean) => void;
      onDelete: (id: number) => void;
    };
    icon: ComponentType;
  } = $props();

  const findCurrentEntity = () => entities.find((entity) => entity.id == value?.id);
  let label = $derived(value?.name);
  let selected = $derived(findCurrentEntity());
  let open = $state(false);
  let manage = $state(false);
  let managingId: number = $state(0);

  if (defaultValue) {
    const defaultEntity = entities.find((entity) => entity.id === defaultValue);
    if (defaultEntity) {
      value = defaultEntity;
    }
  }

  const toggleManageScreen = (event: MouseEvent) => {
    manage = !manage;
    if (!manage) {
      managingId = 0;
    }
  };

  const onSave = (new_entity: EditableEntityItem, is_new: boolean) => {
    management?.onSave(new_entity, is_new);
    managingId = 0;
    manage = false;
    if (handleSubmit) handleSubmit(new_entity);
  };

  const onDelete = (id: number) => {
    management?.onDelete(id);
    managingId = 0;
    manage = false;
    if (handleSubmit) handleSubmit(undefined);
  };

  const addNew = () => {
    managingId = 0;
    manage = true;
  };

  let searchValue = $state("");
  const fused = $derived(new Fuse(entities, { keys: ["name"], includeScore: true }));

  let visibleEntities = $state(entities);
  $effect(() => {
    if (searchValue) {
      visibleEntities = fused.search(searchValue).map((result) => result.item);
    } else {
      visibleEntities = entities;
    }
  });
</script>

<div class={cn("flex items-center space-x-4", className)}>
  <Popover.Root
    bind:open
    onOpenChange={(open) => {
      if (!open) {
        manage = false;
      }
    }}
  >
    <Popover.Trigger>
      {#snippet child({ props })}
        <Button
          {...props}
          variant="outline"
          class={cn(
            "block justify-start overflow-hidden text-ellipsis whitespace-nowrap text-left font-normal",
            !value && "text-muted-foreground",
            buttonClass || "w-48"
          )}
        >
          <Icon class="-mt-1 mr-1 inline-block size-4"></Icon>
          {label}
        </Button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content class="p-0" align="start">
      {#if !manage}
        <Command.Root shouldFilter={false}>
          <div class="flex">
            <Command.Input placeholder="Search {entityLabel}..." bind:value={searchValue} />
            {#if management?.enable}
              <Button
                size="icon"
                class="h-11 w-12 rounded-none border-b shadow-none"
                onclick={addNew}
              >
                <Plus />
              </Button>
            {/if}
          </div>
          <Command.List>
            <Command.Empty>No results found.</Command.Empty>
            <Command.Group>
              {#each visibleEntities as entity}
                <Command.Item
                  value={entity.id + ""}
                  class={cn(value?.id == entity.id && "bg-muted")}
                  onSelect={() => {
                    value = entity;
                    if (handleSubmit) {
                      handleSubmit(entity);
                    }
                  }}
                >
                  <Check class={cn(selected?.id != entity.id && "text-transparent")} />
                  <div class="flex-grow">
                    {entity.name}
                  </div>
                  {#if management?.enable}
                    <Button
                      variant="outline"
                      size="icon"
                      class="mr-1 p-1 text-xs"
                      onclick={(e: MouseEvent) => {
                        managingId = entity.id;
                        toggleManageScreen(e);
                      }}
                    >
                      <Pencil />
                    </Button>
                  {/if}
                </Command.Item>
              {/each}
            </Command.Group>
          </Command.List>
        </Command.Root>
      {:else}
        <div class="p-2">
          <Button variant="outline" size="icon" onclick={toggleManageScreen}>
            <MoveLeft class="size-4" />
          </Button>
          {#if managingId > 0 && management}
            <management.component id={managingId} {onSave} {onDelete}></management.component>
          {:else if management}
            <management.component {onSave}></management.component>
          {/if}
        </div>
      {/if}
    </Popover.Content>
  </Popover.Root>
</div>
