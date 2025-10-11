<script lang="ts">
  import ResponsiveSheet from "$lib/components/ui/responsive-sheet/responsive-sheet.svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import { Input } from "$lib/components/ui/input";
  import { listBudgetTemplates } from "$lib/query/budgets";
  import type { BudgetTemplate } from "$lib/schema/budgets";
  import { Search, Sparkles, Loader2 } from "@lucide/svelte/icons";
  import * as LucideIcons from "@lucide/svelte/icons";
  import { currencyFormatter } from "$lib/utils/formatters";
  import { goto } from "$app/navigation";

  interface Props {
    open: boolean;
  }

  let { open = $bindable() }: Props = $props();

  // Helper to get Lucide icon component from icon name
  function getIconComponent(iconName: string) {
    // Convert kebab-case to PascalCase (e.g., "shopping-cart" -> "ShoppingCart")
    const pascalCase = iconName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');

    // Get the icon from the LucideIcons object
    const icon = (LucideIcons as any)[pascalCase];
    return icon || LucideIcons.CircleDashed; // Fallback icon
  }

  let searchTerm = $state("");

  // Fetch templates from database
  const templatesQuery = $derived(listBudgetTemplates(true).options());
  const templates = $derived(templatesQuery.data ?? []);
  const isLoading = $derived(templatesQuery.isLoading);

  const filteredTemplates = $derived.by(() => {
    if (!searchTerm.trim()) return templates;
    const term = searchTerm.toLowerCase();
    return templates.filter(
      (template) =>
        template.name.toLowerCase().includes(term) ||
        (template.description && template.description.toLowerCase().includes(term))
    );
  });

  function selectTemplate(template: BudgetTemplate) {
    // Navigate to budget creation with template pre-selected
    const params = new URLSearchParams({
      templateId: template.id.toString(),
    });
    goto(`/budgets/new?${params.toString()}`);
    open = false;
  }

  function getTypeBadgeVariant(type: string) {
    switch (type) {
      case "account-monthly":
        return "default";
      case "category-envelope":
        return "secondary";
      case "goal-based":
        return "outline";
      case "scheduled-expense":
        return "destructive";
      default:
        return "default";
    }
  }

  function formatType(type: string) {
    return type.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }
</script>

<ResponsiveSheet bind:open side="right">
  {#snippet header()}
    <div class="space-y-2">
      <h2 class="text-lg font-semibold flex items-center gap-2">
        <Sparkles class="h-5 w-5 text-primary" />
        Choose a Budget Template
      </h2>
      <p class="text-sm text-muted-foreground">
        Start with a pre-configured template or create a custom budget from scratch
      </p>
    </div>
  {/snippet}

  {#snippet content()}
    <div class="space-y-4">
      <!-- Search -->
      <div class="relative">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search templates..."
          bind:value={searchTerm}
          class="pl-9"
        />
      </div>

      <!-- Template Grid -->
      {#if isLoading}
        <div class="flex flex-col items-center justify-center py-12 text-center">
          <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
          <p class="text-muted-foreground mt-4">Loading templates...</p>
        </div>
      {:else if filteredTemplates.length === 0}
        <div class="flex flex-col items-center justify-center py-12 text-center">
          <p class="text-muted-foreground">No templates found</p>
          <p class="text-sm text-muted-foreground mt-2">
            {searchTerm ? "Try a different search term" : "No templates available yet"}
          </p>
        </div>
      {:else}
        <div class="space-y-3">
          {#each filteredTemplates as template (template.id)}
            <Card.Root
              class="cursor-pointer transition-all hover:shadow-md hover:border-primary"
              onclick={() => selectTemplate(template)}
              role="button"
              tabindex={0}
              onkeydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  selectTemplate(template);
                }
              }}
            >
              {@const IconComponent = getIconComponent(template.icon)}
              <Card.Header class="pb-3">
                <div class="flex items-start justify-between gap-2">
                  <div class="p-2 rounded-lg bg-primary/10 text-primary">
                    <IconComponent class="h-6 w-6" aria-hidden="true" />
                  </div>
                  <Badge variant={getTypeBadgeVariant(template.type)} class="text-xs">
                    {formatType(template.type)}
                  </Badge>
                </div>
                <Card.Title class="text-lg mt-2">{template.name}</Card.Title>
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
                      : "Custom"}
                  </span>
                </div>
                <div class="flex items-center justify-between text-sm mt-2">
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
