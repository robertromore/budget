<script lang="ts">
import { goto } from '$app/navigation';
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import { Input } from '$lib/components/ui/input';
import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
import * as Tabs from '$lib/components/ui/tabs';
import {
  BUDGET_TEMPLATES,
  TEMPLATE_CATEGORY_LABELS,
  getTemplateCategories,
  type BudgetTemplate,
  type TemplateCategory,
} from '$lib/constants/budget-templates';
import { currencyFormatter } from '$lib/utils/formatters';
import * as LucideIcons from '@lucide/svelte/icons';
import { Search, Sparkles } from '@lucide/svelte/icons';

interface Props {
  open: boolean;
}

let { open = $bindable() }: Props = $props();

// Helper to get Lucide icon component from icon name
function getIconComponent(iconName: string) {
  // Convert kebab-case to PascalCase (e.g., "shopping-cart" -> "ShoppingCart")
  const pascalCase = iconName
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  // Get the icon from the LucideIcons object
  const icon = (LucideIcons as any)[pascalCase];
  return icon || LucideIcons.CircleDashed; // Fallback icon
}

let searchTerm = $state('');
let selectedCategory = $state<TemplateCategory | 'all'>('all');

// Use hardcoded templates from constants
const templates = BUDGET_TEMPLATES;
const categories = getTemplateCategories();

const filteredTemplates = $derived.by(() => {
  let result = templates;

  // Filter by category
  if (selectedCategory !== 'all') {
    result = result.filter((template) => template.category === selectedCategory);
  }

  // Filter by search term
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    result = result.filter(
      (template) =>
        template.name.toLowerCase().includes(term) ||
        template.description.toLowerCase().includes(term)
    );
  }

  return result;
});

function selectTemplate(template: BudgetTemplate) {
  // Navigate to budget creation with template pre-selected
  const params = new URLSearchParams({
    templateId: template.id,
  });
  goto(`/budgets/new?${params.toString()}`);
  open = false;
}

function getTypeBadgeVariant(type: string) {
  switch (type) {
    case 'account-monthly':
      return 'default';
    case 'category-envelope':
      return 'secondary';
    case 'goal-based':
      return 'outline';
    case 'scheduled-expense':
      return 'destructive';
    default:
      return 'default';
  }
}

function formatType(type: string) {
  return type.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}
</script>

<ResponsiveSheet bind:open side="right">
  {#snippet header()}
    <div class="space-y-2">
      <h2 class="flex items-center gap-2 text-lg font-semibold">
        <Sparkles class="text-primary h-5 w-5" />
        Choose a Budget Template
      </h2>
      <p class="text-muted-foreground text-sm">
        Start with a pre-configured template or create a custom budget from scratch
      </p>
    </div>
  {/snippet}

  {#snippet content()}
    <div class="space-y-4">
      <!-- Search -->
      <div class="relative">
        <Search class="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          type="search"
          placeholder="Search templates..."
          bind:value={searchTerm}
          class="pl-9" />
      </div>

      <!-- Category Tabs -->
      <Tabs.Root bind:value={selectedCategory}>
        <Tabs.List class="grid w-full grid-cols-5">
          <Tabs.Trigger value="all">All</Tabs.Trigger>
          {#each categories as category}
            <Tabs.Trigger value={category}>
              {TEMPLATE_CATEGORY_LABELS[category]}
            </Tabs.Trigger>
          {/each}
        </Tabs.List>
      </Tabs.Root>

      <!-- Template Grid -->
      {#if filteredTemplates.length === 0}
        <div class="flex flex-col items-center justify-center py-12 text-center">
          <p class="text-muted-foreground">No templates found</p>
          <p class="text-muted-foreground mt-2 text-sm">
            {searchTerm ? 'Try a different search term' : 'No templates available yet'}
          </p>
        </div>
      {:else}
        <div class="space-y-3">
          {#each filteredTemplates as template (template.id)}
            <Card.Root
              class="hover:border-primary cursor-pointer transition-all hover:shadow-md"
              onclick={() => selectTemplate(template)}
              role="button"
              tabindex={0}
              onkeydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  selectTemplate(template);
                }
              }}>
              {@const IconComponent = getIconComponent(template.icon)}
              <Card.Header class="pb-3">
                <div class="flex items-start justify-between gap-2">
                  <div class="bg-primary/10 text-primary rounded-lg p-2">
                    <IconComponent class="h-6 w-6" aria-hidden="true" />
                  </div>
                  <Badge variant={getTypeBadgeVariant(template.type)} class="text-xs">
                    {formatType(template.type)}
                  </Badge>
                </div>
                <Card.Title class="mt-2 text-lg">{template.name}</Card.Title>
                {#if template.description}
                  <Card.Description class="line-clamp-2">
                    {template.description}
                  </Card.Description>
                {/if}
              </Card.Header>
              <Card.Content class="pt-0">
                <div class="flex items-center justify-between text-sm">
                  <span class="text-muted-foreground">Suggested:</span>
                  <span class="font-semibold">
                    {template.suggestedAmount
                      ? currencyFormatter.format(template.suggestedAmount)
                      : 'Custom'}
                  </span>
                </div>
                <div class="mt-2 flex items-center justify-between text-sm">
                  <span class="text-muted-foreground">Enforcement:</span>
                  <span class="font-medium capitalize">{template.enforcementLevel}</span>
                </div>
              </Card.Content>
            </Card.Root>
          {/each}
        </div>
      {/if}
    </div>
  {/snippet}

  {#snippet footer()}
    <div class="flex gap-2">
      <Button class="flex-1" variant="outline" onclick={() => (open = false)}>Cancel</Button>
      <Button class="flex-1" href="/budgets/new">Create Custom Budget</Button>
    </div>
  {/snippet}
</ResponsiveSheet>
