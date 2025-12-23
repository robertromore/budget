<script lang="ts">
	import { cn } from "$lib/utils";

	/**
	 * Command definition for autocomplete display
	 */
	interface CommandDef {
		name: string;
		description: string;
		usage: string;
	}

	/**
	 * All available slash commands (client-side mirror of server registry)
	 */
	const COMMANDS: CommandDef[] = [
		{ name: "help", description: "List all available commands", usage: "/help [command]" },
		{ name: "balance", description: "Get account balance", usage: "/balance [account-name]" },
		{ name: "transactions", description: "Show recent transactions", usage: "/transactions [count]" },
		{ name: "search", description: "Search transactions", usage: "/search <query>" },
		{ name: "budget", description: "Check budget status", usage: "/budget [name]" },
		{ name: "spending", description: "Get payee spending summary", usage: "/spending <payee>" },
		{ name: "category", description: "Get category spending breakdown", usage: "/category [name]" },
		{ name: "categories", description: "List available categories", usage: "/categories [search]" },
		{ name: "savings", description: "Find savings opportunities", usage: "/savings [type]" },
		{ name: "recurring", description: "List recurring bills", usage: "/recurring [frequency]" },
		{ name: "forecast", description: "Predict future cash flow", usage: "/forecast [months]" },
		{ name: "anomalies", description: "Check for unusual transactions", usage: "/anomalies [days]" },
	];

	interface Props {
		inputValue: string;
		onSelect: (command: string) => void;
		selectedIndex?: number;
	}

	let { inputValue, onSelect, selectedIndex = 0 }: Props = $props();

	/**
	 * Get filtered commands based on input
	 */
	function getFilteredCommands(input: string): CommandDef[] {
		// Only show suggestions when input starts with /
		if (!input.startsWith("/")) return [];

		const query = input.slice(1).toLowerCase();

		// If just "/", show all commands
		if (!query) return COMMANDS;

		// Filter by name match
		return COMMANDS.filter(
			(cmd) => cmd.name.startsWith(query) || cmd.name.includes(query)
		).slice(0, 6);
	}

	let filteredCommands = $derived(getFilteredCommands(inputValue));
	let isVisible = $derived(filteredCommands.length > 0 && !inputValue.includes(" "));
</script>

{#if isVisible}
	<div
		class="bg-popover text-popover-foreground absolute bottom-full left-0 mb-2 w-full rounded-md border shadow-md"
	>
		<div class="p-1">
			<p class="text-muted-foreground px-2 py-1 text-xs font-medium">Commands</p>
			{#each filteredCommands as command, index (command.name)}
				<button
					type="button"
					class={cn(
						"flex w-full flex-col rounded-sm px-2 py-1.5 text-left transition-colors",
						index === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
					)}
					onclick={() => onSelect(`/${command.name} `)}
				>
					<div class="flex items-center gap-2">
						<span class="font-mono text-sm font-medium">/{command.name}</span>
						<span class="text-muted-foreground text-xs">{command.description}</span>
					</div>
					<span class="text-muted-foreground mt-0.5 font-mono text-xs">{command.usage}</span>
				</button>
			{/each}
		</div>
	</div>
{/if}
