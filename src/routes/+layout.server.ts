import { createContext } from '$lib/trpc/context';
import { createCaller } from '$lib/trpc/router';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => ({
  accounts: await createCaller(await createContext()).accountRoutes.all(),
  payees: await createCaller(await createContext()).payeeRoutes.all(),
  categories: await createCaller(await createContext()).categoriesRoutes.all()
});
