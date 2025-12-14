import { columnMappingSchema } from "$lib/schema/import-profiles";
import { serviceFactory } from "$lib/server/shared/container/service-factory";
import { publicProcedure, t } from "$lib/trpc";
import { translateDomainError } from "$lib/trpc/shared/errors";
import { z } from "zod";

const importProfileService = serviceFactory.getImportProfileService();

// Input schemas
const profileIdSchema = z.object({
  id: z.number().int().positive(),
});

const createProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Profile name is required")
    .min(2, "Profile name must be at least 2 characters")
    .max(100, "Profile name must be less than 100 characters"),
  columnSignature: z.string().max(1000).optional().nullable(),
  filenamePattern: z.string().max(200).optional().nullable(),
  accountId: z.number().int().positive().optional().nullable(),
  isAccountDefault: z.boolean().optional().default(false),
  mapping: columnMappingSchema,
});

const updateProfileSchema = z
  .object({
    id: z.number().int().positive(),
    name: z
      .string()
      .trim()
      .min(2, "Profile name must be at least 2 characters")
      .max(100, "Profile name must be less than 100 characters")
      .optional(),
    filenamePattern: z.string().max(200).optional().nullable(),
    accountId: z.number().int().positive().optional().nullable(),
    isAccountDefault: z.boolean().optional(),
    mapping: columnMappingSchema.optional(),
  })
  .refine((value) => {
    const { name, filenamePattern, accountId, isAccountDefault, mapping } = value;
    return (
      name !== undefined ||
      filenamePattern !== undefined ||
      accountId !== undefined ||
      isAccountDefault !== undefined ||
      mapping !== undefined
    );
  }, "At least one field must be provided when updating an import profile");

const findMatchSchema = z.object({
  headers: z.array(z.string()),
  filename: z.string().optional(),
  accountId: z.number().int().positive().optional(),
});

const setAccountDefaultSchema = z.object({
  profileId: z.number().int().positive(),
  accountId: z.number().int().positive(),
});

const generateSignatureSchema = z.object({
  headers: z.array(z.string()),
});

export const importProfileRoutes = t.router({
  // List all import profiles for the workspace
  list: publicProcedure.query(async ({ ctx }) => {
    try {
      return await importProfileService.getProfiles(ctx.workspaceId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  // Get a single import profile by ID
  get: publicProcedure.input(profileIdSchema).query(async ({ input, ctx }) => {
    try {
      return await importProfileService.getProfileById(input.id, ctx.workspaceId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  // Create a new import profile
  create: publicProcedure.input(createProfileSchema).mutation(async ({ input, ctx }) => {
    try {
      return await importProfileService.createProfile(input, ctx.workspaceId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  // Update an existing import profile
  update: publicProcedure.input(updateProfileSchema).mutation(async ({ input, ctx }) => {
    try {
      const { id, ...updates } = input;
      return await importProfileService.updateProfile(id, updates, ctx.workspaceId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  // Delete an import profile
  delete: publicProcedure.input(profileIdSchema).mutation(async ({ input, ctx }) => {
    try {
      await importProfileService.deleteProfile(input.id, ctx.workspaceId);
      return { success: true };
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  // Find a matching profile based on CSV headers, filename, or account
  findMatch: publicProcedure.input(findMatchSchema).query(async ({ input, ctx }) => {
    try {
      return await importProfileService.findMatchingProfile(input, ctx.workspaceId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  // Set a profile as the default for an account
  setAccountDefault: publicProcedure.input(setAccountDefaultSchema).mutation(async ({ input, ctx }) => {
    try {
      return await importProfileService.setAccountDefault(
        input.profileId,
        input.accountId,
        ctx.workspaceId
      );
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  // Generate a column signature from headers (utility endpoint)
  generateSignature: publicProcedure.input(generateSignatureSchema).query(({ input }) => {
    return {
      signature: importProfileService.generateSignature(input.headers),
    };
  }),

  // Record that a profile was used
  recordUsage: publicProcedure.input(profileIdSchema).mutation(async ({ input, ctx }) => {
    try {
      await importProfileService.recordUsage(input.id, ctx.workspaceId);
      return { success: true };
    } catch (error) {
      throw translateDomainError(error);
    }
  }),
});
