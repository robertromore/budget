<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { rpc } from '$lib/query';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { toast } from '$lib/utils/toast-interceptor';
	import Check from '@lucide/svelte/icons/check';
	import Loader from '@lucide/svelte/icons/loader';
	import X from '@lucide/svelte/icons/x';

	// Get token from URL query param
	const token = $derived(page.url.searchParams.get('token') || '');

	let password = $state('');
	let confirmPassword = $state('');
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

	const resetPasswordMutation = rpc.auth.resetPassword.options();
	const isLoading = $derived(resetPasswordMutation.isPending);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = null;

		if (!token) {
			error = 'Invalid or missing reset token';
			return;
		}

		if (!allRequirementsMet) {
			error = 'Please meet all password requirements';
			return;
		}

		if (!passwordsMatch) {
			error = 'Passwords do not match';
			return;
		}

		try {
			await resetPasswordMutation.mutateAsync({ token, newPassword: password });
			toast.success('Password reset successfully!');
			goto('/login');
		} catch (err) {
			if (err instanceof Error) {
				error = err.message;
			} else {
				error = 'Failed to reset password. The link may have expired.';
			}
		}
	}
</script>

<svelte:head>
	<title>Reset Password</title>
</svelte:head>

<Card.Root>
	<Card.Header class="text-center">
		<Card.Title class="text-2xl">Reset your password</Card.Title>
		<Card.Description>Enter your new password below</Card.Description>
	</Card.Header>
	<Card.Content>
		{#if !token}
			<div class="space-y-4 text-center">
				<p class="text-destructive text-sm">
					Invalid or missing password reset link.
				</p>
				<Button variant="outline" href="/forgot-password" class="w-full">
					Request a new link
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
					<Label for="password">New Password</Label>
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
						Resetting...
					{:else}
						Reset password
					{/if}
				</Button>
			</form>
		{/if}
	</Card.Content>
	<Card.Footer class="justify-center">
		<a href="/login" class="text-muted-foreground hover:text-foreground text-sm">
			Back to login
		</a>
	</Card.Footer>
</Card.Root>
