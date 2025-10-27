<script lang="ts">
import * as Card from '$lib/components/ui/card';
import {Button} from '$lib/components/ui/button';
import {Checkbox} from '$lib/components/ui/checkbox';
import * as Badge from '$lib/components/ui/badge';
import CircleCheck from '@lucide/svelte/icons/circle-check';
import Circle from '@lucide/svelte/icons/circle';
import Sparkles from '@lucide/svelte/icons/sparkles';
import type {PayeePreview, CategoryPreview} from '$lib/types/import';

interface Props {
  payees: PayeePreview[];
  categories: CategoryPreview[];
  onPayeeToggle: (name: string, selected: boolean) => void;
  onCategoryToggle: (name: string, selected: boolean) => void;
  onSelectAllPayees: () => void;
  onDeselectAllPayees: () => void;
  onSelectAllCategories: () => void;
  onDeselectAllCategories: () => void;
}

let {
  payees,
  categories,
  onPayeeToggle,
  onCategoryToggle,
  onSelectAllPayees,
  onDeselectAllPayees,
  onSelectAllCategories,
  onDeselectAllCategories,
}: Props = $props();

const newPayeesCount = $derived(payees.filter((p) => !p.existing).length);
const selectedPayeesCount = $derived(payees.filter((p) => p.selected && !p.existing).length);
const newCategoriesCount = $derived(categories.filter((c) => !c.existing).length);
const selectedCategoriesCount = $derived(
  categories.filter((c) => c.selected && !c.existing).length
);
</script>

<div class="space-y-6">
  <!-- Summary Stats -->
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
    <Card.Card>
      <Card.CardHeader class="pb-3">
        <Card.CardDescription>New Payees</Card.CardDescription>
        <Card.CardTitle class="text-3xl">{selectedPayeesCount}/{newPayeesCount}</Card.CardTitle>
      </Card.CardHeader>
      <Card.CardContent>
        <p class="text-sm text-muted-foreground">Selected for creation</p>
      </Card.CardContent>
    </Card.Card>

    <Card.Card>
      <Card.CardHeader class="pb-3">
        <Card.CardDescription>New Categories</Card.CardDescription>
        <Card.CardTitle class="text-3xl">
          {selectedCategoriesCount}/{newCategoriesCount}
        </Card.CardTitle>
      </Card.CardHeader>
      <Card.CardContent>
        <p class="text-sm text-muted-foreground">Selected for creation</p>
      </Card.CardContent>
    </Card.Card>

    <Card.Card>
      <Card.CardHeader class="pb-3">
        <Card.CardDescription>Existing Entities</Card.CardDescription>
        <Card.CardTitle class="text-3xl">
          {payees.filter((p) => p.existing).length + categories.filter((c) => c.existing).length}
        </Card.CardTitle>
      </Card.CardHeader>
      <Card.CardContent>
        <p class="text-sm text-muted-foreground">Will be reused</p>
      </Card.CardContent>
    </Card.Card>
  </div>

  <!-- Payees Section -->
  {#if payees.length > 0}
    <Card.Card>
      <Card.CardHeader>
        <div class="flex items-center justify-between">
          <div>
            <Card.CardTitle>Payees</Card.CardTitle>
            <Card.CardDescription>
              Review and select payees to create ({newPayeesCount} new, {payees.filter((p) => p.existing).length} existing)
            </Card.CardDescription>
          </div>
          {#if newPayeesCount > 0}
            <div class="flex gap-2">
              <Button variant="outline" size="sm" onclick={onSelectAllPayees}>Select All</Button>
              <Button variant="outline" size="sm" onclick={onDeselectAllPayees}>Deselect All</Button>
            </div>
          {/if}
        </div>
      </Card.CardHeader>
      <Card.CardContent>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {#each payees as payee (payee.name)}
            <div
              class="flex items-center justify-between rounded-lg border p-3 transition-colors {payee.existing
                ? 'bg-muted/50'
                : payee.selected
                  ? 'bg-accent/5'
                  : ''}"
            >
              <div class="flex items-center gap-3 flex-1">
                {#if !payee.existing}
                  <Checkbox
                    checked={payee.selected}
                    onCheckedChange={(checked) =>
                      onPayeeToggle(payee.name, checked === true)}
                    aria-label="Select payee for creation"
                  />
                {:else}
                  <div class="w-5 h-5 flex items-center justify-center">
                    <CircleCheck class="h-5 w-5 text-green-500" />
                  </div>
                {/if}

                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span class="font-medium">{payee.name}</span>
                    {#if payee.source === 'inferred'}
                      <Badge.Badge variant="secondary" class="gap-1">
                        <Sparkles class="h-3 w-3" />
                        Inferred
                      </Badge.Badge>
                    {/if}
                    {#if payee.existing}
                      <Badge.Badge variant="default">Exists</Badge.Badge>
                    {/if}
                  </div>
                  <p class="text-sm text-muted-foreground">
                    {payee.occurrences} transaction{payee.occurrences > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </Card.CardContent>
    </Card.Card>
  {/if}

  <!-- Categories Section -->
  {#if categories.length > 0}
    <Card.Card>
      <Card.CardHeader>
        <div class="flex items-center justify-between">
          <div>
            <Card.CardTitle>Categories</Card.CardTitle>
            <Card.CardDescription>
              Review and select categories to create ({newCategoriesCount} new, {categories.filter((c) => c.existing).length} existing)
            </Card.CardDescription>
          </div>
          {#if newCategoriesCount > 0}
            <div class="flex gap-2">
              <Button variant="outline" size="sm" onclick={onSelectAllCategories}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onclick={onDeselectAllCategories}>
                Deselect All
              </Button>
            </div>
          {/if}
        </div>
      </Card.CardHeader>
      <Card.CardContent>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {#each categories as category (category.name)}
            <div
              class="flex items-center justify-between rounded-lg border p-3 transition-colors {category.existing
                ? 'bg-muted/50'
                : category.selected
                  ? 'bg-accent/5'
                  : ''}"
            >
              <div class="flex items-center gap-3 flex-1">
                {#if !category.existing}
                  <Checkbox
                    checked={category.selected}
                    onCheckedChange={(checked) =>
                      onCategoryToggle(category.name, checked === true)}
                    aria-label="Select category for creation"
                  />
                {:else}
                  <div class="w-5 h-5 flex items-center justify-center">
                    <CircleCheck class="h-5 w-5 text-green-500" />
                  </div>
                {/if}

                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span class="font-medium">{category.name}</span>
                    {#if category.source === 'inferred'}
                      <Badge.Badge variant="secondary" class="gap-1">
                        <Sparkles class="h-3 w-3" />
                        Inferred
                      </Badge.Badge>
                    {/if}
                    {#if category.existing}
                      <Badge.Badge variant="default">Exists</Badge.Badge>
                    {/if}
                  </div>
                  <p class="text-sm text-muted-foreground">
                    {category.occurrences} transaction{category.occurrences > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </Card.CardContent>
    </Card.Card>
  {/if}

  {#if payees.length === 0 && categories.length === 0}
    <Card.Card>
      <Card.CardContent class="pt-6">
        <div class="text-center text-muted-foreground">
          <Circle class="mx-auto h-12 w-12 mb-4" />
          <p>No new entities to review</p>
          <p class="text-sm mt-2">All payees and categories in your import already exist.</p>
        </div>
      </Card.CardContent>
    </Card.Card>
  {/if}
</div>
