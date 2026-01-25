<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	// Redirect to main payee page with analytics tab
	const payeeSlug = $derived(page.params['slug'] || '');

	$effect(() => {
		if (payeeSlug) {
			goto(`/payees/${payeeSlug}?tab=analytics`, { replaceState: true });
		} else {
			goto('/payees', { replaceState: true });
		}
	});
</script>

<div class="flex h-64 items-center justify-center">
	<p class="text-muted-foreground">Redirecting...</p>
</div>
