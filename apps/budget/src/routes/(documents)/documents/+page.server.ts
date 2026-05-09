import { createContext } from "$core/trpc/context";
import { fromSvelteKit } from "$lib/trpc/adapters/sveltekit";
import { createCaller } from "$core/trpc/router";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
  const caller = createCaller(await createContext(fromSvelteKit(event)));

  // Load accounts and available tax years
  const [accounts, availableTaxYears] = await Promise.all([
    caller.accountRoutes.all(),
    caller.accountDocumentsRouter.getAvailableTaxYears(),
  ]);

  // Default to current year if no documents exist yet
  const currentYear = new Date().getFullYear();
  const defaultTaxYear = availableTaxYears.length > 0 ? availableTaxYears[0] : currentYear;

  return {
    accounts,
    availableTaxYears,
    defaultTaxYear,
  };
};
