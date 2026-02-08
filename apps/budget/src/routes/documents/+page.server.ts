import { createContext } from "$lib/trpc/context";
import { createCaller } from "$lib/trpc/router";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
  const caller = createCaller(await createContext(event));

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
