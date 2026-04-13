<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';

	let {
		open = $bindable(false),
		categoryName,
		payeeName,
		matchCountByPayee,
		matchCountByCategory,
		previousCategoryName,
		onConfirmJustOne,
		onConfirmByPayee,
		onConfirmByCategory,
		onConfirmBoth,
		onCancel,
	}: {
		open: boolean;
		categoryName: string | null;
		payeeName: string;
		matchCountByPayee: number;
		matchCountByCategory: number;
		previousCategoryName: string | null;
		onConfirmJustOne: () => void;
		onConfirmByPayee: () => void;
		onConfirmByCategory: () => void;
		onConfirmBoth: () => void;
		onCancel: () => void;
	} = $props();
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content class="max-w-2xl">
		<AlertDialog.Header>
			<AlertDialog.Title>Update Similar Transactions?</AlertDialog.Title>
			<AlertDialog.Description class="space-y-3">
				{#if categoryName}
					<p>
						You're changing the category to "<strong>{categoryName}</strong>". How would you
						like to apply this change?
					</p>
				{:else}
					<p>
						You're <strong>removing the category</strong> from this transaction. How would you
						like to apply this change?
					</p>
				{/if}

				{#if matchCountByPayee > 0 && matchCountByCategory > 0}
					<div class="space-y-2 text-sm">
						<p>
							• <strong>{matchCountByPayee}</strong> other
							transaction{matchCountByPayee !== 1 ? 's' : ''} with the same payee "<strong
								>{payeeName}</strong
							>"
						</p>
						<p>
							• <strong>{matchCountByCategory}</strong> other
							transaction{matchCountByCategory !== 1 ? 's' : ''} with the category "<strong
								>{previousCategoryName}</strong
							>"
						</p>
					</div>
				{:else if matchCountByPayee > 0}
					<p class="text-sm">
						Found <strong>{matchCountByPayee}</strong> other
						transaction{matchCountByPayee !== 1 ? 's' : ''} with the same payee "<strong
							>{payeeName}</strong
						>".
					</p>
				{:else if matchCountByCategory > 0}
					<p class="text-sm">
						Found <strong>{matchCountByCategory}</strong> other
						transaction{matchCountByCategory !== 1 ? 's' : ''} with the category "<strong
							>{previousCategoryName}</strong
						>".
					</p>
				{/if}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer class="flex-col gap-2 sm:flex-col">
			{#if matchCountByPayee > 0 && matchCountByCategory > 0}
				<AlertDialog.Action onclick={onConfirmBoth} class="w-full">
					Update All ({matchCountByPayee + matchCountByCategory} transactions)
				</AlertDialog.Action>
				<Button
					onclick={() => { open = false; onConfirmByPayee(); }}
					variant="secondary"
					class="w-full">
					Only Same Payee ({matchCountByPayee + 1} transactions)
				</Button>
				<Button
					onclick={() => { open = false; onConfirmByCategory(); }}
					variant="secondary"
					class="w-full">
					Rename Category ({matchCountByCategory + 1} transactions)
				</Button>
			{:else if matchCountByPayee > 0}
				<AlertDialog.Action onclick={onConfirmByPayee} class="w-full">
					Update All Same Payee ({matchCountByPayee + 1} transactions)
				</AlertDialog.Action>
			{:else if matchCountByCategory > 0}
				<AlertDialog.Action onclick={onConfirmByCategory} class="w-full">
					Rename Category ({matchCountByCategory + 1} transactions)
				</AlertDialog.Action>
			{/if}
			<Button
				onclick={() => { open = false; onConfirmJustOne(); }}
				variant="secondary"
				class="w-full">
				Just This One
			</Button>
			<AlertDialog.Cancel onclick={onCancel} class="w-full">Cancel</AlertDialog.Cancel>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
