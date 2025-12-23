<script lang="ts">
	import { onMount } from "svelte";
	import { ResponsiveSheet } from "$lib/components/ui/responsive-sheet";
	import { Button } from "$lib/components/ui/button";
	import { Popover, PopoverContent, PopoverTrigger } from "$lib/components/ui/popover";
	import { aiChat, type ChatMessage } from "$lib/states/ui/ai-chat.svelte";
	import {
		Conversation,
		ConversationContent,
		ConversationEmptyState,
	} from "$lib/components/ai-elements/conversation";
	import { Message, MessageContent } from "$lib/components/ai-elements/message";
	import {
		PromptInput,
		PromptInputBody,
		PromptInputTextarea,
		PromptInputToolbar,
		PromptInputSubmit,
	} from "$lib/components/ai-elements/prompt-input";
	import { Loader } from "$lib/components/ai-elements/loader";
	import { Reasoning, ReasoningContent, ReasoningTrigger } from "$lib/components/ai-elements/reasoning";
	import RichResponse from "./rich-response.svelte";
	import ConversationList from "./conversation-list.svelte";
	import CommandAutocomplete from "./command-autocomplete.svelte";
	import { trpc } from "$lib/trpc/client";
	import { MessageSquare, Trash2, Bot, User, Sparkles, History, X, Info } from "@lucide/svelte/icons";
	import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "$lib/components/ui/tooltip";
	import type { PromptInputMessage } from "$lib/components/ai-elements/prompt-input/attachments-context.svelte";

	// Initialize chat state on mount (loads sent history and conversation from localStorage/database)
	onMount(async () => {
		const pendingConversationId = aiChat.initialize();

		// If there's a pending conversation ID, load the conversation from the database
		if (pendingConversationId) {
			try {
				const result = await trpc().aiRoutes.getConversation.query({ id: pendingConversationId });
				const messages: ChatMessage[] = result.messages.map((m) => ({
					id: crypto.randomUUID(),
					role: m.role as "user" | "assistant" | "system",
					content: m.content,
					timestamp: new Date(m.createdAt),
					reasoning: m.reasoning ?? undefined,
				}));
				aiChat.loadConversation(pendingConversationId, messages);
			} catch (error) {
				// Conversation may have been deleted, clear the stored ID
				console.warn("Failed to load saved conversation:", error);
				aiChat.startNewConversation();
			}
		}
	});

	// Local input state
	let inputValue = $state("");
	let conversationsOpen = $state(false);
	let autocompleteIndex = $state(0);

	// Command autocomplete visibility - show when typing "/" without a space
	let showAutocomplete = $derived(inputValue.startsWith("/") && !inputValue.includes(" "));

	// Conversation data
	interface ConversationItem {
		id: number;
		title: string | null;
		messageCount: number;
		updatedAt: string;
	}
	let conversationsList = $state<ConversationItem[]>([]);
	let conversationsLoading = $state(false);

	// Load conversations when popover opens
	async function loadConversations() {
		if (conversationsLoading) return;
		conversationsLoading = true;
		try {
			const result = await trpc().aiRoutes.listConversations.query({ limit: 20 });
			conversationsList = result.items;
		} catch (error) {
			console.error("Failed to load conversations:", error);
		} finally {
			conversationsLoading = false;
		}
	}

	// Handle conversation selection
	async function handleSelectConversation(id: number) {
		try {
			const result = await trpc().aiRoutes.getConversation.query({ id });
			const messages: ChatMessage[] = result.messages.map((m) => ({
				id: crypto.randomUUID(),
				role: m.role as "user" | "assistant" | "system",
				content: m.content,
				timestamp: new Date(m.createdAt),
				reasoning: m.reasoning ?? undefined,
			}));
			aiChat.loadConversation(id, messages);
			conversationsOpen = false;
		} catch (error) {
			console.error("Failed to load conversation:", error);
		}
	}

	// Handle delete conversation
	async function handleDeleteConversation(id: number) {
		try {
			await trpc().aiRoutes.deleteConversation.mutate({ id });
			conversationsList = conversationsList.filter((c) => c.id !== id);
			// If we deleted the current conversation, start fresh
			if (aiChat.currentConversationId === id) {
				aiChat.startNewConversation();
			}
		} catch (error) {
			console.error("Failed to delete conversation:", error);
		}
	}

	// Handle resend first message from a conversation
	async function handleResendConversation(id: number) {
		try {
			const result = await trpc().aiRoutes.getConversation.query({ id });
			// Find the first user message
			const firstUserMessage = result.messages.find((m) => m.role === "user");
			if (firstUserMessage) {
				// Start a new conversation and populate the input
				aiChat.startNewConversation();
				inputValue = firstUserMessage.content;
				conversationsOpen = false;
			}
		} catch (error) {
			console.error("Failed to get conversation for resend:", error);
		}
	}

	// Get count of filtered commands for bounds checking
	function getFilteredCommandCount(): number {
		if (!inputValue.startsWith("/")) return 0;
		const query = inputValue.slice(1).toLowerCase();
		const commands = [
			"help", "balance", "transactions", "search", "budget",
			"spending", "category", "categories", "savings", "recurring",
			"forecast", "anomalies"
		];
		if (!query) return commands.length;
		return commands.filter(cmd => cmd.startsWith(query) || cmd.includes(query)).length;
	}

	// Handle autocomplete selection
	function handleAutocompleteSelect(command: string) {
		inputValue = command;
		autocompleteIndex = 0;
	}

	// Handle arrow key navigation in input
	function handleInputKeydown(e: KeyboardEvent) {
		// Handle autocomplete navigation when visible
		if (showAutocomplete) {
			const commandCount = getFilteredCommandCount();

			if (e.key === "ArrowUp") {
				e.preventDefault();
				autocompleteIndex = autocompleteIndex > 0 ? autocompleteIndex - 1 : commandCount - 1;
				return;
			}

			if (e.key === "ArrowDown") {
				e.preventDefault();
				autocompleteIndex = autocompleteIndex < commandCount - 1 ? autocompleteIndex + 1 : 0;
				return;
			}

			if (e.key === "Tab" || (e.key === "Enter" && commandCount > 0)) {
				e.preventDefault();
				// Trigger selection via a custom event or direct command application
				const query = inputValue.slice(1).toLowerCase();
				const commands = [
					"help", "balance", "transactions", "search", "budget",
					"spending", "category", "categories", "savings", "recurring",
					"forecast", "anomalies"
				];
				const filtered = query
					? commands.filter(cmd => cmd.startsWith(query) || cmd.includes(query))
					: commands;
				const selected = filtered[autocompleteIndex];
				if (selected) {
					inputValue = `/${selected} `;
					autocompleteIndex = 0;
				}
				return;
			}

			if (e.key === "Escape") {
				e.preventDefault();
				inputValue = "";
				autocompleteIndex = 0;
				return;
			}
		}

		// Arrow up - navigate to previous message (when not in autocomplete)
		if (e.key === "ArrowUp" && !e.shiftKey) {
			const textarea = e.target as HTMLTextAreaElement;
			// Only navigate if cursor is at the start
			if (textarea.selectionStart === 0 && textarea.selectionEnd === 0) {
				const prevMessage = aiChat.navigateHistoryUp();
				if (prevMessage !== null) {
					e.preventDefault();
					inputValue = prevMessage;
				}
			}
		}

		// Arrow down - navigate to next message (when not in autocomplete)
		if (e.key === "ArrowDown" && !e.shiftKey) {
			const textarea = e.target as HTMLTextAreaElement;
			// Only navigate if cursor is at the end
			if (textarea.selectionStart === textarea.value.length) {
				const nextMessage = aiChat.navigateHistoryDown();
				if (nextMessage !== null) {
					e.preventDefault();
					inputValue = nextMessage;
				}
			}
		}
	}

	// Reset history navigation and autocomplete when user types
	function handleInputChange() {
		aiChat.resetHistoryNavigation();
		autocompleteIndex = 0;
	}

	// Handle message submission
	async function handleSubmit(message: PromptInputMessage) {
		const content = message.text?.trim();
		if (!content) return;

		// Clear input and add to sent history
		inputValue = "";
		aiChat.addToSentHistory(content);

		// Add user message
		aiChat.addUserMessage(content);
		aiChat.setStatus("submitted");

		// Check if it's a slash command
		if (content.startsWith("/")) {
			try {
				const result = await trpc().aiRoutes.executeCommand.mutate({ input: content });

				if (result.isCommand) {
					// Add assistant message with command result
					aiChat.addAssistantMessage();

					if ("error" in result && result.error) {
						aiChat.updateLastMessage(`**Error**: ${result.error}`);
					} else if ("result" in result && result.result) {
						aiChat.updateLastMessage(result.result);
					}

					aiChat.finalizeLastMessage();
					aiChat.setStatus("idle");
					return;
				}
				// If not a command (somehow), fall through to normal chat
			} catch (error) {
				console.error("Command error:", error);
				aiChat.addAssistantMessage();
				aiChat.updateLastMessage(
					`**Error**: ${error instanceof Error ? error.message : "Failed to execute command"}`
				);
				aiChat.finalizeLastMessage();
				aiChat.setStatus("idle");
				return;
			}
		}

		// Add placeholder assistant message for LLM response
		aiChat.addAssistantMessage();
		aiChat.setStatus("streaming");

		try {
			// Call the chat endpoint with conversation ID
			const response = await trpc().aiRoutes.chat.mutate({
				message: content,
				context: aiChat.context ?? undefined,
				history: aiChat.messages.slice(0, -1).map((m) => ({
					role: m.role,
					content: m.content,
				})),
				conversationId: aiChat.currentConversationId ?? undefined,
			});

			// Update conversation ID if this was a new conversation
			if (response.conversationId && !aiChat.currentConversationId) {
				aiChat.setConversationId(response.conversationId);
			}

			// Update the assistant message with the response
			aiChat.updateLastMessage(response.content, response.reasoning, response.toolResultsSummary);
			aiChat.finalizeLastMessage();
			aiChat.setStatus("idle");
		} catch (error) {
			console.error("Chat error:", error);
			aiChat.setError(error instanceof Error ? error.message : "Failed to get response");
			// Remove the placeholder assistant message
			if (aiChat.lastMessage?.role === "assistant" && !aiChat.lastMessage.content) {
				aiChat.removeMessage(aiChat.lastMessage.id);
			}
		}
	}

	// Clear chat history and start fresh
	function handleClear() {
		aiChat.startNewConversation();
	}

	// Handle suggestion click - pre-fill the input
	function handleSuggestionClick(suggestion: string) {
		inputValue = suggestion;
	}

	// Format timestamp
	function formatTime(date: Date): string {
		return new Intl.DateTimeFormat("en-US", {
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		}).format(date);
	}
</script>

<svelte:window onkeydown={aiChat.handleKeydown} />

<ResponsiveSheet
	bind:open={
		() => aiChat.isOpen,
		(v) => (v ? aiChat.open() : aiChat.close())
	}
	side="right"
	defaultWidth={480}
	minWidth={360}
	maxWidth={640}
	resizable={true}
	class="[&>button[data-dialog-close]]:hidden"
>
	{#snippet header()}
		<div class="flex w-full items-center justify-between">
			<div class="flex items-center gap-2">
				<div class="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
					<Sparkles class="size-4" />
				</div>
				<div>
					<h2 class="text-base font-semibold">Budget Assistant</h2>
					<p class="text-muted-foreground text-xs">
						{#if aiChat.context?.page}
							Viewing {aiChat.context.page}
						{:else}
							Ask me anything about your finances
						{/if}
					</p>
				</div>
			</div>
			<div class="flex items-center gap-1">
				<Popover bind:open={conversationsOpen}>
					<PopoverTrigger>
						<Button
							variant="ghost"
							size="icon"
							title="Conversation history"
							onclick={() => {
								if (!conversationsOpen) loadConversations();
							}}
						>
							<History class="size-4" />
						</Button>
					</PopoverTrigger>
					<PopoverContent class="w-80" align="end">
						<div class="mb-2">
							<h4 class="text-sm font-medium">Conversations</h4>
							<p class="text-muted-foreground text-xs">Your recent chat history</p>
						</div>
						<ConversationList
							conversations={conversationsList}
							currentId={aiChat.currentConversationId}
							onSelect={handleSelectConversation}
							onDelete={handleDeleteConversation}
							onResend={handleResendConversation}
							isLoading={conversationsLoading}
						/>
					</PopoverContent>
				</Popover>
				{#if aiChat.hasMessages}
					<Button variant="ghost" size="icon" onclick={handleClear} title="Clear current chat">
						<Trash2 class="size-4" />
					</Button>
				{/if}
				<Button variant="ghost" size="icon" onclick={() => aiChat.close()} title="Close">
					<X class="size-4" />
				</Button>
			</div>
		</div>
	{/snippet}

	{#snippet content()}
		<Conversation class="h-full">
			{#if aiChat.hasMessages}
				<ConversationContent>
					{#each aiChat.messages as message (message.id)}
						<Message from={message.role}>
							{#if message.role === "user"}
								<MessageContent variant="contained">
									<p class="whitespace-pre-wrap">{message.content}</p>
								</MessageContent>
								<div class="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full">
									<User class="size-4" />
								</div>
							{:else}
								<MessageContent variant="flat">
									{#if message.reasoning}
										<Reasoning isStreaming={message.reasoningStreaming}>
											<ReasoningTrigger />
											<ReasoningContent>
												<p class="whitespace-pre-wrap text-sm">{message.reasoning}</p>
											</ReasoningContent>
										</Reasoning>
									{/if}
									{#if message.content}
										<RichResponse
											content={message.content}
											onSuggestionClick={handleSuggestionClick}
										/>
									{:else if aiChat.isStreaming}
										<Loader size={16} />
									{/if}
								</MessageContent>
								<div class="flex shrink-0 items-start gap-1">
									{#if message.toolResultsSummary?.length}
										<TooltipProvider>
											<Tooltip>
												<TooltipTrigger>
													<Info class="text-muted-foreground mt-2 size-3.5 cursor-help" />
												</TooltipTrigger>
												<TooltipContent side="top" class="max-w-xs">
													<p class="text-xs font-medium">Actions taken:</p>
													<ul class="text-muted-foreground mt-1 list-inside list-disc text-xs">
														{#each message.toolResultsSummary as result}
															<li>{result}</li>
														{/each}
													</ul>
												</TooltipContent>
											</Tooltip>
										</TooltipProvider>
									{/if}
									<div class="bg-secondary flex size-8 items-center justify-center rounded-full">
										<Bot class="size-4" />
									</div>
								</div>
							{/if}
						</Message>
					{/each}
				</ConversationContent>
			{:else}
				<ConversationEmptyState
					title="How can I help?"
					description="Ask me about your spending, budgets, or financial goals"
				>
					{#snippet icon()}
						<MessageSquare class="text-muted-foreground size-12" />
					{/snippet}
				</ConversationEmptyState>
			{/if}
		</Conversation>
	{/snippet}

	{#snippet footer()}
		<div class="relative">
			<CommandAutocomplete
				{inputValue}
				onSelect={handleAutocompleteSelect}
				selectedIndex={autocompleteIndex}
			/>
			<PromptInput onSubmit={handleSubmit} class="shadow-none">
				<PromptInputBody>
					<PromptInputTextarea
						placeholder="Ask about your finances or type /help for commands..."
						bind:value={inputValue}
						onkeydown={handleInputKeydown}
						oninput={handleInputChange}
					/>
					<PromptInputToolbar class="justify-end px-2 pb-2">
						<PromptInputSubmit
							status={aiChat.status}
							disabled={aiChat.isLoading || !inputValue.trim()}
						/>
					</PromptInputToolbar>
				</PromptInputBody>
			</PromptInput>
		</div>
	{/snippet}
</ResponsiveSheet>
