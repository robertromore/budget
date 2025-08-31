import { z } from "zod";
import { 
  publicProcedure, 
  authenticatedProcedure, 
  rateLimitedProcedure,
  bulkProcedure 
} from "$lib/server/shared/trpc/procedures";
import { AccountService } from "./services";
import { router } from "$lib/trpc/t";
import { removeAccountSchema } from "$lib/schema/accounts";

// Initialize service
const accountService = new AccountService();

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
export const accountRoutes = router({
  // Get all active accounts
  list: publicProcedure
    .query(async () => {
      return await accountService.getActiveAccounts();
    }),

  // Get account by ID
  getById: publicProcedure
    .input(accountByIdSchema)
    .query(async ({ input }) => {
      return await accountService.getAccountById(input.id);
    }),

  // Get account by slug
  getBySlug: publicProcedure
    .input(accountBySlugSchema)
    .query(async ({ input }) => {
      return await accountService.getAccountBySlug(input.slug);
    }),

  // Search accounts
  search: authenticatedProcedure
    .input(searchAccountsSchema)
    .query(async ({ input }) => {
      return await accountService.searchAccounts(input.query, input.limit);
    }),

  // Create new account
  create: rateLimitedProcedure
    .input(createAccountSchema)
    .mutation(async ({ input }) => {
      return await accountService.createAccount(input);
    }),

  // Update account
  update: rateLimitedProcedure
    .input(updateAccountSchema)
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;
      return await accountService.updateAccount(id, updateData);
    }),

  // Delete account (soft delete)
  remove: rateLimitedProcedure
    .input(removeAccountSchema)
    .mutation(async ({ input }) => {
      await accountService.deleteAccount(input.id);
      return { success: true };
    }),

  // Update account balance
  updateBalance: rateLimitedProcedure
    .input(z.object({
      id: z.number().positive(),
      balance: z.number(),
    }))
    .mutation(async ({ input }) => {
      return await accountService.updateAccountBalance(input.id, input.balance);
    }),
});