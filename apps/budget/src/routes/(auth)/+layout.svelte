<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="bg-background flex min-h-screen items-center justify-center p-4">
	<div class="w-full max-w-md">
		{@render children?.()}
	</div>
</div>
