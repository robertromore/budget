import type {PageServerLoad} from "./$types";

export const load: PageServerLoad = async (event) => {
  const {params} = event;

  return {
    accountSlug: params.slug,
  };
};
