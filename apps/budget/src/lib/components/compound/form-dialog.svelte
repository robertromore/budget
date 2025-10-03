<script lang="ts">
// Framework imports
import type {Component, Snippet} from 'svelte';
import {browser} from '$app/environment';

// UI component imports
import {Button} from '$lib/components/ui/button';
import * as Dialog from '$lib/components/ui/dialog';

// Hook imports
import {useDialog} from '$lib/hooks/ui';

// Type imports
import type {HTMLAttributes} from 'svelte/elements';

interface Props extends HTMLAttributes<HTMLDivElement> {
  // Dialog configuration
  title: string;
  description?: string;
  icon?: Component;

  // State management
  open?: boolean;
  onOpenChange?: (open: boolean) => void;

  // Form handling
  onSave?: () => Promise<void> | void;
  onCancel?: () => void;
  onDelete?: () => Promise<void> | void;
  formAction?: string; // If provided, enables form submission mode
  enhance?: any; // SvelteKit enhance function from superForm

  // Button configuration
  saveLabel?: string;
  cancelLabel?: string;
  deleteLabel?: string;

  // Form state
  isDirty?: boolean;
  isValid?: boolean;
  isLoading?: boolean;

  // Snippets
  content: Snippet;
  actions?: Snippet<
    [{save: () => Promise<void>; cancel: () => void; delete?: () => Promise<void>}]
  >;

  // Styling
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

let {
  title,
  description,
  icon: Icon,
  open = $bindable(false),
  onOpenChange,
  onSave,
  onCancel,
  onDelete,
  formAction,
  enhance,
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
  deleteLabel = 'Delete',
  isDirty = false,
  isValid = true,
  isLoading = false,
  content,
  actions,
  maxWidth = 'md',
  class: className,
  id,
  style,
}: Props = $props();

// Form element reference for programmatic submission
let formElement: HTMLFormElement | null = $state(null);

// Simplified dialog state - no hook needed
let dialogOpen = $state(false);
let dialogDirty = $state(false);

// Simple open/close handlers
function handleOpen() {
  dialogOpen = true;
  if (onOpenChange) onOpenChange(true);
}

function handleClose() {
  if (isDirty && !confirm('You have unsaved changes. Are you sure you want to close?')) {
    return;
  }
  dialogOpen = false;
  if (onOpenChange) onOpenChange(false);
}

// Sync with external open prop
$effect(() => {
  if (browser) {
    dialogOpen = open;
    dialogDirty = isDirty;
  }
});

// Action handlers
async function handleSave() {
  if (!isValid || isLoading) return;

  try {
    // If formAction is provided and form element exists, use programmatic submission
    if (formAction && formElement) {
      formElement.requestSubmit(); // Triggers use:enhance and form actions
      return; // Don't close dialog here - let form handle success/failure
    }

    // Otherwise use callback-based approach
    if (onSave) {
      await onSave();
    }
    handleClose();
  } catch (error) {
    console.error('Save failed:', error);
    // Keep dialog open on error
  }
}

function handleCancel() {
  handleClose();
  if (onCancel) {
    onCancel();
  }
}

async function handleDelete() {
  if (isLoading) return;

  try {
    if (onDelete) {
      await onDelete();
    }
    handleClose();
  } catch (error) {
    console.error('Delete failed:', error);
    // Keep dialog open on error
  }
}

// Dialog size classes with better mobile responsiveness
const sizeClasses = {
  sm: 'w-full max-w-sm mx-4',
  md: 'w-full max-w-md mx-4',
  lg: 'w-full max-w-lg mx-4',
  xl: 'w-full max-w-xl mx-4',
  '2xl': 'w-full max-w-2xl mx-4',
};
</script>

<Dialog.Root bind:open={dialogOpen}>
  <Dialog.Content
    class="sm:{sizeClasses[maxWidth]} {className || ''}"
    id={id || ''}
    style={style || undefined}>
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2">
        {#if Icon}
          <Icon class="size-5" />
        {/if}
        {title}
      </Dialog.Title>
      {#if description}
        <Dialog.Description>
          {description}
        </Dialog.Description>
      {/if}
    </Dialog.Header>

    <!-- Form content -->
    {#if formAction}
      <form bind:this={formElement} method="post" action={formAction} use:enhance class="py-4">
        {@render content()}
      </form>
    {:else}
      <div class="py-4">
        {@render content()}
      </div>
    {/if}

    <!-- Dialog actions -->
    <Dialog.Footer>
      {#if actions}
        {@render actions({
          save: handleSave,
          cancel: handleCancel,
          ...(onDelete && {delete: handleDelete}),
        })}
      {:else}
        <div class="flex w-full flex-col gap-3 sm:flex-row sm:justify-between">
          <!-- Delete button (left side on desktop, full width on mobile) -->
          {#if onDelete}
            <Button type="button" variant="destructive" onclick={handleDelete} disabled={isLoading} class="sm:w-auto w-full sm:order-1 order-3">
              {deleteLabel}
            </Button>
          {:else}
            <div class="hidden sm:block"></div>
          {/if}

          <!-- Save/Cancel buttons (right side on desktop, stacked on mobile) -->
          <div class="flex flex-col gap-2 sm:flex-row sm:order-2 order-1">
            <Button type="button" variant="outline" onclick={handleCancel} disabled={isLoading} class="w-full sm:w-auto">
              {cancelLabel}
            </Button>
            <Button
              type="button"
              onclick={handleSave}
              disabled={!isValid || isLoading}
              class="{isLoading ? 'opacity-50' : ''} w-full sm:w-auto">
              {#if isLoading}
                <div class="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
              {/if}
              {saveLabel}
            </Button>
          </div>
        </div>
      {/if}
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
