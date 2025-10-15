import { removeAccountSchema } from "$lib/schema/accounts";
import {
  authenticatedProcedure,
  publicProcedure,
  rateLimitedProcedure,
} from "$lib/server/shared/trpc/procedures";
import { t } from "$lib/trpc/t";
import { z } from "zod";
import { serviceFactory } from "$lib/server/shared/container/service-factory";

// Get service from factory (lazy initialization)
const getAccountService = () => serviceFactory.getAccountService();

// Input schemas
const createAccountSchema = z.object({
  name: z.string().min(2).max(50),
  notes: z.string().max(500).optional(),
  initialBalance: z.number().optional(),
});

const updateAccountSchema = z.object({
  id: z.number().positive(),
  name: z.string().min(2).max(50).optional(),
  notes: z.string().max(500).optional(),
  balance: z.number().optional(),
});

const accountByIdSchema = z.object({
  id: z.number().positive(),
});

const accountBySlugSchema = z.object({
  slug: z.string().min(2).max(30),
});

const searchAccountsSchema = z.object({
  query: z.string().min(1).max(100),
  limit: z.number().min(1).max(50).optional(),
});

/**
 * Account routes using the new architecture
 */
export const accountRoutes = t.router({
  // Get all accounts with transactions for UI
  all: publicProcedure.query(async () => {
    return await getAccountService().getAllAccountsWithTransactions();
  }),

  // Get all active accounts
  list: publicProcedure.query(async () => {
    return await getAccountService().getActiveAccounts();
  }),

  // Get account by ID
  getById: publicProcedure.input(accountByIdSchema).query(async ({input}) => {
    return await getAccountService().getAccountById(input.id);
  }),

  // Get account by slug
  getBySlug: publicProcedure.input(accountBySlugSchema).query(async ({input}) => {
    return await getAccountService().getAccountBySlug(input.slug);
  }),

  // Search accounts
  search: authenticatedProcedure.input(searchAccountsSchema).query(async ({input}) => {
    return await getAccountService().searchAccounts(input.query, input.limit);
  }),

  // Create new account
  create: rateLimitedProcedure.input(createAccountSchema).mutation(async ({input}) => {
    // Filter out undefined values to satisfy exactOptionalPropertyTypes
    const cleanInput = Object.fromEntries(
      Object.entries(input).filter(([_, v]) => v !== undefined)
    );
    return await getAccountService().createAccount(cleanInput as any);
  }),

  // Update account
  update: rateLimitedProcedure.input(updateAccountSchema).mutation(async ({input}) => {
    const {id, ...updateData} = input;
    // Filter out undefined values to satisfy exactOptionalPropertyTypes
    const cleanUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, v]) => v !== undefined)
    );
    return await getAccountService().updateAccount(id, cleanUpdateData as any);
  }),

  // Delete account (soft delete)
  remove: rateLimitedProcedure.input(removeAccountSchema).mutation(async ({input}) => {
    await getAccountService().deleteAccount(input.id);
    return {success: true};
  }),

  // Update account balance
  updateBalance: rateLimitedProcedure
    .input(
      z.object({
        id: z.number().positive(),
        balance: z.number(),
      })
    )
    .mutation(async ({input}) => {
      return await getAccountService().updateAccountBalance(input.id, input.balance);
    }),
});
