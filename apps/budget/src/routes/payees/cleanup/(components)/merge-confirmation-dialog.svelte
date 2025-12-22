<script lang="ts">
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import * as Select from "$lib/components/ui/select";
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import { Switch } from "$lib/components/ui/switch";
  import { Label } from "$lib/components/ui/label";
  import type { Payee } from "$lib/schema/payees";

  import AlertTriangle from "@lucide/svelte/icons/alert-triangle";
  import GitMerge from "@lucide/svelte/icons/git-merge";
  import Loader2 from "@lucide/svelte/icons/loader-2";

  interface MergeStrategy {
    preserveTransactionHistory: boolean;
    conflictResolution: "primary" | "latest" | "best_quality";
    mergeContactInfo: boolean;
    mergeIntelligenceData: boolean;
  }

  interface Props {
    open: boolean;
    primaryPayee: Payee | null;
    duplicatePayees: Payee[];
    isLoading?: boolean;
    onConfirm: (strategy: MergeStrategy) => void;
    onCancel: () => void;
  }

  let {
    open = $bindable(false),
    primaryPayee,
    duplicatePayees,
    isLoading = false,
    onConfirm,
    onCancel,
  }: Props = $props();

  // Merge strategy state
  let preserveTransactionHistory = $state(true);
  let conflictResolution = $state<"primary" | "latest" | "best_quality">("primary");
  let mergeContactInfo = $state(true);
  let mergeIntelligenceData = $state(true);

  const conflictOptions = [
    { value: "primary", label: "Keep Primary", description: "Use the primary payee's values" },
    { value: "latest", label: "Use Latest", description: "Use the most recently updated values" },
    { value: "best_quality", label: "Best Quality", description: "Choose the most complete values" },
  ];

  function handleConfirm() {
    onConfirm({
      preserveTransactionHistory,
      conflictResolution,
      mergeContactInfo,
      mergeIntelligenceData,
    });
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      onCancel();
    }
  }
</script>

<AlertDialog.Root bind:open onOpenChange={handleOpenChange}>
  <AlertDialog.Content class="max-w-lg">
    <AlertDialog.Header>
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <GitMerge class="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <AlertDialog.Title>Merge Payees</AlertDialog.Title>
      </div>
      <AlertDialog.Description class="pt-2">
        This will merge {duplicatePayees.length} duplicate payee{duplicatePayees.length === 1 ? "" : "s"} into <strong>{primaryPayee?.name}</strong>.
      </AlertDialog.Description>
    </AlertDialog.Header>

    <div class="space-y-4 py-4">
      <!-- Summary -->
      <div class="rounded-lg bg-muted/50 p-3 text-sm">
        <div class="mb-2 font-medium">Merge Summary</div>
        <ul class="text-muted-foreground space-y-1">
          <li>
            <strong>Primary:</strong> {primaryPayee?.name}
          </li>
          <li>
            <strong>Merging:</strong>
            {#each duplicatePayees as dupe, i (dupe.id)}
              {dupe.name}{i < duplicatePayees.length - 1 ? ", " : ""}
            {/each}
          </li>
        </ul>
      </div>

      <!-- Warning -->
      <div class="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/50">
        <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div class="text-sm text-amber-800 dark:text-amber-200">
          <strong>This action cannot be undone.</strong> All transactions from the duplicate payees will be reassigned to the primary payee.
        </div>
      </div>

      <!-- Strategy Options -->
      <div class="space-y-4">
        <div class="text-sm font-medium">Merge Options</div>

        <!-- Conflict Resolution -->
        <div class="space-y-2">
          <Label for="conflict-resolution">When fields conflict</Label>
          <Select.Root type="single" bind:value={conflictResolution}>
            <Select.Trigger id="conflict-resolution" class="w-full">
              {conflictOptions.find((o) => o.value === conflictResolution)?.label ?? "Select..."}
            </Select.Trigger>
            <Select.Content>
              {#each conflictOptions as option (option.value)}
                <Select.Item value={option.value}>
                  <div>
                    <div class="font-medium">{option.label}</div>
                    <div class="text-muted-foreground text-xs">{option.description}</div>
                  </div>
                </Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <!-- Toggle options -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <Label for="preserve-transactions" class="text-sm font-normal">
                Preserve transaction history
              </Label>
              <p class="text-muted-foreground text-xs">
                Move all transactions to the primary payee
              </p>
            </div>
            <Switch id="preserve-transactions" bind:checked={preserveTransactionHistory} />
          </div>

          <div class="flex items-center justify-between">
            <div>
              <Label for="merge-contact" class="text-sm font-normal">
                Merge contact information
              </Label>
              <p class="text-muted-foreground text-xs">
                Fill empty fields from duplicate payees
              </p>
            </div>
            <Switch id="merge-contact" bind:checked={mergeContactInfo} />
          </div>

          <div class="flex items-center justify-between">
            <div>
              <Label for="merge-intelligence" class="text-sm font-normal">
                Merge intelligence data
              </Label>
              <p class="text-muted-foreground text-xs">
                Combine ML/AI insights from all payees
              </p>
            </div>
            <Switch id="merge-intelligence" bind:checked={mergeIntelligenceData} />
          </div>
        </div>
      </div>
    </div>

    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={isLoading}>Cancel</AlertDialog.Cancel>
      <Button
        onclick={handleConfirm}
        disabled={isLoading}
        class={buttonVariants({ variant: "default" })}
      >
        {#if isLoading}
          <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          Merging...
        {:else}
          <GitMerge class="mr-2 h-4 w-4" />
          Confirm Merge
        {/if}
      </Button>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
