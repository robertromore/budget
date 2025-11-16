<script lang="ts">
import * as Popover from '$lib/components/ui/popover';
import * as Select from '$lib/components/ui/select';
import {Input} from '$lib/components/ui/input';
import {Button, buttonVariants} from '$lib/components/ui/button';
import {Badge} from '$lib/components/ui/badge';
import {Search, X} from '@lucide/svelte/icons';
import {ICON_CATEGORIES, searchIcons, getIconByName, type IconOption} from './icon-categories';

interface Props {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  class?: string;
  onchange?: (event: CustomEvent<{value: string; icon: IconOption | undefined}>) => void;
}

let {
  value = '',
  placeholder = 'Select an icon',
  disabled = false,
  class: className = '',
  onchange,
}: Props = $props();

let open = $state(false);
let searchQuery = $state('');
let selectedCategory = $state('Finance & Banking');

// Get currently selected icon with safe rendering
const selectedIconData = $derived.by(() => {
  if (!value || typeof value !== 'string' || value.trim() === '') {
    return {hasIcon: false, name: '', component: null};
  }
  const icon = getIconByName(value);
  if (!icon || !icon.icon || typeof icon.icon !== 'function') {
    return {hasIcon: false, name: '', component: null};
  }
  return {hasIcon: true, name: icon.name, component: icon.icon};
});

// Filter icons based on search
const filteredIcons = $derived(() => {
  if (searchQuery.trim()) {
    return searchIcons(searchQuery);
  }

  const category = ICON_CATEGORIES.find((cat) => cat.label === selectedCategory);
  return category?.icons || [];
});

function handleIconSelect(iconName: string) {
  const icon = getIconByName(iconName);
  const event = new CustomEvent('change', {detail: {value: iconName, icon}});
  onchange?.(event);
  open = false;
  searchQuery = '';
}

function handleClear() {
  const event = new CustomEvent('change', {detail: {value: '', icon: undefined}});
  onchange?.(event);
  open = false;
  searchQuery = '';
}

function handleSearchInput(event: Event) {
  const target = event.target as HTMLInputElement;
  searchQuery = target.value;
}

function handleKeydown(event: KeyboardEvent, iconName: string) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    handleIconSelect(iconName);
  }
}
</script>

<Popover.Root bind:open>
  <Popover.Trigger class={buttonVariants({variant: 'outline'})}>
    <div class="flex items-center gap-2">
      {#if selectedIconData.hasIcon}
        <selectedIconData.component class="h-4 w-4" />
        <span>{selectedIconData.name}</span>
      {:else}
        <span class="text-muted-foreground">{placeholder}</span>
      {/if}
    </div>
  </Popover.Trigger>

  <Popover.Content class="w-80 p-0" align="start">
    <div class="flex h-96 flex-col">
      <!-- Search Header -->
      <div class="border-b p-3">
        <div class="relative">
          <Search
            class="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
          <Input
            placeholder="Search icons..."
            value={searchQuery}
            oninput={handleSearchInput}
            class="pl-9" />
        </div>
      </div>

      {#if searchQuery.trim()}
        <!-- Search Results -->
        <div class="flex-1 overflow-y-auto p-3">
          <div class="mb-3 flex items-center gap-2">
            <Badge variant="secondary">
              {filteredIcons().length} result{filteredIcons().length !== 1 ? 's' : ''}
            </Badge>
          </div>

          <div class="grid grid-cols-6 gap-2">
            {#each filteredIcons() as icon (icon.name)}
              {#if icon.icon && typeof icon.icon === 'function'}
                <Button
                  variant="ghost"
                  size="sm"
                  class="hover:bg-accent flex h-12 w-12 flex-col items-center justify-center p-2"
                  onclick={() => handleIconSelect(icon.name)}
                  onkeydown={(e) => handleKeydown(e, icon.name)}
                  title={icon.name}>
                  {@const Icon = icon.icon}
                  <Icon class="h-5 w-5" />
                </Button>
              {/if}
            {/each}
          </div>

          {#if filteredIcons().length === 0}
            <div class="text-muted-foreground py-8 text-center">
              <Search class="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>No icons found for "{searchQuery}"</p>
              <p class="text-sm">Try different keywords</p>
            </div>
          {/if}
        </div>
      {:else}
        <!-- Category Dropdown -->
        <div class="border-b p-3">
          <Select.Root type="single" bind:value={selectedCategory}>
            <Select.Trigger class="w-full">
              <span class="text-sm">{selectedCategory}</span>
            </Select.Trigger>
            <Select.Content>
              {#each ICON_CATEGORIES as category}
                <Select.Item value={category.label} class="text-sm">
                  <div class="flex flex-col">
                    <span>{category.label}</span>
                    <span class="text-muted-foreground text-xs">{category.description}</span>
                  </div>
                </Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <!-- Icons Grid -->
        <div class="flex-1 overflow-y-auto p-3">
          <div class="mb-3">
            <Badge variant="secondary">
              {filteredIcons().length} icon{filteredIcons().length !== 1 ? 's' : ''}
            </Badge>
          </div>

          <div class="grid grid-cols-6 gap-2">
            {#each filteredIcons() as icon (icon.name)}
              {#if icon.icon && typeof icon.icon === 'function'}
                <Button
                  variant="ghost"
                  size="sm"
                  class="hover:bg-accent flex h-12 w-12 flex-col items-center justify-center p-2 {value ===
                  icon.name
                    ? 'bg-accent border-primary border-2'
                    : ''}"
                  onclick={() => handleIconSelect(icon.name)}
                  onkeydown={(e) => handleKeydown(e, icon.name)}
                  title={`${icon.name} - ${icon.keywords.join(', ')}`}>
                  {@const Icon = icon.icon}
                  <Icon class="h-5 w-5" />
                </Button>
              {/if}
            {/each}
          </div>

          {#if filteredIcons().length === 0}
            <div class="text-muted-foreground py-8 text-center">
              <Search class="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>No icons found in this category</p>
              <p class="text-sm">Try selecting a different category</p>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </Popover.Content>
</Popover.Root>
