import type { ColumnMapping, ImportProfile } from "$lib/schema/import-profiles";
import { trpc } from "$lib/trpc/client";
import { queryClient, queryPresets } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

// Query keys for import profiles
export const importProfileKeys = createQueryKeys("importProfiles", {
  list: () => ["importProfiles", "list"] as const,
  detail: (id: number) => ["importProfiles", "detail", id] as const,
  findMatch: (params: { headers: string[]; filename?: string; accountId?: number }) =>
    ["importProfiles", "findMatch", params] as const,
});

/**
 * List all import profiles for the workspace
 */
export const listImportProfiles = () =>
  defineQuery<ImportProfile[]>({
    queryKey: importProfileKeys["list"](),
    queryFn: () => trpc().importProfileRoutes.list.query(),
    options: {
      ...queryPresets.static,
    },
  });

/**
 * Get a single import profile by ID
 */
export const getImportProfile = (id: number) =>
  defineQuery<ImportProfile>({
    queryKey: importProfileKeys["detail"](id),
    queryFn: () => trpc().importProfileRoutes.get.query({ id }),
    options: {
      staleTime: 60 * 1000,
    },
  });

/**
 * Find a matching import profile based on CSV headers, filename, or account
 */
export const findMatchingProfile = (params: {
  headers: string[];
  filename?: string;
  accountId?: number;
}) =>
  defineQuery<ImportProfile | null>({
    queryKey: importProfileKeys["findMatch"](params),
    queryFn: () => trpc().importProfileRoutes.findMatch.query(params),
    options: {
      staleTime: 30 * 1000, // 30 seconds
    },
  });

// Input types for mutations
interface CreateImportProfileInput {
  name: string;
  columnSignature?: string | null;
  filenamePattern?: string | null;
  accountId?: number | null;
  isAccountDefault?: boolean;
  mapping: ColumnMapping;
}

interface UpdateImportProfileInput {
  id: number;
  name?: string;
  filenamePattern?: string | null;
  accountId?: number | null;
  isAccountDefault?: boolean;
  mapping?: ColumnMapping;
}

/**
 * Create a new import profile
 */
export const createImportProfile = () =>
  defineMutation<CreateImportProfileInput, ImportProfile>({
    mutationFn: (input) => trpc().importProfileRoutes.create.mutate(input),
    successMessage: "Import profile created",
    errorMessage: "Failed to create import profile",
    onSuccess: () => {
      // Invalidate list query
      queryClient.invalidateQueries({ queryKey: importProfileKeys["list"]() });
    },
  });

/**
 * Update an existing import profile
 */
export const updateImportProfile = () =>
  defineMutation<UpdateImportProfileInput, ImportProfile>({
    mutationFn: (input) => trpc().importProfileRoutes.update.mutate(input),
    successMessage: "Import profile updated",
    errorMessage: "Failed to update import profile",
    onSuccess: (data) => {
      // Invalidate both list and detail queries
      queryClient.invalidateQueries({ queryKey: importProfileKeys["list"]() });
      queryClient.invalidateQueries({ queryKey: importProfileKeys["detail"](data.id) });
    },
  });

/**
 * Delete an import profile
 */
export const deleteImportProfile = () =>
  defineMutation<{ id: number }, { success: boolean }>({
    mutationFn: (input) => trpc().importProfileRoutes.delete.mutate(input),
    successMessage: "Import profile deleted",
    errorMessage: "Failed to delete import profile",
    onSuccess: (_, variables) => {
      // Invalidate list and remove detail from cache
      queryClient.invalidateQueries({ queryKey: importProfileKeys["list"]() });
      queryClient.removeQueries({ queryKey: importProfileKeys["detail"](variables.id) });
    },
  });

/**
 * Set a profile as the default for an account
 */
export const setAccountDefault = () =>
  defineMutation<{ profileId: number; accountId: number }, ImportProfile>({
    mutationFn: (input) => trpc().importProfileRoutes.setAccountDefault.mutate(input),
    successMessage: "Default profile set",
    errorMessage: "Failed to set default profile",
    onSuccess: (data) => {
      // Invalidate list and detail queries
      queryClient.invalidateQueries({ queryKey: importProfileKeys["list"]() });
      queryClient.invalidateQueries({ queryKey: importProfileKeys["detail"](data.id) });
    },
  });

/**
 * Record that a profile was used (increments use count)
 */
export const recordProfileUsage = () =>
  defineMutation<{ id: number }, { success: boolean }>({
    mutationFn: (input) => trpc().importProfileRoutes.recordUsage.mutate(input),
    // No toast for this one - it's a silent background operation
    onSuccess: (_, variables) => {
      // Invalidate the detail query to refresh use count
      queryClient.invalidateQueries({ queryKey: importProfileKeys["detail"](variables.id) });
    },
  });

/**
 * Generate a column signature from headers (utility function)
 */
export const generateColumnSignature = async (headers: string[]) => {
  const result = await trpc().importProfileRoutes.generateSignature.query({ headers });
  return result.signature;
};

// Convenience namespace export for organized access
export const ImportProfiles = {
  keys: importProfileKeys,
  list: listImportProfiles,
  get: getImportProfile,
  findMatch: findMatchingProfile,
  create: createImportProfile,
  update: updateImportProfile,
  delete: deleteImportProfile,
  setAccountDefault,
  recordUsage: recordProfileUsage,
  generateSignature: generateColumnSignature,
};
