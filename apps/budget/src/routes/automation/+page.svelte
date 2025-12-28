<!--
  Automation Rules Page

  Lists all automation rules with filtering and quick actions.
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { RuleList } from '$lib/components/automation';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { rpc } from '$lib/query';
	import type { AutomationRule } from '$lib/schema/automation-rules';
	import { toast } from 'svelte-sonner';

	// Queries
	const rulesQuery = rpc.automation.getAll().options();

	// Mutations
	const enableMutation = rpc.automation.enableRule.options();
	const disableMutation = rpc.automation.disableRule.options();
	const duplicateMutation = rpc.automation.duplicateRule.options();
	const deleteMutation = rpc.automation.deleteRule.options();

	// Delete confirmation state
	let deleteDialogOpen = $state(false);
	let ruleToDelete = $state<number | null>(null);

	function handleCreateNew() {
		goto('/automation/new');
	}

	async function handleToggleEnabled(id: number, enabled: boolean) {
		try {
			if (enabled) {
				await enableMutation.mutateAsync(id);
			} else {
				await disableMutation.mutateAsync(id);
			}
		} catch (error) {
			toast.error('Failed to update rule status');
		}
	}

	function handleEdit(id: number) {
		goto(`/automation/${id}`);
	}

	async function handleDuplicate(id: number) {
		try {
			const newRule = await duplicateMutation.mutateAsync({ id });
			toast.success('Rule duplicated');
			goto(`/automation/${newRule.id}`);
		} catch (error) {
			toast.error('Failed to duplicate rule');
		}
	}

	function handleDelete(id: number) {
		ruleToDelete = id;
		deleteDialogOpen = true;
	}

	async function confirmDelete() {
		if (ruleToDelete === null) return;

		try {
			await deleteMutation.mutateAsync(ruleToDelete);
			toast.success('Rule deleted');
		} catch (error) {
			toast.error('Failed to delete rule');
		} finally {
			deleteDialogOpen = false;
			ruleToDelete = null;
		}
	}

	function handleViewLogs(id: number) {
		goto(`/automation/${id}/logs`);
	}
</script>

<svelte:head>
	<title>Automation Rules</title>
</svelte:head>

<div class="container mx-auto py-6">
	<RuleList
		rules={(rulesQuery.data ?? []) as AutomationRule[]}
		isLoading={rulesQuery.isLoading}
		onCreateNew={handleCreateNew}
		onToggleEnabled={handleToggleEnabled}
		onEdit={handleEdit}
		onDuplicate={handleDuplicate}
		onDelete={handleDelete}
		onViewLogs={handleViewLogs}
	/>
</div>

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete Rule</AlertDialog.Title>
			<AlertDialog.Description>
				Are you sure you want to delete this automation rule? This action cannot be undone.
				All execution logs for this rule will also be deleted.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
				onclick={confirmDelete}
			>
				Delete
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
