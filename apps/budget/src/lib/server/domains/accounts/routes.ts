import { removeAccountSchema } from "$lib/schema/accounts";
import {
  authenticatedProcedure,
  publicProcedure,
  rateLimitedProcedure
} from "$lib/server/shared/trpc/procedures";
import { serviceFactory } from "$lib/server/shared/container/service-factory";
import { t } from "$lib/trpc/t";
import { z } from "zod";

// Get service from factory (handles dependency injection)
const accountService = serviceFactory.getAccountService();

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
    return await accountService.getAllAccountsWithTransactions();
  }),

  // Get all active accounts
  list: publicProcedure.query(async () => {
    return await accountService.getActiveAccounts();
  }),

  // Get account by ID
  getById: publicProcedure.input(accountByIdSchema).query(async ({ input }) => {
    return await accountService.getAccountById(input.id);
  }),

  // Get account by slug
  getBySlug: publicProcedure.input(accountBySlugSchema).query(async ({ input }) => {
    return await accountService.getAccountBySlug(input.slug);
  }),

  // Search accounts
  search: authenticatedProcedure.input(searchAccountsSchema).query(async ({ input }) => {
    return await accountService.searchAccounts(input.query, input.limit);
  }),

  // Create new account
  create: rateLimitedProcedure.input(createAccountSchema).mutation(async ({ input, ctx }) => {
    return await accountService.createAccount(input, ctx.workspaceId);
  }),

  // Update account
  update: rateLimitedProcedure.input(updateAccountSchema).mutation(async ({ input }) => {
    const { id, ...updateData } = input;
    return await accountService.updateAccount(id, updateData);
  }),

  // Delete account (soft delete)
  remove: rateLimitedProcedure.input(removeAccountSchema).mutation(async ({ input }) => {
    await accountService.deleteAccount(input.id);
    return { success: true };
  }),

  // Update account balance
  updateBalance: rateLimitedProcedure
    .input(
      z.object({
        id: z.number().positive(),
        balance: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return await accountService.updateAccountBalance(input.id, input.balance);
    }),
});
