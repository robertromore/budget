<script lang="ts">
import {Button} from '$lib/components/ui/button';
import * as Popover from '$lib/components/ui/popover';
import {Textarea} from '$lib/components/ui/textarea';
import X from '@lucide/svelte/icons/x';
import {cn} from '$lib/utils';
import type {Component as ComponentType} from 'svelte';
import FileText from '@lucide/svelte/icons/file-text';

interface Props {
  value?: string | null;
  placeholder?: string;
  label?: string;
  icon?: ComponentType;
  displayPlaceholder?: string;
  rows?: number;
  onUpdate?: (value: string | null) => void;
  buttonClass?: string;
  buttonVariant?: 'default' | 'ghost' | 'outline';
}

let {
  value = $bindable(),
  placeholder = 'Add text...',
  label = 'Text',
  icon: Icon = FileText,
  displayPlaceholder = '—',
  rows = 4,
  onUpdate,
  buttonClass = '',
  buttonVariant = 'ghost',
}: Props = $props();

let open = $state(false);
let editValue = $state('');

// When popover opens, populate edit value
function handleOpenChange(isOpen: boolean) {
  if (isOpen) {
    editValue = value || '';
  }
  open = isOpen;
}

const displayText = $derived(value || displayPlaceholder);
const hasValue = $derived(value && value.trim() !== '');

function handleSave() {
  const trimmed = editValue.trim();
  const hasChanged = trimmed !== (value || '');

  value = trimmed || null;

  if (hasChanged && onUpdate) {
    onUpdate(trimmed || null);
  }

  open = false;
}

function handleClear() {
  value = null;

  if (onUpdate) {
    onUpdate(null);
  }

  open = false;
}

function handleCancel() {
  editValue = value || '';
  open = false;
}
</script>

<div class="w-full">
  <Popover.Root bind:open onOpenChange={handleOpenChange}>
    <Popover.Trigger>
      {#snippet child({props})}
        <Button
          {...props}
          variant={buttonVariant}
          class={cn(
            'w-full h-8 text-xs justify-start overflow-hidden text-ellipsis whitespace-nowrap px-2',
            !hasValue && 'text-muted-foreground',
            buttonClass
          )}>
          <Icon class="mr-2 h-3 w-3 flex-shrink-0" />
          <span class="truncate">{displayText}</span>
        </Button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content class="w-[400px] p-4" align="start">
      <div class="space-y-3">
        <div class="space-y-2">
          <label for="textarea-input" class="text-sm font-medium">
            {label}
          </label>
          <Textarea
            id="textarea-input"
            bind:value={editValue}
            {placeholder}
            {rows}
            class="resize-none"
          />
        </div>

        <div class="flex gap-2 justify-end">
          {#if hasValue}
            <Button
              variant="ghost"
              size="sm"
              onclick={handleClear}
              class="text-destructive hover:text-destructive">
              <X class="mr-2 h-3 w-3" />
              Clear
            </Button>
          {/if}
          <Button variant="ghost" size="sm" onclick={handleCancel}>
            Cancel
          </Button>
          <Button size="sm" onclick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </Popover.Content>
  </Popover.Root>
</div>
