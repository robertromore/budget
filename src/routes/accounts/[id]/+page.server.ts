import { createContext } from "$lib/trpc/context";
import { createCaller } from "$lib/trpc/router";
import type { PageServerLoad } from "../$types";
import type { RouteParams } from "./$types";

type AccountPageRouteParams = RouteParams & {
  id: number
};

export const load = (async (event) => ({
	account: await createCaller(await createContext(event)).accountRoutes.load({ id: event.params.id }),
})) satisfies PageServerLoad;
