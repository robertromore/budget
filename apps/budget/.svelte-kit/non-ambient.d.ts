
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/accounts" | "/accounts/[id]/(forms)" | "/accounts/[id]/(dialogs)" | "/accounts/[id]/(data)" | "/accounts/[id]/(components)/(facets)" | "/accounts/[id]/(components)/(charts)" | "/accounts/[id]/(components)/(cells)" | "/accounts/[id]/(components)/(analytics)" | "/accounts/[id]/(components)" | "/accounts/[id]" | "/accounts/[id]/api" | "/accounts/[id]/api/update-transaction" | "/categories" | "/payees" | "/schedules" | "/schedules/[id]" | "/test-tooltip" | "/views";
		RouteParams(): {
			"/accounts/[id]/(forms)": { id: string };
			"/accounts/[id]/(dialogs)": { id: string };
			"/accounts/[id]/(data)": { id: string };
			"/accounts/[id]/(components)/(facets)": { id: string };
			"/accounts/[id]/(components)/(charts)": { id: string };
			"/accounts/[id]/(components)/(cells)": { id: string };
			"/accounts/[id]/(components)/(analytics)": { id: string };
			"/accounts/[id]/(components)": { id: string };
			"/accounts/[id]": { id: string };
			"/accounts/[id]/api": { id: string };
			"/accounts/[id]/api/update-transaction": { id: string };
			"/schedules/[id]": { id: string }
		};
		LayoutParams(): {
			"/": { id?: string };
			"/accounts": { id?: string };
			"/accounts/[id]/(forms)": { id: string };
			"/accounts/[id]/(dialogs)": { id: string };
			"/accounts/[id]/(data)": { id: string };
			"/accounts/[id]/(components)/(facets)": { id: string };
			"/accounts/[id]/(components)/(charts)": { id: string };
			"/accounts/[id]/(components)/(cells)": { id: string };
			"/accounts/[id]/(components)/(analytics)": { id: string };
			"/accounts/[id]/(components)": { id: string };
			"/accounts/[id]": { id: string };
			"/accounts/[id]/api": { id: string };
			"/accounts/[id]/api/update-transaction": { id: string };
			"/categories": Record<string, never>;
			"/payees": Record<string, never>;
			"/schedules": { id?: string };
			"/schedules/[id]": { id: string };
			"/test-tooltip": Record<string, never>;
			"/views": Record<string, never>
		};
		Pathname(): "/" | "/accounts" | "/accounts/" | `/accounts/${string}` & {} | `/accounts/${string}/` & {} | `/accounts/${string}/api` & {} | `/accounts/${string}/api/` & {} | `/accounts/${string}/api/update-transaction` & {} | `/accounts/${string}/api/update-transaction/` & {} | "/categories" | "/categories/" | "/payees" | "/payees/" | "/schedules" | "/schedules/" | `/schedules/${string}` & {} | `/schedules/${string}/` & {} | "/test-tooltip" | "/test-tooltip/" | "/views" | "/views/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/favicon.png" | string & {};
	}
}