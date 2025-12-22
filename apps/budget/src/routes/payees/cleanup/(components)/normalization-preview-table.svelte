<script lang="ts">
  import * as Table from "$lib/components/ui/table";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import { Badge } from "$lib/components/ui/badge";
  import { cn } from "$lib/utils";

  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import Check from "@lucide/svelte/icons/check";
  import Minus from "@lucide/svelte/icons/minus";

  export interface NormalizationPreview {
    payeeId: number;
    original: string;
    normalized: string;
    wouldChange: boolean;
    selected: boolean;
  }

  interface Props {
    previews: NormalizationPreview[];
    showOnlyChanges?: boolean;
    onToggleSelect: (payeeId: number, selected: boolean) => void;
    onSelectAll: (selected: boolean) => void;
  }

  let { previews, showOnlyChanges = false, onToggleSelect, onSelectAll }: Props = $props();

  const filteredPreviews = $derived(
    showOnlyChanges ? previews.filter((p) => p.wouldChange) : previews
  );

  const allSelected = $derived(
    filteredPreviews.length > 0 && filteredPreviews.every((p) => p.selected)
  );

  const someSelected = $derived(
    filteredPreviews.some((p) => p.selected) && !allSelected
  );

  const changesCount = $derived(previews.filter((p) => p.wouldChange).length);
  const selectedCount = $derived(previews.filter((p) => p.selected).length);

  function handleSelectAllChange(checked: boolean | "indeterminate") {
    onSelectAll(checked === true);
  }

  function handleRowSelect(payeeId: number, checked: boolean | "indeterminate") {
    onToggleSelect(payeeId, checked === true);
  }
</script>

<div class="space-y-4">
  <!-- Summary stats -->
  <div class="text-muted-foreground flex items-center justify-between text-sm">
    <div>
      {filteredPreviews.length} payee{filteredPreviews.length === 1 ? "" : "s"} shown
      {#if showOnlyChanges}
        <span class="text-muted-foreground/60">(filtered to changes only)</span>
      {/if}
    </div>
    <div class="flex items-center gap-4">
      <span>
        <span class="font-medium">{changesCount}</span> will change
      </span>
      <span>
        <span class="font-medium">{selectedCount}</span> selected
      </span>
    </div>
  </div>

  <!-- Table -->
  <div class="rounded-md border">
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head class="w-12">
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              onCheckedChange={handleSelectAllChange}
            />
          </Table.Head>
          <Table.Head>Original Name</Table.Head>
          <Table.Head class="w-12"></Table.Head>
          <Table.Head>Normalized Name</Table.Head>
          <Table.Head class="w-24 text-right">Status</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each filteredPreviews as preview (preview.payeeId)}
          <Table.Row
            class={cn(
              preview.selected && "bg-primary/5",
              !preview.wouldChange && "opacity-60"
            )}
          >
            <Table.Cell>
              <Checkbox
                checked={preview.selected}
                disabled={!preview.wouldChange}
                onCheckedChange={(checked) => handleRowSelect(preview.payeeId, checked)}
              />
            </Table.Cell>
            <Table.Cell class="font-medium">
              {preview.original}
            </Table.Cell>
            <Table.Cell>
              {#if preview.wouldChange}
                <ArrowRight class="text-muted-foreground h-4 w-4" />
              {:else}
                <Minus class="text-muted-foreground/40 h-4 w-4" />
              {/if}
            </Table.Cell>
            <Table.Cell
              class={cn(
                preview.wouldChange ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
              )}
            >
              {preview.normalized}
            </Table.Cell>
            <Table.Cell class="text-right">
              {#if preview.wouldChange}
                <Badge variant="outline" class="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                  Will change
                </Badge>
              {:else}
                <Badge variant="outline" class="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  <Check class="mr-1 h-3 w-3" />
                  Clean
                </Badge>
              {/if}
            </Table.Cell>
          </Table.Row>
        {:else}
          <Table.Row>
            <Table.Cell colspan={5} class="text-muted-foreground py-8 text-center">
              No payees to display
            </Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  </div>
</div>
