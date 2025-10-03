<script lang="ts">
import {Button} from '$lib/components/ui/button';
import {cn} from '$lib/utils';
import * as Command from '$lib/components/ui/command';
import * as Popover from '$lib/components/ui/popover';
import type {EditableEntityItem} from '$lib/types';
import Plus from '@lucide/svelte/icons/plus';
import Pencil from '@lucide/svelte/icons/pencil';
import MoveLeft from '@lucide/svelte/icons/move-left';
import Check from '@lucide/svelte/icons/check';
import CreditCard from '@lucide/svelte/icons/credit-card';
import type {Component as ComponentType} from 'svelte';
import Fuse from 'fuse.js';
import {getIconByName} from '$lib/components/ui/icon-picker/icon-categories';

interface ManagementOptions {
  enable: boolean;
  component: ComponentType;
  onSave: (new_value: EditableEntityItem, is_new: boolean) => void;
  onDelete: (id: number) => void;
}

interface AccountEntity extends EditableEntityItem {
  accountIcon?: string | null;
  accountColor?: string | null;
  accountType?: string | null;
  institution?: string | null;
}

interface Props {
  entityLabel: string;
  entities: AccountEntity[];
  value?: AccountEntity;
  defaultValue?: number | unknown;
  handleSubmit?: (selected?: AccountEntity) => void;
  class?: string;
  buttonClass?: string;
  management?: ManagementOptions;
}

let {
  entityLabel = $bindable(),
  entities = $bindable(),
  defaultValue,
  value = $bindable(),
  handleSubmit,
  class: className,
  buttonClass,
  management,
}: Props = $props();

let label = $derived(value?.name);
let selected = $derived.by(() => entities.find((entity) => entity.id == value?.id));
let open = $state(false);
let manage = $state(false);
let managingId: number = $state(0);

if (defaultValue) {
  const defaultEntity = entities.find((entity) => entity.id === defaultValue);
  if (defaultEntity) {
    value = defaultEntity;
  }
}

const onSave = (new_entity: EditableEntityItem, is_new: boolean) => {
  management?.onSave(new_entity, is_new);
  managingId = 0;
  manage = false;
  value = new_entity as AccountEntity; // Select the saved entity
  if (handleSubmit) handleSubmit(new_entity as AccountEntity);
  open = false; // Close the dropdown
};

const onDelete = (id: number) => {
  management?.onDelete(id);
  managingId = 0;
  manage = false;
  // Clear selection if the deleted entity was selected
  if (value?.id === id) {
    value = undefined;
    if (handleSubmit) handleSubmit(undefined);
  }
  open = false; // Close the dropdown
};

const addNew = () => {
  managingId = 0;
  manage = true;
};

let searchValue = $state('');
const fused = $derived(new Fuse(entities, {keys: ['name'], includeScore: true}));

let visibleEntities = $state(entities);
$effect(() => {
  if (searchValue) {
    visibleEntities = fused.search(searchValue).map((result) => result.item);
  } else {
    visibleEntities = entities;
  }
});

function getAccountIcon(account: AccountEntity) {
  if (account.accountIcon) {
    const iconData = getIconByName(account.accountIcon);
    if (iconData?.icon) {
      return iconData.icon;
    }
  }
  return CreditCard;
}
</script>

<div class={cn('flex items-center space-x-4', className)}>
  <Popover.Root
    bind:open
    onOpenChange={(open) => {
      if (!open) {
        manage = false;
      }
    }}>
    <Popover.Trigger>
      {#snippet child({props})}
        <Button
          {...props}
          variant="outline"
          class={cn(
            'block justify-start overflow-hidden text-left font-normal text-ellipsis whitespace-nowrap',
            !value && 'text-muted-foreground',
            buttonClass || 'w-48'
          )}>
          {#if value}
            {@const AccountIcon = getAccountIcon(value)}
            <AccountIcon
              class="-mt-1 mr-1 inline-block size-4"
              style={value.accountColor ? `color: ${value.accountColor}` : ''}
            />
          {:else}
            <CreditCard class="-mt-1 mr-1 inline-block size-4" />
          {/if}
          {label}
        </Button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content class="p-0 overflow-hidden" align="start">
      <!-- Sliding Panel Container -->
      <div class="grid grid-cols-2 transition-transform duration-300 ease-in-out" style="width: 200%; transform: translateX({manage ? '-50%' : '0%'})">

        <!-- Panel 1: Account List -->
        <div class="w-full min-w-0">
          <Command.Root shouldFilter={false}>
            <div class="flex">
              <Command.Input placeholder="Search {entityLabel}..." bind:value={searchValue} />
              {#if management?.enable}
                <Button
                  size="icon"
                  class="rounded-none border-l-0 border-b shadow-none"
                  onclick={addNew}>
                  <Plus />
                </Button>
              {/if}
            </div>
            <Command.List>
              <Command.Empty>No results found.</Command.Empty>
              <Command.Group>
                {#each visibleEntities as entity}
                  {@const AccountIcon = getAccountIcon(entity)}
                  <Command.Item
                    value={entity.id + ''}
                    class={cn(value?.id == entity.id && 'bg-muted')}
                    onSelect={() => {
                      value = entity;
                      if (handleSubmit) {
                        handleSubmit(entity);
                      }
                      open = false;
                    }}>
                    <Check class={cn(selected?.id != entity.id && 'text-transparent')} />
                    <div class="flex items-center gap-2 flex-grow">
                      <AccountIcon
                        class="h-4 w-4"
                        style={entity.accountColor ? `color: ${entity.accountColor}` : ''}
                      />
                      <div class="flex flex-col">
                        <span class="font-medium">{entity.name}</span>
                        {#if entity.accountType || entity.institution}
                          <span class="text-xs text-muted-foreground">
                            {#if entity.accountType}
                              <span class="capitalize">{entity.accountType.replace('_', ' ')}</span>
                            {/if}
                            {#if entity.institution}
                              <span>• {entity.institution}</span>
                            {/if}
                          </span>
                        {/if}
                      </div>
                    </div>
                    {#if management?.enable}
                      <Button
                        variant="outline"
                        size="icon"
                        class="mr-1 p-1 text-xs"
                        onclick={(e: MouseEvent) => {
                          e.stopPropagation();
                          managingId = entity.id;
                          manage = true;
                        }}>
                        <Pencil />
                      </Button>
                    {/if}
                  </Command.Item>
                {/each}
              </Command.Group>
            </Command.List>
          </Command.Root>
        </div>

        <!-- Panel 2: Management Form -->
        <div class="w-full min-w-0 p-4">
          <div class="flex items-center gap-2 mb-4">
            <Button
              variant="outline"
              size="icon"
              onclick={() => {
                manage = false;
                managingId = 0;
              }}>
              <MoveLeft class="size-4" />
            </Button>
            <h3 class="text-sm font-medium">
              {managingId > 0 ? `Edit ${entityLabel}` : `Add ${entityLabel}`}
            </h3>
          </div>
          {#if management}
            {#if managingId > 0}
              <management.component id={managingId} {onSave} {onDelete}></management.component>
            {:else}
              <management.component {onSave}></management.component>
            {/if}
          {/if}
        </div>

      </div>
    </Popover.Content>
  </Popover.Root>
</div>
