<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { ScrollArea } from "$lib/components/ui/scroll-area";
	import { MessageSquare, RotateCcw, Trash2 } from "@lucide/svelte/icons";

	interface Conversation {
		id: number;
		title: string | null;
		messageCount: number;
		updatedAt: string;
	}

	interface Props {
		conversations: Conversation[];
		currentId: number | null;
		onSelect: (id: number) => void;
		onDelete: (id: number) => void;
		onResend?: (id: number) => void;
		isLoading?: boolean;
	}

	let { conversations, currentId, onSelect, onDelete, onResend, isLoading = false }: Props =
		$props();

	/**
	 * Format relative time (e.g., "2 hours ago", "3 days ago")
	 */
	function formatRelativeTime(date: Date): string {
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffSec = Math.floor(diffMs / 1000);
		const diffMin = Math.floor(diffSec / 60);
		const diffHour = Math.floor(diffMin / 60);
		const diffDay = Math.floor(diffHour / 24);

		if (diffSec < 60) return "just now";
		if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
		if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? "s" : ""} ago`;
		if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? "s" : ""} ago`;
		if (diffDay < 30) {
			const weeks = Math.floor(diffDay / 7);
			return `${weeks} week${weeks !== 1 ? "s" : ""} ago`;
		}
		const months = Math.floor(diffDay / 30);
		return `${months} month${months !== 1 ? "s" : ""} ago`;
	}
</script>

<div class="flex flex-col gap-2">
	{#if isLoading}
		<div class="flex items-center justify-center py-8">
			<div class="text-muted-foreground text-sm">Loading conversations...</div>
		</div>
	{:else if conversations.length === 0}
		<div class="flex flex-col items-center justify-center gap-2 py-8">
			<MessageSquare class="text-muted-foreground size-8" />
			<p class="text-muted-foreground text-sm">No conversations yet</p>
		</div>
	{:else}
		<ScrollArea class="h-[250px]">
			<div class="flex flex-col gap-1 pr-3">
				{#each conversations as conv (conv.id)}
					<button
						class="hover:bg-muted w-full rounded-md p-2 text-left transition-colors {currentId ===
						conv.id
							? 'bg-muted'
							: ''}"
						onclick={() => onSelect(conv.id)}
					>
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-medium">
									{conv.title || "Untitled conversation"}
								</p>
								<p class="text-muted-foreground text-xs">
									{conv.messageCount} message{conv.messageCount !== 1 ? "s" : ""}
									&middot;
									{formatRelativeTime(new Date(conv.updatedAt))}
								</p>
							</div>
							<div class="flex shrink-0 gap-0.5">
								{#if onResend}
									<Button
										variant="ghost"
										size="icon"
										class="text-muted-foreground hover:text-primary size-6"
										title="Resend first message"
										onclick={(e: MouseEvent) => {
											e.stopPropagation();
											onResend(conv.id);
										}}
									>
										<RotateCcw class="size-3" />
									</Button>
								{/if}
								<Button
									variant="ghost"
									size="icon"
									class="text-muted-foreground hover:text-destructive size-6"
									onclick={(e: MouseEvent) => {
										e.stopPropagation();
										onDelete(conv.id);
									}}
								>
									<Trash2 class="size-3" />
								</Button>
							</div>
						</div>
					</button>
				{/each}
			</div>
		</ScrollArea>
	{/if}
</div>
