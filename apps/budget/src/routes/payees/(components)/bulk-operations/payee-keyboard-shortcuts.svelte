<script lang="ts">
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as Dialog from '$lib/components/ui/dialog';
import { Kbd } from '$lib/components/ui/kbd';
import { ScrollArea } from '$lib/components/ui/scroll-area';

import { PayeeBulkOperationsState } from '$lib/states/ui/payee-bulk-operations.svelte';
// Icons
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import ArrowUp from '@lucide/svelte/icons/arrow-up';
import Command from '@lucide/svelte/icons/command';
import Copy from '@lucide/svelte/icons/copy';
import Keyboard from '@lucide/svelte/icons/keyboard';
import MousePointer from '@lucide/svelte/icons/mouse-pointer';
import X from '@lucide/svelte/icons/x';
import Zap from '@lucide/svelte/icons/zap';

export interface KeyboardShortcut {
  keys: string[];
  description: string;
  category: string;
  action?: () => void;
}

let {
  open = $bindable(false),
  onTriggerAction,
}: {
  open: boolean;
  onTriggerAction?: (action: string) => void;
} = $props();

const bulkOpsState = PayeeBulkOperationsState.get();

// Keyboard shortcuts configuration
const shortcuts: KeyboardShortcut[] = [
  // Selection shortcuts
  {
    keys: ['Ctrl/Cmd', 'A'],
    description: 'Select all visible payees',
    category: 'Selection',
    action: () => onTriggerAction?.('select-all'),
  },
  {
    keys: ['Ctrl/Cmd', 'D'],
    description: 'Clear selection',
    category: 'Selection',
    action: () => onTriggerAction?.('clear-selection'),
  },
  {
    keys: ['Ctrl/Cmd', 'I'],
    description: 'Invert selection',
    category: 'Selection',
    action: () => onTriggerAction?.('invert-selection'),
  },
  {
    keys: ['Shift', 'Click'],
    description: 'Select range from last selected',
    category: 'Selection',
  },
  {
    keys: ['Ctrl/Cmd', 'Click'],
    description: 'Toggle individual selection',
    category: 'Selection',
  },

  // Bulk operations
  {
    keys: ['Delete'],
    description: 'Delete selected payees (with confirmation)',
    category: 'Bulk Operations',
    action: () => onTriggerAction?.('bulk-delete'),
  },
  {
    keys: ['Ctrl/Cmd', 'T'],
    description: 'Assign tags to selected payees',
    category: 'Bulk Operations',
    action: () => onTriggerAction?.('bulk-tags'),
  },
  {
    keys: ['Ctrl/Cmd', 'G'],
    description: 'Assign category to selected payees',
    category: 'Bulk Operations',
    action: () => onTriggerAction?.('bulk-category'),
  },
  {
    keys: ['Ctrl/Cmd', 'Shift', 'I'],
    description: 'Apply intelligence to selected payees',
    category: 'Bulk Operations',
    action: () => onTriggerAction?.('bulk-intelligence'),
  },

  // Export/Import
  {
    keys: ['Ctrl/Cmd', 'E'],
    description: 'Export selected payees',
    category: 'Import/Export',
    action: () => onTriggerAction?.('export'),
  },
  {
    keys: ['Ctrl/Cmd', 'Shift', 'E'],
    description: 'Export all payees',
    category: 'Import/Export',
    action: () => onTriggerAction?.('export-all'),
  },
  {
    keys: ['Ctrl/Cmd', 'Shift', 'I'],
    description: 'Open import dialog',
    category: 'Import/Export',
    action: () => onTriggerAction?.('import'),
  },

  // Navigation
  {
    keys: ['↑', '↓'],
    description: 'Navigate through payee list',
    category: 'Navigation',
  },
  {
    keys: ['Page Up', 'Page Down'],
    description: 'Navigate by page',
    category: 'Navigation',
  },
  {
    keys: ['Home', 'End'],
    description: 'Go to first/last payee',
    category: 'Navigation',
  },
  {
    keys: ['Enter'],
    description: 'Open payee details',
    category: 'Navigation',
    action: () => onTriggerAction?.('view-payee'),
  },

  // Search and filters
  {
    keys: ['Ctrl/Cmd', 'F'],
    description: 'Focus search field',
    category: 'Search & Filters',
    action: () => onTriggerAction?.('focus-search'),
  },
  {
    keys: ['Ctrl/Cmd', 'Shift', 'F'],
    description: 'Clear all filters',
    category: 'Search & Filters',
    action: () => onTriggerAction?.('clear-filters'),
  },
  {
    keys: ['F1'],
    description: 'Filter by active payees',
    category: 'Search & Filters',
    action: () => onTriggerAction?.('filter-active'),
  },
  {
    keys: ['F2'],
    description: 'Filter by inactive payees',
    category: 'Search & Filters',
    action: () => onTriggerAction?.('filter-inactive'),
  },

  // Undo/Redo
  {
    keys: ['Ctrl/Cmd', 'Z'],
    description: 'Undo last bulk operation',
    category: 'Undo/Redo',
    action: () => onTriggerAction?.('undo'),
  },

  // Clipboard
  {
    keys: ['Ctrl/Cmd', 'C'],
    description: 'Copy selected payees to clipboard',
    category: 'Clipboard',
    action: () => onTriggerAction?.('copy'),
  },
  {
    keys: ['Ctrl/Cmd', 'X'],
    description: 'Cut selected payees to clipboard',
    category: 'Clipboard',
    action: () => onTriggerAction?.('cut'),
  },

  // Duplicates
  {
    keys: ['Ctrl/Cmd', 'Shift', 'D'],
    description: 'Open duplicate detection',
    category: 'Duplicates',
    action: () => onTriggerAction?.('find-duplicates'),
  },

  // General
  {
    keys: ['Escape'],
    description: 'Cancel current operation or close dialogs',
    category: 'General',
    action: () => onTriggerAction?.('cancel'),
  },
  {
    keys: ['?'],
    description: 'Show keyboard shortcuts (this dialog)',
    category: 'General',
  },
  {
    keys: ['Ctrl/Cmd', 'Shift', 'K'],
    description: 'Show keyboard shortcuts (this dialog)',
    category: 'General',
  },
];

// Group shortcuts by category
const shortcutsByCategory = $derived.by(() => {
  const categories = new Map<string, KeyboardShortcut[]>();

  shortcuts.forEach((shortcut) => {
    const category = shortcut.category;
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category)!.push(shortcut);
  });

  return Array.from(categories.entries()).sort(([a], [b]) => a.localeCompare(b));
});

// Get platform-specific modifier key
const modifierKey = $derived(() => {
  if (typeof window === 'undefined') return 'Ctrl';
  return navigator.platform.toLowerCase().includes('mac') ? 'Cmd' : 'Ctrl';
});

// Format key display
function formatKey(key: string): string {
  return key
    .replace('Ctrl/Cmd', modifierKey)
    .replace('Shift', '⇧')
    .replace('Alt', '⌥')
    .replace('Cmd', '⌘')
    .replace('Ctrl', modifierKey === 'Cmd' ? '⌘' : 'Ctrl')
    .replace('Enter', '⏎')
    .replace('Space', '␣')
    .replace('Delete', '⌦')
    .replace('Backspace', '⌫')
    .replace('Tab', '⇥')
    .replace('Escape', '⎋')
    .replace('↑', '↑')
    .replace('↓', '↓')
    .replace('←', '←')
    .replace('→', '→');
}

// Get icon for category
function getCategoryIcon(category: string) {
  switch (category) {
    case 'Selection':
      return MousePointer;
    case 'Bulk Operations':
      return Zap;
    case 'Import/Export':
      return Copy;
    case 'Navigation':
      return ArrowUp;
    case 'Search & Filters':
      return Keyboard;
    case 'Undo/Redo':
      return ArrowLeft;
    case 'Clipboard':
      return Copy;
    case 'Duplicates':
      return Copy;
    case 'General':
      return Command;
    default:
      return Keyboard;
  }
}

// Execute shortcut action
function executeShortcut(shortcut: KeyboardShortcut) {
  if (shortcut.action) {
    shortcut.action();
    open = false;
  }
}

// Setup global keyboard event listeners
$effect(() => {
  if (typeof window === 'undefined') return;

  const handleKeyDown = (e: KeyboardEvent) => {
    // Don't handle shortcuts when typing in inputs
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      // Only handle specific shortcuts in input fields
      if (e.key === 'Escape') {
        target.blur();
        return;
      }
      return;
    }

    const isCtrl = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;
    const isAlt = e.altKey;

    // Handle shortcuts
    if (e.key === '?' || (isCtrl && isShift && e.key === 'K')) {
      e.preventDefault();
      open = true;
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      onTriggerAction?.('cancel');
      return;
    }

    if (isCtrl) {
      switch (e.key.toLowerCase()) {
        case 'a':
          e.preventDefault();
          onTriggerAction?.('select-all');
          break;
        case 'd':
          e.preventDefault();
          onTriggerAction?.('clear-selection');
          break;
        case 'i':
          if (isShift) {
            e.preventDefault();
            onTriggerAction?.('bulk-intelligence');
          } else {
            e.preventDefault();
            onTriggerAction?.('invert-selection');
          }
          break;
        case 't':
          e.preventDefault();
          onTriggerAction?.('bulk-tags');
          break;
        case 'g':
          e.preventDefault();
          onTriggerAction?.('bulk-category');
          break;
        case 'e':
          e.preventDefault();
          if (isShift) {
            onTriggerAction?.('export-all');
          } else {
            onTriggerAction?.('export');
          }
          break;
        case 'f':
          e.preventDefault();
          if (isShift) {
            onTriggerAction?.('clear-filters');
          } else {
            onTriggerAction?.('focus-search');
          }
          break;
        case 'z':
          e.preventDefault();
          onTriggerAction?.('undo');
          break;
        case 'c':
          e.preventDefault();
          onTriggerAction?.('copy');
          break;
        case 'x':
          e.preventDefault();
          onTriggerAction?.('cut');
          break;
      }

      if (isShift) {
        switch (e.key.toLowerCase()) {
          case 'd':
            e.preventDefault();
            onTriggerAction?.('find-duplicates');
            break;
          case 'i':
            e.preventDefault();
            onTriggerAction?.('import');
            break;
        }
      }
    }

    // Function keys
    switch (e.key) {
      case 'F1':
        e.preventDefault();
        onTriggerAction?.('filter-active');
        break;
      case 'F2':
        e.preventDefault();
        onTriggerAction?.('filter-inactive');
        break;
      case 'Delete':
        e.preventDefault();
        onTriggerAction?.('bulk-delete');
        break;
      case 'Enter':
        e.preventDefault();
        onTriggerAction?.('view-payee');
        break;
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
});
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="max-h-[90vh] max-w-4xl overflow-hidden">
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2">
        <Keyboard class="h-5 w-5" />
        Keyboard Shortcuts
      </Dialog.Title>
      <Dialog.Description>
        Use these keyboard shortcuts to efficiently manage your payees and perform bulk operations.
      </Dialog.Description>
    </Dialog.Header>

    <ScrollArea class="h-[60vh] pr-4">
      <div class="space-y-6">
        {#each shortcutsByCategory as [category, categoryShortcuts]}
          {@const Icon = getCategoryIcon(category)}
          <Card.Root>
            <Card.Header class="pb-3">
              <Card.Title class="flex items-center gap-2 text-lg">
                <Icon class="h-5 w-5" />
                {category}
              </Card.Title>
            </Card.Header>
            <Card.Content>
              <div class="space-y-3">
                {#each categoryShortcuts as shortcut}
                  <div
                    class="hover:bg-muted/50 group flex items-center justify-between rounded-lg p-2 transition-colors">
                    <div class="flex-1">
                      <div class="text-sm font-medium">{shortcut.description}</div>
                    </div>
                    <div class="flex items-center gap-1">
                      {#each shortcut.keys as key, index}
                        {#if index > 0}
                          <span class="text-muted-foreground mx-1 text-xs">+</span>
                        {/if}
                        <Kbd>
                          {formatKey(key)}
                        </Kbd>
                      {/each}
                      {#if shortcut.action}
                        <Button
                          variant="ghost"
                          size="sm"
                          onclick={() => executeShortcut(shortcut)}
                          class="ml-2 h-6 px-2 opacity-0 transition-opacity group-hover:opacity-100">
                          Try
                        </Button>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            </Card.Content>
          </Card.Root>
        {/each}
      </div>
    </ScrollArea>

    <!-- Tips -->
    <div class="space-y-3 border-t pt-4">
      <h4 class="text-sm font-medium">Tips</h4>
      <div class="text-muted-foreground grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
        <div class="flex items-start gap-2">
          <MousePointer class="mt-0.5 h-4 w-4 shrink-0" />
          <span>Hold <Kbd>Ctrl/Cmd</Kbd> while clicking to select multiple payees</span>
        </div>
        <div class="flex items-start gap-2">
          <Keyboard class="mt-0.5 h-4 w-4 shrink-0" />
          <span>Press <Kbd>?</Kbd> anytime to show this dialog</span>
        </div>
        <div class="flex items-start gap-2">
          <Zap class="mt-0.5 h-4 w-4 shrink-0" />
          <span>Bulk operations work on all selected payees at once</span>
        </div>
        <div class="flex items-start gap-2">
          <ArrowLeft class="mt-0.5 h-4 w-4 shrink-0" />
          <span>Use <Kbd>Ctrl/Cmd</Kbd> + <Kbd>Z</Kbd> to undo bulk operations</span>
        </div>
      </div>
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => (open = false)}>
        <X class="mr-2 h-4 w-4" />
        Close
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
