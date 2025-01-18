import { createContext } from '$lib/trpc/context';
import { createCaller } from '$lib/trpc/router';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
  accounts: await createCaller(await createContext()).accountRoutes.all(),
  payees: await createCaller(await createContext()).payeeRoutes.all(),
  categories: await createCaller(await createContext()).categoriesRoutes.all()
});
