import { shouldPersistToLocalStorage } from '$lib/utils/local-storage.svelte';

export type HeaderActionsMode = 'off' | 'secondary' | 'all';
export type HeaderActionsDisplay = 'icon-only' | 'icon-text';
export type HeaderTabsMode = 'off' | 'on';
export type HeaderTabsDisplay = 'icon-only' | 'icon-text';

const STORAGE_KEY = 'header-actions-mode';
const DISPLAY_STORAGE_KEY = 'header-actions-display';
const TABS_STORAGE_KEY = 'header-tabs-mode';
const TABS_DISPLAY_STORAGE_KEY = 'header-tabs-display';

/**
 * Store for controlling which page actions appear in the header
 *
 * Modes:
 * - 'off': Keep all buttons on page (default)
 * - 'secondary': Move utility buttons to header (Group Management, Analytics, Patterns)
 * - 'all': Move all buttons including primary actions (Add Category, Add Payee)
 */
class HeaderActionsStore {
	private mode = $state<HeaderActionsMode>('off');
	private display = $state<HeaderActionsDisplay>('icon-text');
	private tabs = $state<HeaderTabsMode>('off');
	private tabsDisplay = $state<HeaderTabsDisplay>('icon-text');

	constructor() {
		if (shouldPersistToLocalStorage()) {
			const storedMode = localStorage.getItem(STORAGE_KEY);
			if (storedMode && ['off', 'secondary', 'all'].includes(storedMode)) {
				this.mode = storedMode as HeaderActionsMode;
			}

			const storedDisplay = localStorage.getItem(DISPLAY_STORAGE_KEY);
			if (storedDisplay && ['icon-only', 'icon-text'].includes(storedDisplay)) {
				this.display = storedDisplay as HeaderActionsDisplay;
			}

			const storedTabs = localStorage.getItem(TABS_STORAGE_KEY);
			if (storedTabs && ['off', 'on'].includes(storedTabs)) {
				this.tabs = storedTabs as HeaderTabsMode;
			}

			const storedTabsDisplay = localStorage.getItem(TABS_DISPLAY_STORAGE_KEY);
			if (storedTabsDisplay && ['icon-only', 'icon-text'].includes(storedTabsDisplay)) {
				this.tabsDisplay = storedTabsDisplay as HeaderTabsDisplay;
			}
		}
	}

	get value(): HeaderActionsMode {
		return this.mode;
	}

	get displayMode(): HeaderActionsDisplay {
		return this.display;
	}

	set(mode: HeaderActionsMode) {
		this.mode = mode;
		if (shouldPersistToLocalStorage()) {
			localStorage.setItem(STORAGE_KEY, mode);
		}
	}

	setDisplay(display: HeaderActionsDisplay) {
		this.display = display;
		if (shouldPersistToLocalStorage()) {
			localStorage.setItem(DISPLAY_STORAGE_KEY, display);
		}
	}

	get tabsMode(): HeaderTabsMode {
		return this.tabs;
	}

	setTabs(mode: HeaderTabsMode) {
		this.tabs = mode;
		if (shouldPersistToLocalStorage()) {
			localStorage.setItem(TABS_STORAGE_KEY, mode);
		}
	}

	get tabsDisplayMode(): HeaderTabsDisplay {
		return this.tabsDisplay;
	}

	setTabsDisplay(display: HeaderTabsDisplay) {
		this.tabsDisplay = display;
		if (shouldPersistToLocalStorage()) {
			localStorage.setItem(TABS_DISPLAY_STORAGE_KEY, display);
		}
	}
}

export const headerActionsMode = new HeaderActionsStore();
