<script lang="ts">
	import type { Notification } from "$lib/stores/notifications.svelte";
	import { formatTimeAgo } from "$lib/utils/dates";
	import CheckCircle from "@lucide/svelte/icons/circle-check";
	import XCircle from "@lucide/svelte/icons/circle-x";
	import Info from "@lucide/svelte/icons/info";
	import AlertTriangle from "@lucide/svelte/icons/triangle-alert";
	import Loader2 from "@lucide/svelte/icons/loader";
	import X from "@lucide/svelte/icons/x";

	interface Props {
		notification: Notification;
		onDismiss: (id: string) => void;
		onMarkAsRead?: (id: string) => void;
	}

	let { notification, onDismiss, onMarkAsRead }: Props = $props();

	const icons = {
		success: CheckCircle,
		error: XCircle,
		info: Info,
		warning: AlertTriangle,
		loading: Loader2,
	};

	const iconColors = {
		success: "text-green-500",
		error: "text-red-500",
		info: "text-blue-500",
		warning: "text-yellow-500",
		loading: "text-muted-foreground",
	};

	function handleClick() {
		if (!notification.read && onMarkAsRead) {
			onMarkAsRead(notification.id);
		}
	}

	const Icon = $derived(icons[notification.type]);
	const iconColor = $derived(iconColors[notification.type]);
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="group flex w-full cursor-pointer items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted/50 {notification.read
		? 'opacity-60'
		: ''}"
	onclick={handleClick}
>
	<Icon
		class="mt-0.5 h-5 w-5 shrink-0 {iconColor} {notification.type === 'loading'
			? 'animate-spin'
			: ''}"
	/>

	<div class="min-w-0 flex-1">
		<p class="text-sm font-medium leading-tight">{notification.title}</p>
		{#if notification.description}
			<p class="mt-0.5 text-xs text-muted-foreground">{notification.description}</p>
		{/if}
		<p class="mt-1 text-xs text-muted-foreground">
			{formatTimeAgo(notification.timestamp)}
		</p>
	</div>

	<button
		type="button"
		class="rounded p-1 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
		onclick={(e) => {
			e.stopPropagation();
			onDismiss(notification.id);
		}}
	>
		<X class="h-4 w-4 text-muted-foreground" />
	</button>
</div>
