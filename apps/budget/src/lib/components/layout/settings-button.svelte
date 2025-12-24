<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import Settings from '@lucide/svelte/icons/settings';
</script>

<Tooltip.Root>
	<Tooltip.Trigger>
		{#snippet child({ props })}
			<Button variant="ghost" size="icon" href="/settings" aria-label="Settings" data-help-id="settings-button" data-help-title="Settings" {...props}>
				<Settings class="h-4 w-4" />
			</Button>
		{/snippet}
	</Tooltip.Trigger>
	<Tooltip.Content>Settings</Tooltip.Content>
</Tooltip.Root>
