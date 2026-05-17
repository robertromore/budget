<!--
  Empty-state chip cluster for the chat. Surfaces a handful of
  high-leverage slash commands so first-time users (and returning ones)
  can discover what the assistant can do without typing `/`.
-->
<script lang="ts">
interface Suggestion {
  label: string;
  /** Value the input is set to when the chip is clicked. */
  prompt: string;
}

interface Props {
  onSelect: (prompt: string) => void;
  class?: string;
}

const { onSelect, class: className }: Props = $props();

const suggestions: Suggestion[] = [
  { label: 'Account balances', prompt: '/balance' },
  { label: 'Recent transactions', prompt: '/transactions 10' },
  { label: 'Find savings', prompt: '/savings' },
  { label: 'Forecast next 3 months', prompt: '/forecast 3' },
  { label: 'Unusual transactions', prompt: '/anomalies 30' },
  { label: 'Recurring bills', prompt: '/recurring monthly' },
];
</script>

<div class={['flex flex-wrap items-center justify-center gap-2', className]}>
  {#each suggestions as suggestion (suggestion.prompt)}
    <button
      type="button"
      class="border-border bg-background hover:bg-accent hover:text-accent-foreground rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
      onclick={() => onSelect(suggestion.prompt)}>
      {suggestion.label}
    </button>
  {/each}
</div>
