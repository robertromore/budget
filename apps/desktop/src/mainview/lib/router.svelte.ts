/**
 * Simple state-based router for the desktop app.
 * No URL history — just tracks the current page and params.
 */

export type Route =
	| { page: "setup" }
	| { page: "login" }
	| { page: "accounts" }
	| { page: "account-detail"; slug: string }
	| { page: "categories" }
	| { page: "transactions" };

let currentRoute = $state<Route>({ page: "accounts" });

export function navigate(route: Route): void {
	currentRoute = route;
}

export function getCurrentRoute(): Route {
	return currentRoute;
}

export function setInitialRoute(route: Route): void {
	currentRoute = route;
}
