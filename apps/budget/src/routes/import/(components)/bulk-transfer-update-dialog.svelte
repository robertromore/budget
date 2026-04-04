<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';

	let {
		open = $bindable(false),
		matchCount,
		accountName,
		originalPayeeName,
		onConfirmBulk,
		onKeepSingle,
		onRevert,
	}: {
		open: boolean;
		matchCount: number;
		accountName: string | null;
		originalPayeeName: string;
		onConfirmBulk: () => void;
		onKeepSingle: () => void;
		onRevert: () => void;
	} = $props();
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Convert Similar Transactions to Transfers?</AlertDialog.Title>
			<AlertDialog.Description>
				Found {matchCount} other transaction{matchCount !== 1 ? 's' : ''} with similar payee "{originalPayeeName}".
				<br /><br />
				Would you like to also convert {matchCount !== 1 ? 'them' : 'it'} to
				transfer{matchCount !== 1 ? 's' : ''} to "{accountName}"?
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer class="flex-col gap-2 sm:flex-col">
			<AlertDialog.Action onclick={onConfirmBulk} class="w-full">
				Yes, Convert All Similar
			</AlertDialog.Action>
			<AlertDialog.Cancel onclick={onKeepSingle} class="w-full">
				No, Just This One
			</AlertDialog.Cancel>
			<Button variant="outline" onclick={onRevert} class="w-full">
				Cancel & Revert
			</Button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
