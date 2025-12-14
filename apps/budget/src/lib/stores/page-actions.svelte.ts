import { getContext, setContext, type Component } from 'svelte';

export interface PageAction {
	id: string;
	label: string;
	icon?: Component;
	href?: string;
	onclick?: () => void;
	variant?: 'default' | 'outline' | 'ghost';
	/** Primary actions (Add X) vs Secondary (Analytics, Management) */
	isPrimary?: boolean;
}

const PAGE_ACTIONS_KEY = Symbol('page-actions');

/**
 * State for managing page-specific actions that can be displayed in the header
 */
class PageActionsState {
	actions = $state<PageAction[]>([]);

	register(newActions: PageAction[]) {
		this.actions = newActions;
	}

	clear() {
		this.actions = [];
	}
}

/**
 * Sets up the page actions context in the layout component
 * Must be called from +layout.svelte
 */
export function setPageActionsContext(): PageActionsState {
	const state = new PageActionsState();
	setContext(PAGE_ACTIONS_KEY, state);
	return state;
}

/**
 * Gets the page actions context from a child component
 * Returns undefined if context is not set
 */
export function getPageActionsContext(): PageActionsState | undefined {
	return getContext<PageActionsState>(PAGE_ACTIONS_KEY);
}
