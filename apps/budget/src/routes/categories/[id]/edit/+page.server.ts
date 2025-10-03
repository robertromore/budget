import {createContext} from '$lib/trpc/context';
import {createCaller} from '$lib/trpc/router';
import type {PageServerLoad} from './$types';
import {error} from '@sveltejs/kit';

export const load: PageServerLoad = async ({params}) => {
  const categoryId = Number(params.id);

  if (isNaN(categoryId)) {
    throw error(404, 'Invalid category ID');
  }

  const caller = createCaller(await createContext());
  const category = await caller.categoriesRoutes.load({id: categoryId});

  if (!category) {
    throw error(404, 'Category not found');
  }

  return {
    category
  };
};