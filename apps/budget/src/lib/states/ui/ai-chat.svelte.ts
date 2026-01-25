/**
 * AI Chat State Management
 *
 * Manages the global AI chat panel state including:
 * - Chat open/close state
 * - Message history
 * - Streaming state
 * - Page context for contextual AI responses
 */

import { browser } from "$app/environment";
import { shouldPersistToLocalStorage } from "$lib/utils/local-storage.svelte";

// =============================================================================
// Types
// =============================================================================

export type ChatStatus = "idle" | "submitted" | "streaming" | "error";

export interface ChatContext {
	/** Current page/route the user is on */
	page: string;
	/** Selected entity type (account, payee, transaction, etc.) */
	entityType?: "account" | "payee" | "transaction" | "category" | "budget";
	/** Selected entity ID */
	entityId?: number;
	/** Additional context data (varies by page) */
	data?: Record<string, unknown>;
}

/**
 * Chat message interface for the AI assistant.
 * Simple message format with content string (not using AI SDK's parts-based UIMessage).
 */
export interface ChatMessage {
	/** Unique message ID */
	id: string;
	/** Message role */
	role: "user" | "assistant" | "system";
	/** Message content */
	content: string;
	/** Timestamp when message was created */
	timestamp: Date;
	/** Optional reasoning/thinking content */
	reasoning?: string;
	/** Whether reasoning is still streaming */
	reasoningStreaming?: boolean;
	/** Summary of tools used (for tooltip display) */
	toolResultsSummary?: string[];
}

// =============================================================================
// Chat State Class
// =============================================================================

class AIChatState {
	// Panel state
	#isOpen = $state(false);

	// Pending input (pre-filled when opening with a prompt)
	#pendingInput = $state<string | null>(null);

	// Messages
	#messages = $state<ChatMessage[]>([]);

	// Status
	#status = $state<ChatStatus>("idle");
	#error = $state<string | null>(null);

	// Context
	#context = $state<ChatContext | null>(null);

	// Streaming
	#abortController = $state<AbortController | null>(null);

	// Conversation tracking
	#currentConversationId = $state<number | null>(null);

	// Arrow key navigation for sent messages
	#messageHistoryIndex = $state(-1);
	#sentMessages = $state<string[]>([]);

	// ==========================================================================
	// Getters
	// ==========================================================================

	get isOpen() {
		return this.#isOpen;
	}

	get messages() {
		return this.#messages;
	}

	get status() {
		return this.#status;
	}

	get isStreaming() {
		return this.#status === "streaming";
	}

	get isSubmitting() {
		return this.#status === "submitted";
	}

	get isLoading() {
		return this.#status === "submitted" || this.#status === "streaming";
	}

	get error() {
		return this.#error;
	}

	get context() {
		return this.#context;
	}

	get hasMessages() {
		return this.#messages.length > 0;
	}

	get lastMessage() {
		return this.#messages[this.#messages.length - 1] ?? null;
	}

	get pendingInput() {
		return this.#pendingInput;
	}

	get currentConversationId() {
		return this.#currentConversationId;
	}

	get messageHistoryIndex() {
		return this.#messageHistoryIndex;
	}

	get sentMessages() {
		return this.#sentMessages;
	}

	// ==========================================================================
	// Panel Actions
	// ==========================================================================

	open() {
		this.#isOpen = true;
	}

	close() {
		this.#isOpen = false;
	}

	toggle() {
		this.#isOpen = !this.#isOpen;
	}

	/**
	 * Open the chat panel with a pre-filled prompt
	 * The user can review and edit the prompt before sending
	 */
	openWithPrompt(prompt: string, context?: ChatContext) {
		this.#pendingInput = prompt;
		if (context) {
			this.#context = context;
		}
		this.#isOpen = true;
	}

	/**
	 * Consume the pending input (called by chat panel on mount/open)
	 * Returns the pending input and clears it
	 */
	consumePendingInput(): string | null {
		const input = this.#pendingInput;
		this.#pendingInput = null;
		return input;
	}

	// ==========================================================================
	// Context Actions
	// ==========================================================================

	/**
	 * Set the current page context for AI responses
	 */
	setContext(ctx: ChatContext) {
		this.#context = ctx;
	}

	/**
	 * Update context with additional data
	 */
	updateContext(data: Partial<ChatContext>) {
		if (this.#context) {
			this.#context = { ...this.#context, ...data };
		} else {
			this.#context = {
				page: data.page ?? "unknown",
				...data,
			};
		}
	}

	/**
	 * Clear context (e.g., on navigation)
	 */
	clearContext() {
		this.#context = null;
	}

	// ==========================================================================
	// Message Actions
	// ==========================================================================

	/**
	 * Add a user message
	 */
	addUserMessage(content: string): ChatMessage {
		const message: ChatMessage = {
			id: crypto.randomUUID(),
			role: "user",
			content,
			timestamp: new Date(),
		};
		this.#messages = [...this.#messages, message];
		return message;
	}

	/**
	 * Add an assistant message (initially empty for streaming)
	 */
	addAssistantMessage(content: string = ""): ChatMessage {
		const message: ChatMessage = {
			id: crypto.randomUUID(),
			role: "assistant",
			content,
			timestamp: new Date(),
		};
		this.#messages = [...this.#messages, message];
		return message;
	}

	/**
	 * Update the last assistant message (for streaming)
	 */
	updateLastMessage(content: string, reasoning?: string, toolResultsSummary?: string[]) {
		const lastIndex = this.#messages.length - 1;
		if (lastIndex >= 0 && this.#messages[lastIndex].role === "assistant") {
			this.#messages = this.#messages.map((msg, i) =>
				i === lastIndex
					? {
							...msg,
							content,
							reasoning: reasoning ?? msg.reasoning,
							reasoningStreaming: reasoning !== undefined,
							toolResultsSummary: toolResultsSummary ?? msg.toolResultsSummary,
						}
					: msg
			);
		}
	}

	/**
	 * Finalize the last message after streaming completes
	 */
	finalizeLastMessage() {
		const lastIndex = this.#messages.length - 1;
		if (lastIndex >= 0 && this.#messages[lastIndex].role === "assistant") {
			this.#messages = this.#messages.map((msg, i) =>
				i === lastIndex ? { ...msg, reasoningStreaming: false } : msg
			);
		}
	}

	/**
	 * Remove a message by ID
	 */
	removeMessage(id: string) {
		this.#messages = this.#messages.filter((msg) => msg.id !== id);
	}

	/**
	 * Clear all messages
	 */
	clearMessages() {
		this.#messages = [];
		this.#error = null;
	}

	// ==========================================================================
	// Status Actions
	// ==========================================================================

	setStatus(status: ChatStatus) {
		this.#status = status;
		if (status !== "error") {
			this.#error = null;
		}
	}

	setError(error: string) {
		this.#status = "error";
		this.#error = error;
	}

	// ==========================================================================
	// Streaming Control
	// ==========================================================================

	/**
	 * Create a new abort controller for streaming
	 */
	createAbortController(): AbortController {
		// Cancel any existing request
		this.cancelStream();

		this.#abortController = new AbortController();
		return this.#abortController;
	}

	/**
	 * Cancel the current streaming request
	 */
	cancelStream() {
		if (this.#abortController) {
			this.#abortController.abort();
			this.#abortController = null;
		}
		this.#status = "idle";
	}

	// ==========================================================================
	// High-Level Chat Actions
	// ==========================================================================

	/**
	 * Send a message and handle the response
	 * This is the main entry point for sending messages
	 */
	async sendMessage(
		content: string,
		options?: {
			onStream?: (chunk: string) => void;
			onReasoning?: (reasoning: string) => void;
			onComplete?: (fullResponse: string) => void;
			onError?: (error: Error) => void;
		}
	): Promise<void> {
		if (!browser) return;
		if (!content.trim()) return;

		// Add user message
		this.addUserMessage(content);

		// Set status to submitted
		this.setStatus("submitted");

		// Create abort controller
		const abortController = this.createAbortController();

		try {
			// Add placeholder assistant message
			this.addAssistantMessage();

			// Set status to streaming
			this.setStatus("streaming");

			// The actual API call will be handled by the component using trpc
			// This state class just manages the UI state
			// Components will call updateLastMessage() as chunks arrive

			// Note: The actual streaming implementation will be in the chat panel component
			// which calls the tRPC endpoint and updates this state
		} catch (error) {
			if (error instanceof Error && error.name === "AbortError") {
				// Request was cancelled, don't show error
				return;
			}

			const errorMessage = error instanceof Error ? error.message : "Failed to send message";
			this.setError(errorMessage);
			options?.onError?.(error instanceof Error ? error : new Error(errorMessage));
		}
	}

	/**
	 * Retry the last failed message
	 */
	async retryLastMessage(): Promise<void> {
		// Find the last user message
		const lastUserMessage = [...this.#messages].reverse().find((msg) => msg.role === "user");

		if (!lastUserMessage) return;

		// Remove the failed assistant message if present
		const lastMessage = this.lastMessage;
		if (lastMessage?.role === "assistant") {
			this.removeMessage(lastMessage.id);
		}

		// Resend the message
		await this.sendMessage(lastUserMessage.content);
	}

	// ==========================================================================
	// Keyboard Handler
	// ==========================================================================

	/**
	 * Handle keyboard shortcuts
	 * Attach to svelte:window onkeydown
	 */
	handleKeydown = (e: KeyboardEvent) => {
		// Toggle chat panel with Ctrl/Cmd + Shift + K
		if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "k") {
			e.preventDefault();
			this.toggle();
			return;
		}

		// Close chat with Escape when open
		if (e.key === "Escape" && this.#isOpen) {
			e.preventDefault();
			this.close();
			return;
		}
	};

	// ==========================================================================
	// Conversation Management
	// ==========================================================================

	/**
	 * Set the current conversation ID
	 */
	setConversationId(id: number | null) {
		this.#currentConversationId = id;
		this.#saveConversationId();
	}

	/**
	 * Get the pending conversation ID to load (from localStorage)
	 * Returns null if no conversation needs to be loaded
	 */
	get pendingConversationId(): number | null {
		// Only return pending ID if we don't already have messages loaded
		if (this.#messages.length > 0) return null;
		return this.#currentConversationId;
	}

	/**
	 * Load a conversation and its messages
	 * Merges user messages into sent history (deduplicates with localStorage history)
	 */
	loadConversation(id: number, messages: ChatMessage[]) {
		this.#currentConversationId = id;
		this.#messages = messages;

		// Merge user messages from this conversation into sent history
		// Keep existing localStorage history, add new messages from DB, deduplicate
		const userMessagesFromConversation = messages
			.filter((m) => m.role === "user")
			.map((m) => m.content);

		// Track what we already have to avoid duplicates
		const seen = new Set(this.#sentMessages);

		// Add any new messages from the conversation that aren't already in history
		for (const msg of userMessagesFromConversation) {
			if (!seen.has(msg)) {
				this.#sentMessages = [...this.#sentMessages, msg];
				seen.add(msg);
			}
		}

		this.#saveSentHistory(); // Persist the merged history
		this.#saveConversationId();
		this.#messageHistoryIndex = -1;
		this.#status = "idle";
		this.#error = null;
	}

	/**
	 * Start a new conversation (clear current and reset)
	 */
	startNewConversation() {
		this.#currentConversationId = null;
		this.#messages = [];
		// Don't clear sentMessages - keep them for arrow navigation across conversations
		this.#messageHistoryIndex = -1;
		this.#status = "idle";
		this.#error = null;
		this.#saveConversationId(); // Clear from localStorage
	}

	// ==========================================================================
	// Message History Navigation (Arrow Keys)
	// ==========================================================================

	/**
	 * Add a message to the sent history (for arrow key navigation)
	 * Deduplicates by moving existing messages to the end
	 */
	addToSentHistory(message: string) {
		// Remove any existing occurrence (move to end instead of duplicating)
		const filtered = this.#sentMessages.filter((m) => m !== message);
		this.#sentMessages = [...filtered, message];
		this.#messageHistoryIndex = -1; // Reset index
		this.#saveSentHistory();
	}

	/**
	 * Navigate to the previous message in history (arrow up)
	 * Returns the message content or null if at the start
	 */
	navigateHistoryUp(): string | null {
		if (this.#sentMessages.length === 0) return null;

		const newIndex = Math.min(this.#messageHistoryIndex + 1, this.#sentMessages.length - 1);
		this.#messageHistoryIndex = newIndex;

		// Get message from the end (most recent first)
		return this.#sentMessages[this.#sentMessages.length - 1 - newIndex] ?? null;
	}

	/**
	 * Navigate to the next message in history (arrow down)
	 * Returns the message content or empty string if at the end
	 */
	navigateHistoryDown(): string | null {
		if (this.#messageHistoryIndex <= 0) {
			this.#messageHistoryIndex = -1;
			return ""; // Clear input - back to current empty state
		}

		this.#messageHistoryIndex--;
		return this.#sentMessages[this.#sentMessages.length - 1 - this.#messageHistoryIndex] ?? null;
	}

	/**
	 * Reset history navigation (when user types manually)
	 */
	resetHistoryNavigation() {
		this.#messageHistoryIndex = -1;
	}

	// ==========================================================================
	// Persistence (optional)
	// ==========================================================================

	private readonly SENT_HISTORY_KEY = "ai-chat-sent-history";
	private readonly CONVERSATION_ID_KEY = "ai-chat-conversation-id";
	private readonly MAX_SENT_HISTORY = 100; // Keep last 100 messages

	/**
	 * Save sent message history to localStorage
	 */
	#saveSentHistory() {
		if (!shouldPersistToLocalStorage()) return;

		try {
			// Keep only the last MAX_SENT_HISTORY messages
			const toSave = this.#sentMessages.slice(-this.MAX_SENT_HISTORY);
			localStorage.setItem(this.SENT_HISTORY_KEY, JSON.stringify(toSave));
		} catch {
			// Ignore storage errors
		}
	}

	/**
	 * Save current conversation ID to localStorage
	 */
	#saveConversationId() {
		if (!shouldPersistToLocalStorage()) return;

		try {
			if (this.#currentConversationId) {
				localStorage.setItem(this.CONVERSATION_ID_KEY, String(this.#currentConversationId));
			} else {
				localStorage.removeItem(this.CONVERSATION_ID_KEY);
			}
		} catch {
			// Ignore storage errors
		}
	}

	/**
	 * Load conversation ID from localStorage
	 */
	#loadConversationId() {
		if (!shouldPersistToLocalStorage()) return;

		try {
			const stored = localStorage.getItem(this.CONVERSATION_ID_KEY);
			if (stored) {
				const id = parseInt(stored, 10);
				if (!isNaN(id)) {
					this.#currentConversationId = id;
				}
			}
		} catch {
			// Ignore storage errors
		}
	}

	/**
	 * Load sent message history from localStorage
	 */
	#loadSentHistory() {
		if (!shouldPersistToLocalStorage()) return;

		try {
			const stored = localStorage.getItem(this.SENT_HISTORY_KEY);
			if (stored) {
				const messages = JSON.parse(stored);
				if (Array.isArray(messages)) {
					this.#sentMessages = messages;
				}
			}
		} catch {
			// Ignore storage errors
		}
	}

	/**
	 * Initialize the chat state (call on mount)
	 * Returns the conversation ID to load, or null if none
	 */
	initialize(): number | null {
		this.#loadSentHistory();
		this.#loadConversationId();
		return this.pendingConversationId;
	}

	/**
	 * Save messages to localStorage
	 */
	saveToStorage() {
		if (!shouldPersistToLocalStorage()) return;

		try {
			const data = {
				messages: this.#messages,
				context: this.#context,
			};
			localStorage.setItem("ai-chat-history", JSON.stringify(data));
		} catch {
			// Ignore storage errors
		}
	}

	/**
	 * Load messages from localStorage
	 */
	loadFromStorage() {
		if (!shouldPersistToLocalStorage()) return;

		try {
			const stored = localStorage.getItem("ai-chat-history");
			if (stored) {
				const data = JSON.parse(stored);
				if (data.messages && Array.isArray(data.messages)) {
					this.#messages = data.messages.map((msg: ChatMessage) => ({
						...msg,
						timestamp: new Date(msg.timestamp),
					}));
				}
				if (data.context) {
					this.#context = data.context;
				}
			}
		} catch {
			// Ignore storage errors
		}
	}

	/**
	 * Clear storage
	 */
	clearStorage() {
		if (!browser) return;
		localStorage.removeItem("ai-chat-history");
	}
}

// =============================================================================
// Singleton Export
// =============================================================================

export const aiChat = new AIChatState();
