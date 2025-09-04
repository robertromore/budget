<script lang="ts">
  // Framework imports
  import type { Snippet, Component } from "svelte";
  
  // UI component imports
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  
  // Hook imports
  import { useDialog } from "$lib/hooks/ui";
  
  // Type imports
  import type { HTMLAttributes } from "svelte/elements";

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
    actions?: Snippet<[{ save: () => void; cancel: () => void; delete?: () => void }]>;
    
    // Styling
    maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
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
    saveLabel = "Save",
    cancelLabel = "Cancel", 
    deleteLabel = "Delete",
    isDirty = false,
    isValid = true,
    isLoading = false,
    content,
    actions,
    maxWidth = "md",
    class: className,
    ...restProps
  }: Props = $props();

  // Use dialog hook for state management
  const dialog = useDialog({
    initialOpen: open,
    onOpen: () => {
      if (onOpenChange) onOpenChange(true);
    },
    onClose: () => {
      if (onOpenChange) onOpenChange(false);
    },
    onCancel,
    preventCloseWhenDirty: true
  });

  // Sync external open state with dialog hook
  $effect(() => {
    if (open !== dialog.isOpen) {
      if (open) {
        dialog.open();
      } else {
        dialog.close();
      }
    }
  });

  $effect(() => {
    open = dialog.isOpen;
    dialog.setDirty(isDirty);
  });

  // Action handlers
  async function handleSave() {
    if (!isValid || isLoading) return;
    
    try {
      if (onSave) {
        await onSave();
      }
      dialog.close();
    } catch (error) {
      console.error("Save failed:", error);
      // Keep dialog open on error
    }
  }

  function handleCancel() {
    if (isDirty) {
      // Could show confirmation dialog here
      dialog.cancel();
    } else {
      dialog.cancel();
    }
  }

  async function handleDelete() {
    if (isLoading) return;
    
    try {
      if (onDelete) {
        await onDelete();
      }
      dialog.close();
    } catch (error) {
      console.error("Delete failed:", error);
      // Keep dialog open on error
    }
  }

  // Dialog size classes
  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md", 
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl"
  };
</script>

<Dialog.Root bind:open={dialog.isOpen}>
  <Dialog.Content class="sm:{sizeClasses[maxWidth]} {className || ''}" {...restProps}>
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
    <div class="py-4">
      {@render content()}
    </div>

    <!-- Dialog actions -->
    <Dialog.Footer>
      {#if actions}
        {@render actions({ 
          save: handleSave, 
          cancel: handleCancel, 
          delete: onDelete ? handleDelete : undefined 
        })}
      {:else}
        <div class="flex justify-between w-full">
          <!-- Delete button (left side) -->
          {#if onDelete}
            <Button 
              type="button" 
              variant="destructive" 
              onclick={handleDelete}
              disabled={isLoading}
            >
              {deleteLabel}
            </Button>
          {:else}
            <div></div>
          {/if}

          <!-- Save/Cancel buttons (right side) -->
          <div class="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onclick={handleCancel}
              disabled={isLoading}
            >
              {cancelLabel}
            </Button>
            <Button 
              type="button" 
              onclick={handleSave}
              disabled={!isValid || isLoading}
              class={isLoading ? "opacity-50" : ""}
            >
              {#if isLoading}
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {/if}
              {saveLabel}
            </Button>
          </div>
        </div>
      {/if}
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>