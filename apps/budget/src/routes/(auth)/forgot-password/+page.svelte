<script lang="ts">
	import { rpc } from '$lib/query';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Loader from '@lucide/svelte/icons/loader';
	import Mail from '@lucide/svelte/icons/mail';

	let email = $state('');
	let isSubmitted = $state(false);
	let error = $state<string | null>(null);

	const forgotPasswordMutation = rpc.auth.forgotPassword.options();
	const isLoading = $derived(forgotPasswordMutation.isPending);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = null;

		try {
			await forgotPasswordMutation.mutateAsync({ email });
			isSubmitted = true;
		} catch (err) {
			// Don't expose whether the email exists
			isSubmitted = true;
		}
	}
</script>

<svelte:head>
	<title>Forgot Password</title>
</svelte:head>

<Card.Root>
	<Card.Header class="text-center">
		{#if isSubmitted}
			<div class="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
				<Mail class="text-primary h-6 w-6" />
			</div>
			<Card.Title class="text-2xl">Check your email</Card.Title>
			<Card.Description>
				If an account exists with {email}, you will receive a password reset link.
			</Card.Description>
		{:else}
			<Card.Title class="text-2xl">Forgot password?</Card.Title>
			<Card.Description>
				Enter your email and we'll send you a link to reset your password.
			</Card.Description>
		{/if}
	</Card.Header>
	<Card.Content>
		{#if isSubmitted}
			<div class="space-y-4">
				<p class="text-muted-foreground text-center text-sm">
					Didn't receive the email? Check your spam folder or try again.
				</p>
				<Button variant="outline" class="w-full" onclick={() => (isSubmitted = false)}>
					Try another email
				</Button>
			</div>
		{:else}
			<form onsubmit={handleSubmit} class="space-y-4">
				{#if error}
					<div class="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
						{error}
					</div>
				{/if}

				<div class="space-y-2">
					<Label for="email">Email</Label>
					<Input
						id="email"
						type="email"
						placeholder="name@example.com"
						autocomplete="email"
						bind:value={email}
						required
						disabled={isLoading}
					/>
				</div>

				<Button type="submit" class="w-full" disabled={isLoading}>
					{#if isLoading}
						<Loader class="mr-2 h-4 w-4 animate-spin" />
						Sending...
					{:else}
						Send reset link
					{/if}
				</Button>
			</form>
		{/if}
	</Card.Content>
	<Card.Footer class="justify-center">
		<a href="/login" class="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm">
			<ArrowLeft class="h-4 w-4" />
			Back to login
		</a>
	</Card.Footer>
</Card.Root>
