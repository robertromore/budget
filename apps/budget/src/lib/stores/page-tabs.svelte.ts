import { getContext, setContext, type Component } from 'svelte';

export interface PageTab {
	id: string;
	label: string;
	icon?: Component;
	/** Only show this tab conditionally (e.g., HSA tabs for HSA accounts) */
	condition?: boolean;
}

export interface PageTabsConfig {
	tabs: PageTab[];
	activeTab: string;
	onTabChange: (value: string) => void;
}

const PAGE_TABS_KEY = Symbol('page-tabs');

/**
 * State for managing page-specific tabs that can be displayed in the header
 */
class PageTabsState {
	config = $state<PageTabsConfig | null>(null);

	register(newConfig: PageTabsConfig) {
		this.config = newConfig;
	}

	clear() {
		this.config = null;
	}
}

/**
 * Sets up the page tabs context in the layout component
 * Must be called from +layout.svelte
 */
export function setPageTabsContext(): PageTabsState {
	const state = new PageTabsState();
	setContext(PAGE_TABS_KEY, state);
	return state;
}

/**
 * Gets the page tabs context from a child component
 * Returns undefined if context is not set
 */
export function getPageTabsContext(): PageTabsState | undefined {
	return getContext<PageTabsState>(PAGE_TABS_KEY);
}
