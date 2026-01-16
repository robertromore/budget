<script lang="ts">
	import Bell from "@lucide/svelte/icons/bell";
	import CheckCheck from "@lucide/svelte/icons/check-check";
	import Trash2 from "@lucide/svelte/icons/trash-2";
	import { getNotificationContext } from "$lib/stores/notifications.svelte";
	import { Button } from "$lib/components/ui/button";
	import * as Popover from "$lib/components/ui/popover";
	import { ScrollArea } from "$lib/components/ui/scroll-area";
	import NotificationItem from "./notification-item.svelte";

	const store = getNotificationContext();

	let isOpen = $state(false);

	function handleMarkAllAsRead() {
		store.markAllAsRead();
	}

	function handleClear() {
		store.clear();
	}

	function handleDismiss(id: string) {
		store.dismiss(id);
	}

	function handleMarkAsRead(id: string) {
		store.markAsRead(id);
	}
</script>

<Popover.Root bind:open={isOpen}>
	<Popover.Trigger>
		{#snippet child({ props })}
			<Button {...props} variant="ghost" size="icon" class="relative">
				<Bell class="h-5 w-5" />
				{#if store.unreadCount > 0}
					<span
						class="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground"
					>
						{store.unreadCount > 9 ? "9+" : store.unreadCount}
					</span>
				{/if}
			</Button>
		{/snippet}
	</Popover.Trigger>

	<Popover.Content class="w-80 p-0" align="end">
		<div class="flex items-center justify-between border-b p-3">
			<h4 class="font-semibold">Notifications</h4>
			<div class="flex gap-1">
				{#if store.notifications.length > 0}
					<Button variant="ghost" size="sm" onclick={handleMarkAllAsRead} class="h-7 px-2">
						<CheckCheck class="mr-1 h-4 w-4" />
						<span class="text-xs">Mark read</span>
					</Button>
					<Button variant="ghost" size="icon" onclick={handleClear} class="h-7 w-7">
						<Trash2 class="h-4 w-4" />
					</Button>
				{/if}
			</div>
		</div>

		<ScrollArea class="h-[300px]">
			{#if store.notifications.length === 0}
				<div class="flex h-[200px] flex-col items-center justify-center text-muted-foreground">
					<Bell class="mb-2 h-8 w-8 opacity-50" />
					<p class="text-sm">No notifications</p>
				</div>
			{:else}
				<div class="p-1">
					{#each store.notifications as notification (notification.id)}
						<NotificationItem
							{notification}
							onDismiss={handleDismiss}
							onMarkAsRead={handleMarkAsRead}
						/>
					{/each}
				</div>
			{/if}
		</ScrollArea>
	</Popover.Content>
</Popover.Root>
