<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { PayeeIntelligenceTab } from '$lib/components/payees';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { PayeesState } from '$lib/states/entities/payees.svelte';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Brain from '@lucide/svelte/icons/brain';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import SquarePen from '@lucide/svelte/icons/square-pen';
	import User from '@lucide/svelte/icons/user';

	// Get payee slug from URL parameter
	const payeeSlug = $derived(page.params['slug'] || '');

	// Get payee data
	const payeesState = PayeesState.get();
	const payee = $derived(payeeSlug ? payeesState.getBySlug(payeeSlug) : null);

	// Page metadata
	const pageTitle = $derived(payee ? `${payee.name} - Intelligence` : 'Payee Intelligence');
	const pageDescription = 'AI-powered insights and predictions based on transaction history';

	// Redirect to payees list if no valid slug provided
	$effect(() => {
		if (!payeeSlug) {
			goto('/payees');
		}
	});

	// Action handlers
	function handleApplyCategory(categoryId: number) {
		// Navigate to edit page with the category pre-selected
		if (payee) {
			goto(`/payees/${payee.slug}/edit?applyCategory=${categoryId}`);
		}
	}

	function handleApplyBudget(amount: number) {
		// Navigate to edit page with the budget pre-filled
		if (payee) {
			goto(`/payees/${payee.slug}/edit?applyBudget=${amount}`);
		}
	}

	function handleDetectSubscription() {
		// Navigate to edit page to set up subscription
		if (payee) {
			goto(`/payees/${payee.slug}/edit?tab=business`);
		}
	}
</script>

<svelte:head>
	<title>{pageTitle} - Budget App</title>
	<meta name="description" content={pageDescription} />
</svelte:head>

<div class="container mx-auto space-y-6 py-6">
	<!-- Page Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="sm" href="/payees/{payeeSlug}" class="p-2">
				<ArrowLeft class="h-4 w-4" />
				<span class="sr-only">Back to Payee</span>
			</Button>
			<div>
				<h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
					<Brain class="text-primary h-8 w-8" />
					{payee?.name || 'Loading...'}
				</h1>
				<p class="text-muted-foreground mt-1">{pageDescription}</p>
			</div>
		</div>

		{#if payee}
			<div class="flex items-center gap-2">
				<Badge variant="secondary" class="flex items-center gap-2">
					<Sparkles class="h-4 w-4" />
					AI Insights
				</Badge>
				<Button variant="outline" href="/payees/{payee.slug}/edit">
					<SquarePen class="mr-2 h-4 w-4" />
					Edit Payee
				</Button>
			</div>
		{/if}
	</div>

	{#if payee}
		<!-- Intelligence Dashboard -->
		<PayeeIntelligenceTab
			payeeId={payee.id}
			payeeName={payee.name || ''}
			formData={null}
			onApplyCategory={handleApplyCategory}
			onApplyBudget={handleApplyBudget}
			onDetectSubscription={handleDetectSubscription}
		/>
	{:else if payeeSlug}
		<!-- Loading/Not Found State -->
		<Card.Root class="max-w-4xl">
			<Card.Content class="py-8 text-center">
				<User class="text-muted-foreground mx-auto mb-4 h-12 w-12" />
				<h2 class="mb-2 text-xl font-semibold">Payee Not Found</h2>
				<p class="text-muted-foreground mb-4">
					The payee you're looking for doesn't exist or may have been deleted.
				</p>
				<Button href="/payees">
					<ArrowLeft class="mr-2 h-4 w-4" />
					Back to Payees
				</Button>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
