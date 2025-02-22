<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { cn, keyBy } from "$lib/utils";
  import * as Command from "$lib/components/ui/command";
  import * as Popover from "$lib/components/ui/popover";
  import type { EditableEntityItem } from "$lib/types";
  import CircleUserRound from "lucide-svelte/icons/circle-user-round";
  import Plus from "lucide-svelte/icons/plus";
  import { Pencil2 } from "svelte-radix";
  import MoveLeft from "lucide-svelte/icons/move-left";
  import Check from "lucide-svelte/icons/check";
  import type { Component as ComponentType } from "svelte";

  let {
    entityLabel = $bindable(),
    entities = $bindable(),
    value = $bindable(),
    handleSubmit,
    class: className,
    management,
  }: {
    entityLabel: string;
    entities: EditableEntityItem[];
    value?: EditableEntityItem;
    handleSubmit?: (selected?: EditableEntityItem) => void;
    class?: string;
    management?: {
      enable: boolean;
      component: ComponentType;
      onSave: (new_value: EditableEntityItem, is_new: boolean) => void;
      onDelete: (id: number) => void;
    };
  } = $props();

  const findCurrentEntity = () => entities.find((entity) => entity.id == value?.id);
  let label = $derived(value?.name);
  let selected = $derived(findCurrentEntity());
  let open = $state(false);
  let manage = $state(false);
  let managingId: number = $state(0);

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

  const searchEntities = $derived(
    keyBy(
      entities.map((entity) => {
        return {
          id: entity.id,
          name: entity.name,
        };
      }),
      "id"
    )
  );
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
            "block w-full justify-start overflow-hidden text-ellipsis whitespace-nowrap text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CircleUserRound class="-mt-1 mr-1 inline-block size-4" />
          {label}
        </Button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content class="p-0" align="start">
      {#if !manage}
        <Command.Root
          filter={(value, search) => {
            return value &&
              searchEntities[value] &&
              searchEntities[value].name?.toLowerCase().includes(search)
              ? 1
              : 0;
          }}
        >
          <div class="flex">
            <Command.Input placeholder="Search {entityLabel}..." />
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
              {#each entities as entity}
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
                      <Pencil2 />
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
