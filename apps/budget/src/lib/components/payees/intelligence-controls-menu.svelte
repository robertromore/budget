<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
// Icons
	import Calendar from '@lucide/svelte/icons/calendar';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import MoreVertical from '@lucide/svelte/icons/more-vertical';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Users from '@lucide/svelte/icons/users';
	import Wand2 from '@lucide/svelte/icons/wand-2';

	interface Props {
		payeeId: number;
		isLoading: boolean;
		onRefresh: () => void;
		onDetectSubscription?: () => void;
		onApplyAll?: () => void;
		onExplain?: () => void;
		onFindSimilar?: () => void;
	}

	let {
		payeeId,
		isLoading,
		onRefresh,
		onDetectSubscription,
		onApplyAll,
		onExplain,
		onFindSimilar,
	}: Props = $props();
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button variant="ghost" size="icon" {...props} disabled={isLoading}>
				{#if isLoading}
					<LoaderCircle class="h-4 w-4 animate-spin" />
				{:else}
					<MoreVertical class="h-4 w-4" />
				{/if}
				<span class="sr-only">Intelligence actions</span>
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>

	<DropdownMenu.Content align="end" class="w-56">
		<DropdownMenu.Label>Intelligence Actions</DropdownMenu.Label>
		<DropdownMenu.Separator />

		<DropdownMenu.Group>
			<DropdownMenu.Item onclick={onRefresh} disabled={isLoading}>
				<RefreshCw class="mr-2 h-4 w-4" />
				Refresh Data
			</DropdownMenu.Item>

			{#if onDetectSubscription}
				<DropdownMenu.Item onclick={onDetectSubscription} disabled={isLoading}>
					<Calendar class="mr-2 h-4 w-4" />
					Detect Subscription
				</DropdownMenu.Item>
			{/if}

			{#if onApplyAll}
				<DropdownMenu.Item onclick={onApplyAll} disabled={isLoading}>
					<Wand2 class="mr-2 h-4 w-4" />
					Apply All Suggestions
				</DropdownMenu.Item>
			{/if}
		</DropdownMenu.Group>

		<DropdownMenu.Separator />

		<DropdownMenu.Group>
			{#if onExplain}
				<DropdownMenu.Item onclick={onExplain} disabled={isLoading}>
					<Sparkles class="mr-2 h-4 w-4" />
					Explain with AI
				</DropdownMenu.Item>
			{/if}

			{#if onFindSimilar}
				<DropdownMenu.Item onclick={onFindSimilar} disabled={isLoading}>
					<Users class="mr-2 h-4 w-4" />
					Find Similar Payees
				</DropdownMenu.Item>
			{/if}
		</DropdownMenu.Group>
	</DropdownMenu.Content>
</DropdownMenu.Root>
