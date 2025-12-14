import type {
  ColumnMapping,
  ImportProfile,
  NewImportProfile,
} from "$lib/schema/import-profiles";
import { generateColumnSignature } from "$lib/schema/import-profiles";
import { NotFoundError, ValidationError } from "$lib/server/shared/types/errors";
import { InputSanitizer } from "$lib/server/shared/validation";
import { minimatch } from "minimatch";
import { ImportProfileRepository, type UpdateImportProfileData } from "./repository";

export interface CreateImportProfileData {
  name: string;
  columnSignature?: string | null | undefined;
  filenamePattern?: string | null | undefined;
  accountId?: number | null | undefined;
  isAccountDefault?: boolean | undefined;
  mapping: ColumnMapping;
}

export interface FindMatchOptions {
  headers: string[];
  filename?: string | undefined;
  accountId?: number | undefined;
}

/**
 * Service for import profile business logic
 */
export class ImportProfileService {
  constructor(private repository: ImportProfileRepository) {}

  /**
   * Create a new import profile
   */
  async createProfile(data: CreateImportProfileData, workspaceId: number): Promise<ImportProfile> {
    // Validate and sanitize name
    if (!data.name?.trim()) {
      throw new ValidationError("Profile name is required");
    }

    const sanitizedName = InputSanitizer.sanitizeName(data.name.trim());
    if (!sanitizedName) {
      throw new ValidationError("Invalid profile name");
    }

    // Generate column signature from mapping if headers are available
    const columnSignature = data.columnSignature ?? null;

    // Validate filename pattern if provided
    if (data.filenamePattern) {
      try {
        // Test that the pattern is valid by trying to match it
        minimatch("test.csv", data.filenamePattern);
      } catch {
        throw new ValidationError("Invalid filename pattern");
      }
    }

    // If setting as account default, clear existing default
    if (data.isAccountDefault && data.accountId) {
      await this.repository.clearAccountDefault(data.accountId, workspaceId);
    }

    const newProfile: NewImportProfile = {
      name: sanitizedName,
      columnSignature,
      filenamePattern: data.filenamePattern ?? null,
      accountId: data.accountId ?? null,
      isAccountDefault: data.isAccountDefault ?? false,
      mapping: data.mapping,
      workspaceId,
    };

    return await this.repository.create(newProfile, workspaceId);
  }

  /**
   * Get all import profiles for a workspace
   */
  async getProfiles(workspaceId: number): Promise<ImportProfile[]> {
    return await this.repository.findAllByWorkspace(workspaceId);
  }

  /**
   * Get an import profile by ID
   */
  async getProfileById(id: number, workspaceId: number): Promise<ImportProfile> {
    const profile = await this.repository.findById(id, workspaceId);
    if (!profile) {
      throw new NotFoundError("ImportProfile", id);
    }
    return profile;
  }

  /**
   * Update an import profile
   */
  async updateProfile(
    id: number,
    data: UpdateImportProfileData,
    workspaceId: number
  ): Promise<ImportProfile> {
    // Verify profile exists
    await this.getProfileById(id, workspaceId);

    // Sanitize name if provided
    if (data.name !== undefined) {
      if (!data.name?.trim()) {
        throw new ValidationError("Profile name is required");
      }
      data.name = InputSanitizer.sanitizeName(data.name.trim()) || data.name;
    }

    // Validate filename pattern if provided
    if (data.filenamePattern) {
      try {
        minimatch("test.csv", data.filenamePattern);
      } catch {
        throw new ValidationError("Invalid filename pattern");
      }
    }

    // If setting as account default, clear existing default
    if (data.isAccountDefault && data.accountId) {
      await this.repository.clearAccountDefault(data.accountId, workspaceId);
    }

    return await this.repository.update(id, data, workspaceId);
  }

  /**
   * Delete an import profile
   */
  async deleteProfile(id: number, workspaceId: number): Promise<void> {
    // Verify profile exists
    await this.getProfileById(id, workspaceId);
    await this.repository.delete(id, workspaceId);
  }

  /**
   * Find a matching import profile based on various criteria
   *
   * Matching priority:
   * 1. Exact column signature match
   * 2. Filename pattern match
   * 3. Account default
   */
  async findMatchingProfile(
    options: FindMatchOptions,
    workspaceId: number
  ): Promise<ImportProfile | null> {
    const { headers, filename, accountId } = options;

    // 1. Try to match by column signature
    if (headers.length > 0) {
      const signature = generateColumnSignature(headers);
      const signatureMatch = await this.repository.findByColumnSignature(signature, workspaceId);
      if (signatureMatch) {
        // Record usage
        await this.repository.recordUsage(signatureMatch.id, workspaceId);
        return signatureMatch;
      }
    }

    // 2. Try to match by filename pattern
    if (filename) {
      const profilesWithPatterns = await this.repository.findByFilenamePattern(workspaceId);
      for (const profile of profilesWithPatterns) {
        if (profile.filenamePattern && minimatch(filename, profile.filenamePattern)) {
          // Record usage
          await this.repository.recordUsage(profile.id, workspaceId);
          return profile;
        }
      }
    }

    // 3. Fall back to account default
    if (accountId) {
      const accountDefault = await this.repository.findAccountDefault(accountId, workspaceId);
      if (accountDefault) {
        // Record usage
        await this.repository.recordUsage(accountDefault.id, workspaceId);
        return accountDefault;
      }
    }

    return null;
  }

  /**
   * Set a profile as the default for an account
   */
  async setAccountDefault(
    profileId: number,
    accountId: number,
    workspaceId: number
  ): Promise<ImportProfile> {
    // Verify profile exists
    await this.getProfileById(profileId, workspaceId);

    // Clear existing default for this account
    await this.repository.clearAccountDefault(accountId, workspaceId);

    // Set new default
    return await this.repository.update(
      profileId,
      { accountId, isAccountDefault: true },
      workspaceId
    );
  }

  /**
   * Generate column signature from CSV headers
   * Exposed for use in creating profiles
   */
  generateSignature(headers: string[]): string {
    return generateColumnSignature(headers);
  }

  /**
   * Record that a profile was used
   */
  async recordUsage(profileId: number, workspaceId: number): Promise<void> {
    await this.repository.recordUsage(profileId, workspaceId);
  }
}
