import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { createContext } from '$lib/trpc/context';
import { createCaller } from '$lib/trpc/router';

export const load: PageServerLoad = async ({ params }: { params: any }) => {
  const budgetId = parseInt(params.id);

  if (isNaN(budgetId)) {
    throw error(400, 'Invalid budget ID');
  }

  try {
    const caller = createCaller(await createContext());

    // Fetch real budget data from database
    const budget = await caller.budgetRoutes.get({ id: budgetId });

    // Get categories from layout data since they're available globally
    const categories = await caller.categoriesRoutes.all();

    return {
      budget,
      categories
    };
  } catch (err) {
    console.error('Failed to load budget:', err);
    throw error(404, 'Budget not found');
  }
};