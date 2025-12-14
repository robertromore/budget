import { browser } from "$app/environment";

const FONT_SIZE_KEY = "app-font-size";

export type FontSize = "small" | "normal" | "large";

const FONT_SIZES: Record<FontSize, string> = {
	small: "14px",
	normal: "16px",
	large: "18px",
};

const FONT_SIZE_ORDER: FontSize[] = ["small", "normal", "large"];

function createFontSizeStore() {
	let current = $state<FontSize>("normal");

	// Initialize from localStorage on client
	if (browser) {
		const stored = localStorage.getItem(FONT_SIZE_KEY) as FontSize | null;
		const initialSize =
			stored && FONT_SIZE_ORDER.includes(stored) ? stored : "normal";
		current = initialSize;
		applyFontSize(initialSize);
	}

	function applyFontSize(size: FontSize) {
		if (browser) {
			document.documentElement.style.setProperty("--app-font-size", FONT_SIZES[size]);
			document.documentElement.setAttribute("data-font-size", size);
		}
	}

	function set(size: FontSize) {
		current = size;
		if (browser) {
			localStorage.setItem(FONT_SIZE_KEY, size);
			applyFontSize(size);
		}
	}

	function cycle() {
		const currentIndex = FONT_SIZE_ORDER.indexOf(current);
		const nextIndex = (currentIndex + 1) % FONT_SIZE_ORDER.length;
		set(FONT_SIZE_ORDER[nextIndex]!);
	}

	return {
		get current() {
			return current;
		},
		get sizes() {
			return FONT_SIZES;
		},
		set,
		cycle,
	};
}

export const fontSize = createFontSizeStore();
