<script lang="ts">
import { Button } from '$lib/components/ui/button';
import * as Popover from '$lib/components/ui/popover';
import { Textarea } from '$lib/components/ui/textarea';
import { Badge } from '$lib/components/ui/badge';
import * as Tooltip from '$lib/components/ui/tooltip';
import { cn } from '$lib/utils';
import SquarePen from '@lucide/svelte/icons/square-pen';
import Archive from '@lucide/svelte/icons/archive';
import Scale from '@lucide/svelte/icons/scale';

interface Props {
	value: string | null;
	onUpdateValue: (newValue: string) => void;
	isArchived?: boolean;
	isAdjustment?: boolean;
	adjustmentReason?: string | null;
}

let { value, onUpdateValue, isArchived = false, isAdjustment = false, adjustmentReason }: Props = $props();

let open = $state(false);
let newValue = $state('');

const handleSubmit = () => {
	open = false;
	onUpdateValue(newValue);
};
</script>

<div class="flex flex-col gap-1">
	<!-- Editable notes -->
	<Popover.Root
		bind:open
		onOpenChange={() => {
			newValue = value || '';
		}}>
		<Popover.Trigger>
			{#snippet child({ props })}
				<Button
					{...props}
					variant="outline"
					class={cn(
						'block w-48 justify-start overflow-hidden text-left font-normal text-ellipsis whitespace-nowrap',
						!value && 'text-muted-foreground',
						isArchived && 'line-through opacity-60'
					)}>
					<SquarePen class="mr-1 inline-block size-4 align-top" />
					{value || ''}
				</Button>
			{/snippet}
		</Popover.Trigger>
		<Popover.Content class="grid w-auto gap-2 p-2" align="start">
			<Textarea
				placeholder=""
				value={value?.toString() || ''}
				onchange={(e) => (newValue = (e.target as HTMLTextAreaElement).value)} />
			<Button onclick={handleSubmit}>Save</Button>
		</Popover.Content>
	</Popover.Root>

	<!-- Status badges -->
	{#if isArchived || isAdjustment}
		<div class="flex items-center gap-1">
			{#if isArchived}
				<Tooltip.Root>
					<Tooltip.Trigger>
						<Badge variant="secondary" class="gap-1 px-1.5 py-0 text-[10px] opacity-80">
							<Archive class="h-3 w-3" />
							<span>Archived</span>
						</Badge>
					</Tooltip.Trigger>
					<Tooltip.Content>
						<p>Excluded from balance calculations</p>
					</Tooltip.Content>
				</Tooltip.Root>
			{/if}

			{#if isAdjustment}
				<Tooltip.Root>
					<Tooltip.Trigger>
						<Badge variant="outline" class="gap-1 border-amber-400 bg-amber-50 px-1.5 py-0 text-[10px] text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
							<Scale class="h-3 w-3" />
							<span>Adjustment</span>
						</Badge>
					</Tooltip.Trigger>
					<Tooltip.Content class="max-w-xs">
						<p class="font-medium">Balance Adjustment</p>
						{#if adjustmentReason}
							<p class="text-muted-foreground text-sm">{adjustmentReason}</p>
						{/if}
					</Tooltip.Content>
				</Tooltip.Root>
			{/if}
		</div>
	{/if}
</div>
