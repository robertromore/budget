<script lang="ts">
import { Separator } from '$lib/components/ui/separator';
import ArrowRightLeft from '@lucide/svelte/icons/arrow-right-left';
import Settings2 from '@lucide/svelte/icons/settings-2';
import DollarSign from '@lucide/svelte/icons/dollar-sign';
import Wallet from '@lucide/svelte/icons/wallet';
import Shield from '@lucide/svelte/icons/shield';
import Database from '@lucide/svelte/icons/database';
import Scale from '@lucide/svelte/icons/scale';
import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
import Link from '@lucide/svelte/icons/link';
import type { Account } from '$core/schema';
import * as Select from '$lib/components/ui/select';

import GeneralSection from './settings/general-section.svelte';
import FinancialSection from './settings/financial-section.svelte';
import BudgetSection from './settings/budget-section.svelte';
import SecuritySection from './settings/security-section.svelte';
import DataSection from './settings/data-section.svelte';
import BalanceManagementSection from './settings/balance-management-section.svelte';
import TransferMappingsSection from './settings/transfer-mappings-section.svelte';
import ConnectionSection from './settings/connection-section.svelte';
import RateTiersSection from './settings/rate-tiers-section.svelte';
import DangerSection from './settings/danger-section.svelte';
import Layers from '@lucide/svelte/icons/layers';

interface Props {
  account: Account;
  onAccountUpdated?: () => void;
}

let { account, onAccountUpdated }: Props = $props();

// Check if this is a utility account
const isUtilityAccount = $derived(account.accountType === 'utility');

// Settings navigation items
const settingsNav = $derived([
  {
    title: 'Account',
    items: [
      { id: 'general', label: 'General', icon: Settings2 },
      { id: 'financial', label: 'Financial', icon: DollarSign },
      { id: 'budget', label: 'Budget', icon: Wallet },
    ],
  },
  {
    title: 'Data',
    items: [
      { id: 'connection', label: 'Bank Connection', icon: Link },
      { id: 'data', label: 'Data Management', icon: Database },
      { id: 'balance', label: 'Balance Management', icon: Scale },
      { id: 'transfer-mappings', label: 'Transfer Mappings', icon: ArrowRightLeft },
      ...(isUtilityAccount ? [{ id: 'rate-tiers', label: 'Rate Tiers', icon: Layers }] : []),
      { id: 'security', label: 'Security', icon: Shield },
    ],
  },
  {
    title: 'Advanced',
    items: [{ id: 'danger', label: 'Danger Zone', icon: TriangleAlert }],
  },
]);

// Active section state
let activeSection = $state<string>('general');

function setActiveSection(id: string) {
  activeSection = id;
}

function isActive(id: string): boolean {
  return activeSection === id;
}
</script>

<div class="flex flex-col gap-6 md:flex-row md:gap-8">
  <!-- Mobile: Select dropdown -->
  <div class="md:hidden">
    <Select.Root
      type="single"
      value={activeSection}
      onValueChange={(value) => { if (value) setActiveSection(value); }}>
      <Select.Trigger class="w-full">
        {settingsNav.flatMap((g) => g.items).find((i) => i.id === activeSection)?.label ?? 'Select section'}
      </Select.Trigger>
      <Select.Content>
        {#each settingsNav as group}
          <Select.Group>
            <Select.GroupHeading>{group.title}</Select.GroupHeading>
            {#each group.items as item}
              <Select.Item value={item.id}>{item.label}</Select.Item>
            {/each}
          </Select.Group>
        {/each}
      </Select.Content>
    </Select.Root>
  </div>

  <!-- Desktop: Settings Sidebar -->
  <aside class="hidden w-56 shrink-0 md:block">
    <nav class="space-y-6">
      {#each settingsNav as group}
        <div>
          <h3
            class="text-muted-foreground mb-2 px-3 text-xs font-semibold tracking-wider uppercase">
            {group.title}
          </h3>
          <ul class="space-y-1">
            {#each group.items as item}
              {@const Icon = item.icon}
              {@const active = isActive(item.id)}
              <li>
                <button
                  type="button"
                  onclick={() => setActiveSection(item.id)}
                  class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
                  class:bg-accent={active}
                  class:text-accent-foreground={active}
                  class:hover:bg-muted={!active}
                  class:text-muted-foreground={!active}>
                  <Icon class="h-4 w-4" />
                  {item.label}
                </button>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </nav>
  </aside>

  <Separator orientation="vertical" class="hidden h-auto md:block" />

  <!-- Main Content -->
  <main class="min-w-0 flex-1">
    {#if activeSection === 'general'}
      <div data-tour-id="settings-details">
        <GeneralSection {account} {onAccountUpdated} />
      </div>
    {:else if activeSection === 'financial'}
      <div data-tour-id="settings-type">
        <FinancialSection {account} {onAccountUpdated} />
      </div>
    {:else if activeSection === 'budget'}
      <BudgetSection {account} />
    {:else if activeSection === 'connection'}
      <ConnectionSection {account} />
    {:else if activeSection === 'data'}
      <DataSection {account} />
    {:else if activeSection === 'balance'}
      <BalanceManagementSection {account} />
    {:else if activeSection === 'transfer-mappings'}
      <TransferMappingsSection {account} />
    {:else if activeSection === 'rate-tiers'}
      <RateTiersSection {account} />
    {:else if activeSection === 'security'}
      <SecuritySection {account} />
    {:else if activeSection === 'danger'}
      <div data-tour-id="settings-danger-zone">
        <DangerSection {account} />
      </div>
    {/if}
  </main>
</div>
