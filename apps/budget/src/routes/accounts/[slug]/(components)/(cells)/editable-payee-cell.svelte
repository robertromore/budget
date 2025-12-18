<script lang="ts">
	import { EnhancedPayeeSelector } from '$lib/components/payees/enhanced-payee-selector';

	let {
		value,
		onUpdateValue,
	}: {
		value: number | null;
		onUpdateValue: (newValue: number | null) => void;
	} = $props();
</script>

<EnhancedPayeeSelector
	{value}
	onValueChange={onUpdateValue}
	displayMode="compact"
	allowCreate={true}
	allowEdit={true}
	buttonClass="w-full h-8"
	placeholder="Select payee..."
/>
