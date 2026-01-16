<script lang="ts">
	import { goto } from '$app/navigation';
	import { signUp } from '$lib/auth-client';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { toast } from '$lib/utils/toast-interceptor';
	import Check from '@lucide/svelte/icons/check';
	import Loader from '@lucide/svelte/icons/loader';
	import X from '@lucide/svelte/icons/x';

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	// Password requirements
	const passwordRequirements = $derived.by(() => {
		return [
			{ label: 'At least 8 characters', met: password.length >= 8 },
			{ label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
			{ label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
			{ label: 'Contains number', met: /[0-9]/.test(password) }
		];
	});

	const allRequirementsMet = $derived(passwordRequirements.every((r) => r.met));
	const passwordsMatch = $derived(password === confirmPassword && confirmPassword.length > 0);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = null;

		if (!allRequirementsMet) {
			error = 'Please meet all password requirements';
			return;
		}

		if (!passwordsMatch) {
			error = 'Passwords do not match';
			return;
		}

		isLoading = true;

		try {
			const result = await signUp.email({
				email,
				password,
				name
			});

			if (result.error) {
				error = result.error.message || 'Failed to create account';
				return;
			}

			toast.success('Account created successfully!');
			goto('/');
		} catch (err) {
			error = 'An error occurred. Please try again.';
			console.error('Signup error:', err);
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Sign Up</title>
</svelte:head>

<Card.Root>
	<Card.Header class="text-center">
		<Card.Title class="text-2xl">Create an account</Card.Title>
		<Card.Description>Enter your details to get started</Card.Description>
	</Card.Header>
	<Card.Content>
		<form onsubmit={handleSubmit} class="space-y-4">
			{#if error}
				<div class="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
					{error}
				</div>
			{/if}

			<div class="space-y-2">
				<Label for="name">Name</Label>
				<Input
					id="name"
					type="text"
					placeholder="John Doe"
					autocomplete="name"
					bind:value={name}
					required
					disabled={isLoading}
				/>
			</div>

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

			<div class="space-y-2">
				<Label for="password">Password</Label>
				<Input
					id="password"
					type="password"
					autocomplete="new-password"
					bind:value={password}
					required
					disabled={isLoading}
				/>
				{#if password.length > 0}
					<ul class="mt-2 space-y-1">
						{#each passwordRequirements as req}
							<li class="flex items-center gap-2 text-xs">
								{#if req.met}
									<Check class="text-green-500 h-3 w-3" />
									<span class="text-muted-foreground">{req.label}</span>
								{:else}
									<X class="text-destructive h-3 w-3" />
									<span class="text-muted-foreground">{req.label}</span>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="space-y-2">
				<Label for="confirmPassword">Confirm Password</Label>
				<Input
					id="confirmPassword"
					type="password"
					autocomplete="new-password"
					bind:value={confirmPassword}
					required
					disabled={isLoading}
				/>
				{#if confirmPassword.length > 0}
					<p class="text-xs">
						{#if passwordsMatch}
							<span class="text-green-500 flex items-center gap-1">
								<Check class="h-3 w-3" />
								Passwords match
							</span>
						{:else}
							<span class="text-destructive flex items-center gap-1">
								<X class="h-3 w-3" />
								Passwords do not match
							</span>
						{/if}
					</p>
				{/if}
			</div>

			<Button
				type="submit"
				class="w-full"
				disabled={isLoading || !allRequirementsMet || !passwordsMatch}
			>
				{#if isLoading}
					<Loader class="mr-2 h-4 w-4 animate-spin" />
					Creating account...
				{:else}
					Create account
				{/if}
			</Button>
		</form>
	</Card.Content>
	<Card.Footer class="flex-col gap-2">
		<div class="text-muted-foreground text-sm">
			Already have an account?
			<a href="/login" class="text-primary hover:underline">Sign in</a>
		</div>
	</Card.Footer>
</Card.Root>
