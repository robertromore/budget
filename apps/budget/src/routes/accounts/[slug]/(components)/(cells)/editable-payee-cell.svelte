<script lang="ts">
import { SheetPayeeSelector } from '$lib/components/payees/advanced-payee-selector';

let {
  value,
  onUpdateValue,
  transactionContext,
}: {
  value: number | null;
  onUpdateValue: (newValue: number) => void;
  transactionContext?: {
    amount?: number;
    categoryId?: number;
    accountId?: number;
  };
} = $props();
</script>

<SheetPayeeSelector
  {value}
  onValueChange={onUpdateValue}
  {transactionContext}
  displayMode="compact"
  groupStrategy="usage"
  showQuickAccess={true}
  allowCreate={false}
  buttonClass="w-full h-8 text-xs"
  placeholder="Select payee..." />
