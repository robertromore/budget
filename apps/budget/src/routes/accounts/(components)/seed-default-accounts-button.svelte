<script lang="ts">
import { Button } from '$lib/components/ui/button';
import { ResponsiveSheet } from '$lib/components/ui/responsive-sheet';
import { Separator } from '$lib/components/ui/separator';
import { Badge } from '$lib/components/ui/badge';
import { Checkbox } from '$lib/components/ui/checkbox';
import { Label } from '$lib/components/ui/label';
import { Input } from '$lib/components/ui/input';
import { ScrollArea } from '$lib/components/ui/scroll-area';
import PackagePlus from '@lucide/svelte/icons/package-plus';
import Search from '@lucide/svelte/icons/search';
import { seedDefaultAccounts } from '$lib/query/accounts';
import { rpc } from '$lib/query';
import { SvelteSet } from 'svelte/reactivity';
import { getIconByName } from '$lib/components/ui/icon-picker/icon-categories';

let sheetOpen = $state(false);
let searchQuery = $state('');
let selectedSlugs = new SvelteSet<string>();

const statusQuery = rpc.accounts.getDefaultAccountsStatus().options();
const status = $derived(statusQuery.data);

const seedMutation = seedDefaultAccounts.options();

const handleSeed = async () => {
  const slugsArray = Array.from(selectedSlugs);
  await seedMutation.mutateAsync({ slugs: slugsArray });
  sheetOpen = false;
  selectedSlugs.clear();
  searchQuery = '';

  statusQuery.refetch();
};

const accountTypeLabels: Record<string, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit_card: 'Credit Card',
  investment: 'Investment',
  loan: 'Loan',
  cash: 'Cash',
  hsa: 'HSA',
};

const accountTypeColors: Record<string, string> = {
  checking: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  savings: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  credit_card: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  investment: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  loan: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  cash: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  hsa: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const availableAccounts = $derived.by(() => {
  if (!status) return [];

  let accounts = status.accounts.filter((a) => !a.installed);

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    accounts = accounts.filter(
      (a) =>
        a.name.toLowerCase().includes(query) ||
        a.accountType.toLowerCase().includes(query) ||
        a.description.toLowerCase().includes(query)
    );
  }

  return accounts;
});

const groupedAccounts = $derived.by(() => {
  const groups: Record<string, typeof availableAccounts> = {};

  for (const account of availableAccounts) {
    const type = account.accountType ?? 'checking';
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(account);
  }

  return groups;
});

const toggleAccount = (slug: string, checked: boolean) => {
  if (checked) {
    selectedSlugs.add(slug);
  } else {
    selectedSlugs.delete(slug);
  }
};

const toggleGroup = (type: string, checked: boolean) => {
  const groupAccounts = groupedAccounts[type] || [];

  if (checked) {
    groupAccounts.forEach((a) => selectedSlugs.add(a.slug));
  } else {
    groupAccounts.forEach((a) => selectedSlugs.delete(a.slug));
  }
};

const selectAll = () => {
  availableAccounts.forEach((a) => selectedSlugs.add(a.slug));
};

const deselectAll = () => {
  selectedSlugs.clear();
};

const shouldShowButton = $derived((status?.available ?? 0) > 0);

const isGroupSelected = (type: string) => {
  const groupAccounts = groupedAccounts[type] || [];
  if (groupAccounts.length === 0) return false;
  return groupAccounts.every((a) => selectedSlugs.has(a.slug));
};

const isGroupPartiallySelected = (type: string) => {
  const groupAccounts = groupedAccounts[type] || [];
  if (groupAccounts.length === 0) return false;
  const selectedCount = groupAccounts.filter((a) => selectedSlugs.has(a.slug)).length;
  return selectedCount > 0 && selectedCount < groupAccounts.length;
};

const selectedCount = $derived(selectedSlugs.size);
</script>

{#if shouldShowButton}
  <Button variant="outline" onclick={() => (sheetOpen = true)}>
    <PackagePlus class="mr-2 h-4 w-4" />
    Add Default Accounts
    {#if status && status.available > 0}
      <Badge variant="secondary" class="ml-2">
        {status.available}
      </Badge>
    {/if}
  </Button>

  <ResponsiveSheet bind:open={sheetOpen}>
    {#snippet header()}
      <div>
        <h2 class="text-lg font-semibold">Add Default Accounts</h2>
        <p class="text-muted-foreground text-sm">
          {#if status}
            Select from {status.available} popular pre-configured account{status.available === 1
              ? ''
              : 's'}.
            {#if status.installed > 0}
              ({status.installed} already added)
            {/if}
          {/if}
        </p>
      </div>
    {/snippet}

    {#snippet content()}
      <div class="flex h-full flex-col gap-4">
        <div class="relative">
          <Search class="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            type="search"
            placeholder="Search accounts..."
            bind:value={searchQuery}
            class="pl-9" />
        </div>

        <div class="flex items-center justify-between gap-2 text-sm">
          <div class="text-muted-foreground">
            {selectedCount} selected
          </div>
          <div class="flex gap-2">
            <Button variant="ghost" size="sm" onclick={selectAll}>Select All</Button>
            {#if selectedCount > 0}
              <Button variant="ghost" size="sm" onclick={deselectAll}>Clear</Button>
            {/if}
          </div>
        </div>

        <Separator />

        <ScrollArea class="flex-1">
          <div class="space-y-6 pb-4">
            {#if availableAccounts.length === 0}
              <div class="text-muted-foreground py-8 text-center">
                {#if searchQuery}
                  No accounts found matching "{searchQuery}"
                {:else}
                  No accounts available to add
                {/if}
              </div>
            {:else}
              {#each Object.entries(groupedAccounts) as [type, accounts]}
                <div>
                  <div class="bg-background sticky top-0 z-10 mb-3 flex items-center gap-2 py-2">
                    <Checkbox
                      checked={isGroupSelected(type)}
                      indeterminate={isGroupPartiallySelected(type)}
                      onCheckedChange={(checked) => toggleGroup(type, checked ?? false)}
                      id={`group-${type}`} />
                    <Label
                      for={`group-${type}`}
                      class="flex cursor-pointer items-center gap-2 font-semibold">
                      <Badge class={accountTypeColors[type]}>
                        {accountTypeLabels[type] || type}
                      </Badge>
                      <span class="text-muted-foreground text-xs font-normal">
                        ({accounts.length})
                      </span>
                    </Label>
                  </div>

                  <div class="space-y-2 pl-6">
                    {#each accounts as account}
                      {@const iconData = getIconByName(account.accountIcon)}
                      {@const IconComponent = iconData?.icon}
                      <div class="flex items-center gap-2">
                        <Checkbox
                          checked={selectedSlugs.has(account.slug)}
                          onCheckedChange={(checked) =>
                            toggleAccount(account.slug, checked ?? false)}
                          id={account.slug} />
                        <Label for={account.slug} class="flex-1 cursor-pointer">
                          <div class="flex items-center gap-2">
                            {#if IconComponent}
                              <div
                                class="flex h-6 w-6 items-center justify-center rounded"
                                style:background-color={account.accountColor}>
                                <IconComponent class="h-3.5 w-3.5 text-white" />
                              </div>
                            {/if}
                            <div class="flex-1">
                              <div class="text-sm font-medium">{account.name}</div>
                              <div class="text-muted-foreground text-xs">{account.description}</div>
                            </div>
                          </div>
                        </Label>
                      </div>
                    {/each}
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        </ScrollArea>
      </div>
    {/snippet}

    {#snippet footer()}
      <div class="flex w-full gap-2">
        <Button variant="outline" onclick={() => (sheetOpen = false)} class="flex-1">Cancel</Button>
        <Button
          onclick={handleSeed}
          disabled={seedMutation.isPending || selectedCount === 0}
          class="flex-1">
          {seedMutation.isPending
            ? 'Adding...'
            : `Add ${selectedCount} ${selectedCount === 1 ? 'Account' : 'Accounts'}`}
        </Button>
      </div>
    {/snippet}
  </ResponsiveSheet>
{/if}
