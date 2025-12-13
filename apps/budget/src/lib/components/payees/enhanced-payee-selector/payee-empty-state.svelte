<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import type { Payee } from "$lib/schema/payees";
	import Clock from "@lucide/svelte/icons/clock";
	import Plus from "@lucide/svelte/icons/plus";
	import User from "@lucide/svelte/icons/user";
	import { getRecentPayees } from "../advanced-payee-selector/utils";

	interface Props {
		payees: Payee[];
		onCreateNew: () => void;
		onPayeeFocus: (payeeId: number) => void;
	}

	let { payees, onCreateNew, onPayeeFocus }: Props = $props();

	const recentPayees = $derived(getRecentPayees(payees, 5));
</script>

<div class="flex h-full flex-col items-center justify-center p-6 text-center">
	<div
		class="bg-muted/50 mb-4 flex h-16 w-16 items-center justify-center rounded-full"
	>
		<User class="text-muted-foreground h-8 w-8" />
	</div>

	<h3 class="text-lg font-semibold">Select a Payee</h3>
	<p class="text-muted-foreground mt-1 text-sm">
		Choose a payee from the list or create a new one
	</p>

	<Button variant="outline" class="mt-4" onclick={onCreateNew}>
		<Plus class="mr-2 h-4 w-4" />
		Create New Payee
	</Button>

	{#if recentPayees.length > 0}
		<div class="mt-8 w-full max-w-xs">
			<div
				class="text-muted-foreground mb-3 flex items-center justify-center gap-2 text-sm"
			>
				<Clock class="h-4 w-4" />
				<span>Recent Payees</span>
			</div>
			<div class="space-y-1">
				{#each recentPayees as payee (payee.id)}
					<button
						type="button"
						class="hover:bg-accent w-full rounded-lg px-3 py-2 text-left text-sm transition-colors"
						onclick={() => onPayeeFocus(payee.id)}
					>
						{payee.name}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>
