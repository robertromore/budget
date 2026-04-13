<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import type { ProcessorPattern } from '$lib/utils/import/payment-processor-filter';

	let {
		open = $bindable(false),
		processorAnalysis,
		onApply,
		PAYMENT_PROCESSORS,
	}: {
		open: boolean;
		processorAnalysis: { total: number; byProcessor: Map<string, number> };
		onApply: (selectedProcessors: Set<string>) => void;
		PAYMENT_PROCESSORS: ProcessorPattern[];
	} = $props();

	let selectedProcessors = $state(new Set<string>());
	let affectedCount = $state(0);

	// Reset internal state when dialog opens
	function handleOpenChange(isOpen: boolean) {
		open = isOpen;
		if (isOpen) {
			// Pre-select all processors that have transactions
			const preselected = new Set<string>();
			for (const [processor, count] of processorAnalysis.byProcessor) {
				if (count > 0) {
					preselected.add(processor);
				}
			}
			selectedProcessors = preselected;
			affectedCount = processorAnalysis.total;
		}
	}

	function toggleProcessor(processorName: string) {
		const newSelection = new Set(selectedProcessors);
		if (newSelection.has(processorName)) {
			newSelection.delete(processorName);
		} else {
			newSelection.add(processorName);
		}

		// Calculate affected count
		let count = 0;
		for (const [processor, processorCount] of processorAnalysis.byProcessor) {
			if (newSelection.has(processor)) {
				count += processorCount;
			}
		}

		selectedProcessors = newSelection;
		affectedCount = count;
	}

	function handleCancel() {
		open = false;
	}

	function handleApply() {
		onApply(selectedProcessors);
		open = false;
	}
</script>

<AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
	<AlertDialog.Content class="max-w-lg">
		<AlertDialog.Header>
			<AlertDialog.Title>Filter Payment Processors</AlertDialog.Title>
			<AlertDialog.Description>
				Select which payment processors and vendor providers to filter out from payee names. This
				will extract the actual merchant name from transactions like "PayPal - Acme tools" → "Acme
				tools".
			</AlertDialog.Description>
		</AlertDialog.Header>

		<div class="space-y-3 py-4">
			{#each PAYMENT_PROCESSORS as processor}
				{@const count = processorAnalysis.byProcessor.get(processor.name) || 0}
				{#if count > 0}
					<div class="flex items-start justify-between gap-3">
						<div class="flex flex-1 items-start gap-3">
							<Checkbox
								id={`processor-${processor.name}`}
								checked={selectedProcessors.has(processor.name)}
								onCheckedChange={() => toggleProcessor(processor.name)} />
							<label for={`processor-${processor.name}`} class="flex-1 cursor-pointer">
								<div class="text-sm font-medium">{processor.name}</div>
								<div class="text-muted-foreground text-xs">{processor.description}</div>
							</label>
						</div>
						<div class="text-muted-foreground text-sm whitespace-nowrap">
							{count} transaction{count !== 1 ? 's' : ''}
						</div>
					</div>
				{/if}
			{/each}
		</div>

		{#if affectedCount > 0}
			<div class="bg-muted rounded-md p-3">
				<p class="text-sm">
					<strong>{affectedCount}</strong>
					transaction{affectedCount !== 1 ? 's' : ''} will be updated
				</p>
			</div>
		{/if}

		<AlertDialog.Footer>
			<AlertDialog.Cancel onclick={handleCancel}>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action onclick={handleApply} disabled={selectedProcessors.size === 0}>
				Apply Filter
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
