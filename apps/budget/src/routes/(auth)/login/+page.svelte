<script lang="ts">
	import { goto } from '$app/navigation';
	import { signIn } from '$lib/auth-client';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { toast } from '$lib/utils/toast-interceptor';
	import Loader from '@lucide/svelte/icons/loader';

	let email = $state('');
	let password = $state('');
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = null;
		isLoading = true;

		try {
			const result = await signIn.email({
				email,
				password
			});

			if (result.error) {
				error = result.error.message || 'Invalid email or password';
				return;
			}

			toast.success('Welcome back!');
			goto('/');
		} catch (err) {
			error = 'An error occurred. Please try again.';
			console.error('Login error:', err);
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Login</title>
</svelte:head>

<Card.Root>
	<Card.Header class="text-center">
		<Card.Title class="text-2xl">Welcome back</Card.Title>
		<Card.Description>Sign in to your account to continue</Card.Description>
	</Card.Header>
	<Card.Content>
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

			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<Label for="password">Password</Label>
					<a href="/forgot-password" class="text-primary text-sm hover:underline">
						Forgot password?
					</a>
				</div>
				<Input
					id="password"
					type="password"
					autocomplete="current-password"
					bind:value={password}
					required
					disabled={isLoading}
				/>
			</div>

			<Button type="submit" class="w-full" disabled={isLoading}>
				{#if isLoading}
					<Loader class="mr-2 h-4 w-4 animate-spin" />
					Signing in...
				{:else}
					Sign in
				{/if}
			</Button>
		</form>
	</Card.Content>
	<Card.Footer class="flex-col gap-2">
		<div class="text-muted-foreground text-sm">
			Don't have an account?
			<a href="/signup" class="text-primary hover:underline">Sign up</a>
		</div>
	</Card.Footer>
</Card.Root>
