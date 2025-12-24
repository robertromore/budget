<script lang="ts">
	import { goto } from '$app/navigation';
	import { signOut, useSession } from '$lib/auth-client';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Progress } from '$lib/components/ui/progress';
	import {
		changePassword,
		deleteAccount,
		getSessions,
		requestEmailVerification,
		revokeOtherSessions,
		revokeSession,
		updateProfile,
		type SessionInfo
	} from '$lib/query/auth';
	import BadgeCheck from '@lucide/svelte/icons/badge-check';
	import Laptop from '@lucide/svelte/icons/laptop';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Monitor from '@lucide/svelte/icons/monitor';
	import Shield from '@lucide/svelte/icons/shield';
	import Smartphone from '@lucide/svelte/icons/smartphone';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import X from '@lucide/svelte/icons/x';

	// Session and user data (useSession returns a nanostores atom)
	const sessionStore = useSession();
	const session = $derived($sessionStore);
	const user = $derived(session.data?.user);

	// Sessions query using the query wrapper pattern
	const sessionsQuery = getSessions().options();

	// Profile form state
	let displayName = $state('');
	let imageUrl = $state('');
	let isEditingProfile = $state(false);

	// Password form state
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let passwordStrength = $derived(calculatePasswordStrength(newPassword));

	// Delete account state
	let deletePassword = $state('');
	let deleteDialogOpen = $state(false);

	// Sync form when user data changes
	$effect(() => {
		if (user && !isEditingProfile) {
			displayName = user.name ?? '';
			imageUrl = user.image ?? '';
		}
	});

	// Mutations using the mutation wrapper pattern
	const updateProfileMutation = updateProfile.options();
	const changePasswordMutation = changePassword.options();
	const revokeSessionMutation = revokeSession.options();
	const revokeOtherSessionsMutation = revokeOtherSessions.options();
	const requestVerificationMutation = requestEmailVerification.options();
	const deleteAccountMutation = deleteAccount.options();

	function getInitials(name: string | null | undefined, email: string | null | undefined): string {
		if (name) {
			return name
				.split(' ')
				.map((n) => n[0])
				.join('')
				.toUpperCase()
				.slice(0, 2);
		}
		if (email) {
			return email[0].toUpperCase();
		}
		return '?';
	}

	function calculatePasswordStrength(password: string): { score: number; label: string; color: string } {
		if (!password) return { score: 0, label: '', color: 'bg-muted' };

		let score = 0;
		if (password.length >= 8) score += 25;
		if (password.length >= 12) score += 25;
		if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 25;
		if (/[0-9]/.test(password)) score += 15;
		if (/[^a-zA-Z0-9]/.test(password)) score += 10;

		if (score < 50) return { score, label: 'Weak', color: 'bg-destructive' };
		if (score < 75) return { score, label: 'Fair', color: 'bg-yellow-500' };
		return { score, label: 'Strong', color: 'bg-green-500' };
	}

	function parseUserAgent(userAgent: string | null): { device: string; browser: string } {
		if (!userAgent) return { device: 'Unknown', browser: 'Unknown' };

		let device = 'Desktop';
		let browser = 'Unknown';

		// Detect device
		if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
			device = /iPhone|iPad/.test(userAgent) ? 'iOS' : 'Android';
		} else if (/Macintosh/.test(userAgent)) {
			device = 'Mac';
		} else if (/Windows/.test(userAgent)) {
			device = 'Windows';
		} else if (/Linux/.test(userAgent)) {
			device = 'Linux';
		}

		// Detect browser
		if (/Firefox/.test(userAgent)) {
			browser = 'Firefox';
		} else if (/Edg/.test(userAgent)) {
			browser = 'Edge';
		} else if (/Chrome/.test(userAgent)) {
			browser = 'Chrome';
		} else if (/Safari/.test(userAgent)) {
			browser = 'Safari';
		}

		return { device, browser };
	}

	function getDeviceIcon(userAgent: string | null) {
		if (!userAgent) return Monitor;
		if (/iPhone|iPad/.test(userAgent)) return Smartphone;
		if (/Mobile|Android/.test(userAgent)) return Smartphone;
		return Laptop;
	}

	function formatDate(date: Date | string): string {
		const d = new Date(date);
		return d.toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	async function handleSaveProfile() {
		await updateProfileMutation.mutateAsync({
			displayName: displayName.trim() || undefined,
			image: imageUrl.trim() || undefined
		});
		isEditingProfile = false;
	}

	async function handleChangePassword() {
		if (newPassword !== confirmPassword) {
			return; // Show error
		}
		await changePasswordMutation.mutateAsync({
			currentPassword,
			newPassword
		});
		// Clear form on success
		currentPassword = '';
		newPassword = '';
		confirmPassword = '';
	}

	async function handleRevokeSession(sessionId: string) {
		await revokeSessionMutation.mutateAsync({ sessionId });
	}

	async function handleRevokeOtherSessions() {
		await revokeOtherSessionsMutation.mutateAsync();
	}

	async function handleRequestVerification() {
		await requestVerificationMutation.mutateAsync();
	}

	async function handleDeleteAccount() {
		await deleteAccountMutation.mutateAsync({ password: deletePassword });
		deleteDialogOpen = false;
		await signOut();
		goto('/login');
	}

	const passwordsMatch = $derived(newPassword === confirmPassword);
	const canChangePassword = $derived(
		currentPassword.length > 0 &&
			newPassword.length >= 8 &&
			passwordsMatch &&
			!changePasswordMutation.isPending
	);
</script>

<svelte:head>
	<title>Profile - Settings</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h2 class="text-xl font-semibold">Profile</h2>
		<p class="text-muted-foreground text-sm">Manage your account settings and security</p>
	</div>

	<!-- Profile Info -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Profile Information</Card.Title>
			<Card.Description>Update your profile details and avatar</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="flex items-start gap-6">
				<Avatar.Root class="h-20 w-20">
					{#if user?.image}
						<Avatar.Image src={user.image} alt={user?.name ?? 'User'} />
					{/if}
					<Avatar.Fallback class="text-2xl">
						{getInitials(user?.name, user?.email)}
					</Avatar.Fallback>
				</Avatar.Root>

				<div class="flex-1 space-y-4">
					{#if isEditingProfile}
						<div class="space-y-3">
							<div class="space-y-1.5">
								<Label for="displayName">Display Name</Label>
								<Input id="displayName" bind:value={displayName} placeholder="Your name" />
							</div>
							<div class="space-y-1.5">
								<Label for="imageUrl">Avatar URL</Label>
								<Input id="imageUrl" bind:value={imageUrl} placeholder="https://..." />
							</div>
							<div class="flex gap-2">
								<Button onclick={handleSaveProfile} disabled={updateProfileMutation.isPending}>
									{updateProfileMutation.isPending ? 'Saving...' : 'Save'}
								</Button>
								<Button variant="outline" onclick={() => (isEditingProfile = false)}>Cancel</Button>
							</div>
						</div>
					{:else}
						<div class="space-y-2">
							<div>
								<p class="font-medium">{user?.name ?? 'No name set'}</p>
								<div class="flex items-center gap-2">
									<p class="text-muted-foreground text-sm">{user?.email}</p>
									{#if user?.emailVerified}
										<Badge variant="secondary" class="text-xs">
											<BadgeCheck class="mr-1 h-3 w-3" />
											Verified
										</Badge>
									{:else}
										<Badge variant="outline" class="text-xs">Unverified</Badge>
									{/if}
								</div>
							</div>
							<div class="flex gap-2">
								<Button variant="outline" size="sm" onclick={() => (isEditingProfile = true)}>
									Edit Profile
								</Button>
								{#if !user?.emailVerified}
									<Button
										variant="outline"
										size="sm"
										onclick={handleRequestVerification}
										disabled={requestVerificationMutation.isPending}>
										{requestVerificationMutation.isPending ? 'Sending...' : 'Verify Email'}
									</Button>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Change Password -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Shield class="h-5 w-5" />
				Change Password
			</Card.Title>
			<Card.Description>Update your password to keep your account secure</Card.Description>
		</Card.Header>
		<Card.Content>
			<form
				class="space-y-4"
				onsubmit={(e) => {
					e.preventDefault();
					handleChangePassword();
				}}>
				<div class="space-y-1.5">
					<Label for="currentPassword">Current Password</Label>
					<Input id="currentPassword" type="password" bind:value={currentPassword} />
				</div>
				<div class="space-y-1.5">
					<Label for="newPassword">New Password</Label>
					<Input id="newPassword" type="password" bind:value={newPassword} />
					{#if newPassword}
						<div class="mt-2 space-y-1">
							<div class="flex items-center justify-between text-xs">
								<span class="text-muted-foreground">Password strength</span>
								<span class={passwordStrength.score >= 75 ? 'text-green-500' : passwordStrength.score >= 50 ? 'text-yellow-500' : 'text-destructive'}>
									{passwordStrength.label}
								</span>
							</div>
							<Progress value={passwordStrength.score} class="h-1" />
						</div>
					{/if}
				</div>
				<div class="space-y-1.5">
					<Label for="confirmPassword">Confirm New Password</Label>
					<Input id="confirmPassword" type="password" bind:value={confirmPassword} />
					{#if confirmPassword && !passwordsMatch}
						<p class="text-destructive text-sm">Passwords do not match</p>
					{/if}
				</div>
				<Button type="submit" disabled={!canChangePassword}>
					{changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
				</Button>
			</form>
		</Card.Content>
	</Card.Root>

	<!-- Active Sessions -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center justify-between">
				<div>
					<Card.Title>Active Sessions</Card.Title>
					<Card.Description>Manage devices where you're logged in</Card.Description>
				</div>
				{#if sessionsQuery.data && sessionsQuery.data.length > 1}
					<Button
						variant="outline"
						size="sm"
						onclick={handleRevokeOtherSessions}
						disabled={revokeOtherSessionsMutation.isPending}>
						<LogOut class="mr-2 h-4 w-4" />
						{revokeOtherSessionsMutation.isPending ? 'Revoking...' : 'Log out other sessions'}
					</Button>
				{/if}
			</div>
		</Card.Header>
		<Card.Content>
			{#if sessionsQuery.isLoading}
				<p class="text-muted-foreground text-sm">Loading sessions...</p>
			{:else if sessionsQuery.data}
				<div class="space-y-3">
					{#each sessionsQuery.data as sessionItem (sessionItem.id)}
						{@const { device, browser } = parseUserAgent(sessionItem.userAgent)}
						{@const DeviceIcon = getDeviceIcon(sessionItem.userAgent)}
						<div
							class="flex items-center justify-between rounded-lg border p-3 {sessionItem.isCurrent ? 'border-primary bg-primary/5' : ''}">
							<div class="flex items-center gap-3">
								<div class="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
									<DeviceIcon class="h-5 w-5" />
								</div>
								<div>
									<div class="flex items-center gap-2">
										<p class="font-medium">{device} - {browser}</p>
										{#if sessionItem.isCurrent}
											<Badge variant="default" class="text-xs">Current</Badge>
										{/if}
									</div>
									<p class="text-muted-foreground text-sm">
										{sessionItem.ipAddress ?? 'Unknown IP'} &middot; {formatDate(sessionItem.createdAt)}
									</p>
								</div>
							</div>
							{#if !sessionItem.isCurrent}
								<Button
									variant="ghost"
									size="icon"
									onclick={() => handleRevokeSession(sessionItem.id)}
									disabled={revokeSessionMutation.isPending}>
									<X class="h-4 w-4" />
									<span class="sr-only">Revoke session</span>
								</Button>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-muted-foreground text-sm">No active sessions found</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Danger Zone -->
	<Card.Root class="border-destructive/50">
		<Card.Header>
			<Card.Title class="text-destructive flex items-center gap-2">
				<Trash2 class="h-5 w-5" />
				Danger Zone
			</Card.Title>
			<Card.Description>Irreversible actions that affect your account</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="flex items-center justify-between">
				<div>
					<p class="font-medium">Delete Account</p>
					<p class="text-muted-foreground text-sm">
						Permanently delete your account and all associated data
					</p>
				</div>
				<AlertDialog.Root bind:open={deleteDialogOpen}>
					<AlertDialog.Trigger>
						{#snippet child({ props })}
							<Button {...props} variant="destructive">Delete Account</Button>
						{/snippet}
					</AlertDialog.Trigger>
					<AlertDialog.Content>
						<AlertDialog.Header>
							<AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
							<AlertDialog.Description>
								This action cannot be undone. This will permanently delete your account and remove
								all your data from our servers.
							</AlertDialog.Description>
						</AlertDialog.Header>
						<div class="my-4 space-y-2">
							<Label for="deletePassword">Enter your password to confirm</Label>
							<Input id="deletePassword" type="password" bind:value={deletePassword} />
						</div>
						<AlertDialog.Footer>
							<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
							<Button
								variant="destructive"
								onclick={handleDeleteAccount}
								disabled={!deletePassword || deleteAccountMutation.isPending}>
								{deleteAccountMutation.isPending ? 'Deleting...' : 'Delete Account'}
							</Button>
						</AlertDialog.Footer>
					</AlertDialog.Content>
				</AlertDialog.Root>
			</div>
		</Card.Content>
	</Card.Root>
</div>
