<script lang="ts">
	import { EnhancedPayeeSelector } from '$lib/components/payees/enhanced-payee-selector';

	interface TransferAccount {
		id: number;
		name: string;
		accountType?: string | null;
	}

	let {
		value,
		onUpdateValue,
		accounts = [],
		currentAccountId,
		onTransferSelect,
	}: {
		value: number | null;
		onUpdateValue: (newValue: number | null) => void;
		accounts?: TransferAccount[];
		currentAccountId?: number;
		onTransferSelect?: (accountId: number) => void;
	} = $props();

	// Only show transfer tab if accounts are provided
	const showTransferTab = $derived(accounts.length > 0 && onTransferSelect !== undefined);
</script>

<EnhancedPayeeSelector
	{value}
	onValueChange={onUpdateValue}
	displayMode="compact"
	allowCreate={true}
	allowEdit={true}
	buttonClass="w-full h-8"
	placeholder="Select payee..."
	{showTransferTab}
	{accounts}
	{currentAccountId}
	{onTransferSelect}
/>
