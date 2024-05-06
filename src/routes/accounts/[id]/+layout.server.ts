import { createContext } from '$lib/trpc/context';
import { createCaller } from '$lib/trpc/router';
import type { PageServerLoad } from '../$types';

export const load: PageServerLoad = async ({ params }) => {
  return {
    // data
    account: await createCaller(await createContext()).accountRoutes.load({ id: params.id }),
    payees: await createCaller(await createContext()).payeeRoutes.all(),
    categories: await createCaller(await createContext()).categoriesRoutes.all()
  };
};
