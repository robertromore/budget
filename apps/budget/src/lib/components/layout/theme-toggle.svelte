<script lang="ts">
import Sun from '@lucide/svelte/icons/sun';
import Moon from '@lucide/svelte/icons/moon';
import Monitor from '@lucide/svelte/icons/monitor';
import { setMode, userPrefersMode } from 'mode-watcher';
import { Button } from '$lib/components/ui/button/index.js';

const currentMode = $derived(userPrefersMode.current);

function cycleMode() {
	const current = userPrefersMode.current;
	if (current === 'light') {
		setMode('dark');
	} else if (current === 'dark') {
		setMode('system');
	} else {
		setMode('light');
	}
}
</script>

<Button onclick={cycleMode} variant="ghost" size="icon" class="h-8 w-8">
	{#if currentMode === 'light'}
		<Sun class="h-4 w-4" />
	{:else if currentMode === 'dark'}
		<Moon class="h-4 w-4" />
	{:else}
		<Monitor class="h-4 w-4" />
	{/if}
	<span class="sr-only">Toggle theme (current: {currentMode})</span>
</Button>
