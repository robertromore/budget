<script lang="ts">
  import { IconPicker, getIconByName } from '$lib/components/ui/icon-picker';
  import * as Card from '$lib/components/ui/card';

  let selectedIcon = $state('credit-card');

  function handleIconChange(event: CustomEvent<{ value: string; icon: any }>) {
    selectedIcon = event.detail.value;
    console.log('Icon changed:', event.detail);
  }

  const currentIcon = $derived(getIconByName(selectedIcon));
</script>

<div class="container mx-auto p-8 max-w-2xl">
  <Card.Root>
    <Card.Header>
      <Card.Title>Icon Picker Test</Card.Title>
      <Card.Description>
        Test the reusable icon picker component with search and categories.
      </Card.Description>
    </Card.Header>

    <Card.Content class="space-y-6">
      <!-- Icon Picker -->
      <div class="space-y-2">
        <label class="text-sm font-medium">Select Account Icon</label>
        <IconPicker
          value={selectedIcon}
          placeholder="Choose an icon..."
          onchange={handleIconChange}
          class="max-w-xs"
        />
      </div>

      <!-- Preview -->
      <div class="space-y-2">
        <label class="text-sm font-medium">Preview</label>
        <div class="p-4 border rounded-lg flex items-center gap-3">
          {#if currentIcon}
            <currentIcon.icon class="h-8 w-8 text-primary" />
            <div>
              <p class="font-medium">{currentIcon.name}</p>
              <p class="text-sm text-muted-foreground">
                Keywords: {currentIcon.keywords.join(', ')}
              </p>
            </div>
          {:else}
            <p class="text-muted-foreground">No icon selected</p>
          {/if}
        </div>
      </div>

      <!-- Value Display -->
      <div class="space-y-2">
        <label class="text-sm font-medium">Selected Value</label>
        <code class="block p-2 bg-muted rounded text-sm">
          {selectedIcon || 'null'}
        </code>
      </div>
    </Card.Content>
  </Card.Root>
</div>