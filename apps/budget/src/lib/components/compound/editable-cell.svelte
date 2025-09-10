<script lang="ts" generics="T">
  // Framework imports
  import type { Snippet, Component } from "svelte";
  
  // UI component imports
  import { Button } from "$lib/components/ui/button";
  
  // Hook imports
  import { useEditableCell } from "$lib/hooks/ui";
  
  // Type imports
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "$lib/utils";

  interface Props extends HTMLAttributes<HTMLDivElement> {
    // Core data
    value: T;
    onSave: (value: T) => Promise<void> | void;
    
    // Configuration
    validator?: (value: T) => boolean;
    formatter?: (value: T) => string;
    placeholder?: string;
    
    // Event handlers
    onCancel?: () => void;
    onStartEdit?: () => void;
    
    // Snippets for custom rendering
    display?: Snippet<[{ value: T; displayValue: string; startEdit: () => void }]>;
    editor: Snippet<[{ 
      value: T; 
      updateValue: (value: T) => void; 
      saveEdit: () => Promise<void>;
      cancelEdit: () => void;
      isValid: boolean;
    }]>;
    
    // Styling
    editIcon?: Component;
    saveIcon?: Component;
    cancelIcon?: Component;
  }

  let {
    value,
    onSave,
    validator,
    formatter,
    placeholder = "Enter value...",
    onCancel,
    onStartEdit,
    display,
    editor,
    editIcon: EditIcon,
    saveIcon: SaveIcon,
    cancelIcon: CancelIcon,
    class: className,
    ...restProps
  }: Props = $props();

  // Use the editable cell hook
  const cellState = useEditableCell({
    initialValue: value,
    onSave,
    ...(onCancel && { onCancel }),
    ...(validator && { validator }),
    ...(formatter && { formatter })
  });

  // Handle external value changes
  $effect(() => {
    if (value !== cellState.currentValue && !cellState.isEditing) {
      cellState.updateValue(value);
    }
  });

  function handleStartEdit() {
    cellState.startEdit();
    if (onStartEdit) {
      onStartEdit();
    }
  }

  // Default icons
  const defaultEditIcon = () => "✏️";
  const defaultSaveIcon = () => "✅";
  const defaultCancelIcon = () => "❌";
</script>

<div class={cn("editable-cell", className)} {...restProps}>
  {#if cellState.isEditing}
    <!-- Edit mode -->
    <div class="flex items-center gap-2">
      <!-- Custom editor snippet -->
      {@render editor({
        value: cellState.currentValue,
        updateValue: cellState.updateValue,
        saveEdit: cellState.saveEdit,
        cancelEdit: cellState.cancelEdit,
        isValid: cellState.isValid
      })}
      
      <!-- Action buttons -->
      <div class="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onclick={cellState.saveEdit}
          disabled={!cellState.isValid}
          class="h-6 w-6 p-0"
        >
          {#if SaveIcon}
            <SaveIcon class="size-3" />
          {:else}
            <span class="text-xs">{defaultSaveIcon()}</span>
          {/if}
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onclick={cellState.cancelEdit}
          class="h-6 w-6 p-0"
        >
          {#if CancelIcon}
            <CancelIcon class="size-3" />
          {:else}
            <span class="text-xs">{defaultCancelIcon()}</span>
          {/if}
        </Button>
      </div>
    </div>
  {:else}
    <!-- Display mode -->
    {#if display}
      {@render display({
        value: cellState.currentValue,
        displayValue: cellState.displayValue,
        startEdit: handleStartEdit
      })}
    {:else}
      <!-- Default display -->
      <div class="flex items-center justify-between group">
        <span class="flex-1">
          {cellState.displayValue || placeholder}
        </span>
        
        <Button
          variant="ghost"
          size="sm"
          onclick={handleStartEdit}
          class="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {#if EditIcon}
            <EditIcon class="size-3" />
          {:else}
            <span class="text-xs">{defaultEditIcon()}</span>
          {/if}
        </Button>
      </div>
    {/if}
  {/if}

  {#if cellState.hasChanges && !cellState.isEditing}
    <div class="text-xs text-muted-foreground mt-1">
      Unsaved changes
    </div>
  {/if}
</div>

<style>
  .editable-cell {
    min-height: 2rem;
    padding: 0.25rem;
    border-radius: 0.375rem;
    transition: background-color 0.15s ease-in-out;
  }
  
  .editable-cell:hover {
    background-color: hsl(var(--muted));
  }
</style>