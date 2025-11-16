<script lang="ts">
interface Props {
  lastTransactionDate: string | null;
}

let {lastTransactionDate}: Props = $props();

const formatLastTransaction = (date: string | null) => {
  if (!date) return 'No transactions';
  return new Date(date).toLocaleDateString();
};
</script>

<span class="text-sm">{formatLastTransaction(lastTransactionDate)}</span>
