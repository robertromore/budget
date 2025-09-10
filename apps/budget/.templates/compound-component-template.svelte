<script lang="ts" generics="T">
  // Framework imports
  import type { Snippet, Component } from "svelte";
  
  // Hook imports
  import { useDialog, useEditableCell, useServerSync } from "$lib/hooks/ui";
  
  // Component imports  
  import { FormDialog, EditableCell } from "$lib/components/compound";
  import { Button } from "$lib/components/ui/button";
  
  // Type imports
  import type { HTMLAttributes } from "svelte/elements";

  // --- Component Props Interface ---
  interface Props extends HTMLAttributes<HTMLDivElement> {
    // Data props
    items: T[];
    selectedItem?: T;
    
    // Behavior props
    allowEdit?: boolean;
    allowDelete?: boolean;
    allowAdd?: boolean;
    
    // Event handlers
    onItemSave?: (item: T) => Promise<void>;
    onItemDelete?: (id: string) => Promise<void>;
    onItemAdd?: (item: T) => Promise<void>;
    
    // Customization
    title: string;
    icon?: Component;
    
    // Snippets for flexible rendering
    itemContent: Snippet<[{ item: T; isEditing: boolean }]>;
    itemEditor?: Snippet<[{ item: T; updateItem: (item: T) => void }]>;
    emptyState?: Snippet;
  }

  // --- Props Destructuring ---
  let {
    items,
    selectedItem,
    allowEdit = true,
    allowDelete = true,  
    allowAdd = true,
    onItemSave,
    onItemDelete,
    onItemAdd,
    title,
    icon: Icon,
    itemContent,
    itemEditor,
    emptyState,
    class: className,
    ...restProps
  }: Props = $props();

  // --- Hooks Usage Examples ---
  
  // Dialog management for add/edit forms
  const addDialog = useDialog({
    onClose: () => {
      newItem = getEmptyItem();
    }
  });

  const editDialog = useDialog({
    preventCloseWhenDirty: true
  });

  // Server sync for optimistic updates
  const serverSync = useServerSync<T>({
    onSuccess: (data) => {
      console.log('Operation successful:', data);
    },
    onError: (error, rollback) => {
      console.error('Operation failed:', error);
      rollback();
    }
  });

  // --- Local State ---
  let newItem = $state<T>(getEmptyItem());
  let editingItem = $state<T | null>(null);

  // --- Derived State ---
  const hasItems = $derived(items.length > 0);
  const canPerformActions = $derived(!serverSync.isLoading);

  // --- Event Handlers ---
  async function handleAddItem() {
    if (!onItemAdd) return;
    
    await serverSync.execute(
      () => {
        // Optimistic update - add to local state
        items.push(newItem);
      },
      () => onItemAdd(newItem)
    );
    
    addDialog.close();
  }

  async function handleEditItem(item: T) {
    if (!onItemSave) return;
    
    await serverSync.execute(
      () => {
        // Optimistic update - update local state
        const index = items.findIndex(i => getId(i) === getId(item));
        if (index >= 0) {
          items[index] = item;
        }
      },
      () => onItemSave(item)
    );
    
    editDialog.close();
  }

  async function handleDeleteItem(id: string) {
    if (!onItemDelete) return;
    
    await serverSync.execute(
      () => {
        // Optimistic update - remove from local state
        const index = items.findIndex(i => getId(i) === id);
        if (index >= 0) {
          items.splice(index, 1);
        }
      },
      () => onItemDelete(id)
    );
  }

  // --- Helper Functions ---
  function getEmptyItem(): T {
    // This should be implemented based on the specific type T
    return {} as T;
  }

  function getId(item: T): string {
    // This should extract the ID from item based on type T
    return (item as any).id || '';
  }

  function openEditDialog(item: T) {
    editingItem = structuredClone(item);
    editDialog.open();
  }
</script>

<!-- Compound Component Structure -->
<div class="space-y-4 {className || ''}" {...restProps}>
  <!-- Header with actions -->
  <div class="flex items-center justify-between">
    <h2 class="text-lg font-semibold flex items-center gap-2">
      {#if Icon}
        <Icon class="size-5" />
      {/if}
      {title}
      <span class="text-sm font-normal text-muted-foreground">
        ({items.length})
      </span>
    </h2>
    
    {#if allowAdd}
      <Button 
        onclick={addDialog.open}
        disabled={!canPerformActions}
        size="sm"
      >
        Add Item
      </Button>
    {/if}
  </div>

  <!-- Items List -->
  {#if hasItems}
    <div class="space-y-2">
      {#each items as item (getId(item))}
        <div class="border rounded-lg p-4">
          <!-- Item content with edit capability -->
          {#if allowEdit}
            <EditableCell
              value={item}
              onSave={(updatedItem) => handleEditItem(updatedItem)}
              class="mb-2"
            >
              {#snippet display({ value, startEdit })}
                {@render itemContent({ item: value, isEditing: false })}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onclick={startEdit}
                  class="ml-auto"
                >
                  Edit
                </Button>
              {/snippet}
              
              {#snippet editor({ value, updateValue })}
                {#if itemEditor}
                  {@render itemEditor({ item: value, updateItem: updateValue })}
                {:else}
                  <!-- Default editor -->
                  <div class="space-y-2">
                    <p>Edit item (no custom editor provided)</p>
                  </div>
                {/if}
              {/snippet}
            </EditableCell>
          {:else}
            {@render itemContent({ item, isEditing: false })}
          {/if}
          
          <!-- Actions -->
          <div class="flex justify-end gap-2 mt-2">
            {#if allowDelete}
              <Button 
                variant="destructive" 
                size="sm"
                onclick={() => handleDeleteItem(getId(item))}
                disabled={!canPerformActions}
              >
                Delete
              </Button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {:else if emptyState}
    {@render emptyState()}
  {:else}
    <!-- Default empty state -->
    <div class="text-center py-8 text-muted-foreground">
      <p>No items found.</p>
      {#if allowAdd}
        <Button variant="outline" onclick={addDialog.open} class="mt-2">
          Add your first item
        </Button>
      {/if}
    </div>
  {/if}

  <!-- Add Item Dialog -->
  {#if allowAdd}
    <FormDialog
      bind:open={addDialog.isOpen}
      title="Add New Item"
      {icon}
      onSave={handleAddItem}
      onCancel={addDialog.cancel}
      isValid={!!newItem}
      isLoading={serverSync.isLoading}
    >
      {#snippet content()}
        <!-- Add item form content -->
        <div class="space-y-4">
          <p>Add item form would go here.</p>
          <!-- Custom form fields based on type T -->
        </div>
      {/snippet}
    </FormDialog>
  {/if}

  <!-- Edit Item Dialog -->
  {#if allowEdit && editingItem}
    <FormDialog
      bind:open={editDialog.isOpen}
      title="Edit Item"
      {icon}
      onSave={() => handleEditItem(editingItem!)}
      onCancel={editDialog.cancel}
      onDelete={() => allowDelete ? handleDeleteItem(getId(editingItem!)) : undefined}
      isValid={!!editingItem}
      isLoading={serverSync.isLoading}
      isDirty={editingItem !== selectedItem}
    >
      {#snippet content()}
        {#if itemEditor && editingItem}
          {@render itemEditor({ 
            item: editingItem, 
            updateItem: (updated) => { editingItem = updated; }
          })}
        {:else}
          <div class="space-y-4">
            <p>Edit item form would go here.</p>
          </div>
        {/if}
      {/snippet}
    </FormDialog>
  {/if}
</div>