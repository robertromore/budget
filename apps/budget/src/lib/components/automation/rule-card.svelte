<!--
  Rule Card

  Displays a summary of an automation rule with quick actions.
-->
<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Switch } from '$lib/components/ui/switch';
	import type { AutomationRule } from '$lib/schema/automation-rules';
	import type { EntityType } from '$lib/types/automation';
	import { entityTypes, getActionLabel, triggerEvents } from '$lib/types/automation';
	import { cn } from '$lib/utils';
	import Copy from '@lucide/svelte/icons/copy';
	import History from '@lucide/svelte/icons/history';
	import MoreVertical from '@lucide/svelte/icons/more-vertical';
	import Pause from '@lucide/svelte/icons/pause';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Play from '@lucide/svelte/icons/play';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Zap from '@lucide/svelte/icons/zap';

	interface Props {
		rule: AutomationRule;
		onToggleEnabled?: (id: number, enabled: boolean) => void;
		onEdit?: (id: number) => void;
		onDuplicate?: (id: number) => void;
		onDelete?: (id: number) => void;
		onViewLogs?: (id: number) => void;
	}

	let { rule, onToggleEnabled, onEdit, onDuplicate, onDelete, onViewLogs }: Props = $props();

	// Get entity type label
	const entityTypeLabel = $derived(
		entityTypes.find((t) => t.value === rule.trigger.entityType)?.label || rule.trigger.entityType
	);

	// Get trigger event label
	const triggerEventLabel = $derived(() => {
		const events = triggerEvents[rule.trigger.entityType as EntityType] || [];
		return events.find((e) => e.event === rule.trigger.event)?.label || rule.trigger.event;
	});

	// Format last triggered date
	const lastTriggeredDisplay = $derived(() => {
		if (!rule.lastTriggeredAt) return 'Never';
		const date = new Date(rule.lastTriggeredAt);
		return date.toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	});

	function handleToggle(checked: boolean) {
		onToggleEnabled?.(rule.id, checked);
	}
</script>

<Card.Root class={cn('transition-all hover:shadow-md', !rule.isEnabled && 'opacity-60')}>
	<Card.Header class="pb-2">
		<div class="flex items-start justify-between gap-2">
			<div class="flex items-center gap-2">
				<div
					class={cn(
						'rounded-md p-1.5',
						rule.isEnabled ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-muted text-muted-foreground'
					)}
				>
					<Zap class="h-4 w-4" />
				</div>
				<div>
					<Card.Title class="text-base">{rule.name}</Card.Title>
					{#if rule.description}
						<Card.Description class="mt-0.5 line-clamp-1">
							{rule.description}
						</Card.Description>
					{/if}
				</div>
			</div>

			<div class="flex items-center gap-2">
				<Switch
					checked={rule.isEnabled}
					onCheckedChange={handleToggle}
					aria-label={rule.isEnabled ? 'Disable rule' : 'Enable rule'}
				/>

				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button variant="ghost" size="icon" class="h-8 w-8" {...props}>
								<MoreVertical class="h-4 w-4" />
								<span class="sr-only">Actions</span>
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end">
						<DropdownMenu.Item onclick={() => onEdit?.(rule.id)}>
							<Pencil class="mr-2 h-4 w-4" />
							Edit
						</DropdownMenu.Item>
						<DropdownMenu.Item onclick={() => onDuplicate?.(rule.id)}>
							<Copy class="mr-2 h-4 w-4" />
							Duplicate
						</DropdownMenu.Item>
						<DropdownMenu.Item onclick={() => onViewLogs?.(rule.id)}>
							<History class="mr-2 h-4 w-4" />
							View Logs
						</DropdownMenu.Item>
						<DropdownMenu.Separator />
						<DropdownMenu.Item
							class="text-destructive focus:text-destructive"
							onclick={() => onDelete?.(rule.id)}
						>
							<Trash2 class="mr-2 h-4 w-4" />
							Delete
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
		</div>
	</Card.Header>

	<Card.Content class="pt-2">
		<!-- Trigger Info -->
		<div class="flex flex-wrap items-center gap-2 text-sm">
			<Badge variant="secondary" class="font-normal">
				{entityTypeLabel}
			</Badge>
			<span class="text-muted-foreground">→</span>
			<span class="text-muted-foreground">{triggerEventLabel()}</span>
		</div>

		<!-- Stats -->
		<div class="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
			<div class="flex items-center gap-1">
				{#if rule.isEnabled}
					<Play class="h-3 w-3 text-green-500" />
				{:else}
					<Pause class="h-3 w-3" />
				{/if}
				<span>{rule.isEnabled ? 'Active' : 'Paused'}</span>
			</div>
			<div>Triggered: {rule.triggerCount} times</div>
			<div>Last: {lastTriggeredDisplay()}</div>
		</div>

		<!-- Actions Summary -->
		<div class="mt-2 flex flex-wrap items-center gap-1">
			{#each rule.actions.slice(0, 3) as action, i (action.id || i)}
				<Badge variant="outline" class="text-xs">
					{getActionLabel(action.type)}
				</Badge>
			{/each}
			{#if rule.actions.length > 3}
				<Badge variant="outline" class="text-xs">
					+{rule.actions.length - 3} more
				</Badge>
			{/if}
		</div>
	</Card.Content>
</Card.Root>
