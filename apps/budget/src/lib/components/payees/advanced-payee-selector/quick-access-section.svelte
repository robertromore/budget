<script lang="ts">
import type {Payee} from '$lib/schema/payees';
import type {DisplayMode, QuickAccessSections} from './types';
import PayeeItem from './payee-item.svelte';
import GroupHeader from './group-header.svelte';

let {
  sections,
  selectedPayeeId,
  displayMode = 'normal',
  onSelect
}: {
  sections: QuickAccessSections;
  selectedPayeeId: number | null;
  displayMode?: DisplayMode;
  onSelect: (payeeId: number) => void;
} = $props();

let showRecent = $state(true);
let showFrequent = $state(true);
let showSuggested = $state(true);

function toggleRecent() {
  showRecent = !showRecent;
}

function toggleFrequent() {
  showFrequent = !showFrequent;
}

function toggleSuggested() {
  showSuggested = !showSuggested;
}

const hasAnyItems = $derived(
  sections.recent.length > 0 ||
  sections.frequent.length > 0 ||
  sections.suggested.length > 0
);
</script>

{#if hasAnyItems}
  <div class="border-b border-border">
    <!-- Suggested Section -->
    {#if sections.suggested.length > 0}
      <GroupHeader
        label="Suggested"
        count={sections.suggested.length}
        isExpanded={showSuggested}
        onToggle={toggleSuggested}
      />
      {#if showSuggested}
        <div class="py-1">
          {#each sections.suggested as payee (payee.id)}
            <PayeeItem
              payee={{...payee, _isSuggested: true}}
              {displayMode}
              isSelected={payee.id === selectedPayeeId}
              onSelect={() => onSelect(payee.id)}
            />
          {/each}
        </div>
      {/if}
    {/if}

    <!-- Recent Section -->
    {#if sections.recent.length > 0}
      <GroupHeader
        label="Recent"
        count={sections.recent.length}
        isExpanded={showRecent}
        onToggle={toggleRecent}
      />
      {#if showRecent}
        <div class="py-1">
          {#each sections.recent as payee (payee.id)}
            <PayeeItem
              payee={{...payee, _isRecent: true}}
              {displayMode}
              isSelected={payee.id === selectedPayeeId}
              onSelect={() => onSelect(payee.id)}
            />
          {/each}
        </div>
      {/if}
    {/if}

    <!-- Frequent Section -->
    {#if sections.frequent.length > 0}
      <GroupHeader
        label="Frequent"
        count={sections.frequent.length}
        isExpanded={showFrequent}
        onToggle={toggleFrequent}
      />
      {#if showFrequent}
        <div class="py-1">
          {#each sections.frequent as payee (payee.id)}
            <PayeeItem
              payee={{...payee, _isFrequent: true}}
              {displayMode}
              isSelected={payee.id === selectedPayeeId}
              onSelect={() => onSelect(payee.id)}
            />
          {/each}
        </div>
      {/if}
    {/if}
  </div>
{/if}
