export type Route =
	| { page: "setup" }
	| { page: "login" }
	| { page: "accounts" }
	| { page: "account-detail"; slug: string }
	| { page: "categories" }
	| { page: "transactions" };

export const routerState = $state({ current: { page: "accounts" } as Route });
