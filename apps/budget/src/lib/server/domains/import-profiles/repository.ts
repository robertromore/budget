import { importProfiles, type ImportProfile, type NewImportProfile } from "$lib/schema/import-profiles";
import { db } from "$lib/server/db";
import { BaseRepository } from "$lib/server/shared/database/base-repository";
import { and, desc, eq, like } from "drizzle-orm";

export interface UpdateImportProfileData {
  name?: string | undefined;
  filenamePattern?: string | null | undefined;
  accountId?: number | null | undefined;
  isAccountDefault?: boolean | undefined;
  mapping?: ImportProfile["mapping"] | undefined;
}

/**
 * Repository for import profile database operations
 */
export class ImportProfileRepository extends BaseRepository<
  typeof importProfiles,
  ImportProfile,
  NewImportProfile,
  UpdateImportProfileData
> {
  constructor() {
    super(db, importProfiles, "ImportProfile");
  }

  /**
   * Create a new import profile
   */
  override async create(data: NewImportProfile, workspaceId: number): Promise<ImportProfile> {
    const [profile] = await db
      .insert(importProfiles)
      .values({ ...data, workspaceId })
      .returning();

    if (!profile) {
      throw new Error("Failed to create import profile");
    }

    return profile;
  }

  /**
   * Find import profile by ID with workspaceId filtering
   */
  override async findById(id: number, workspaceId: number): Promise<ImportProfile | null> {
    const result = await db
      .select()
      .from(importProfiles)
      .where(and(eq(importProfiles.id, id), eq(importProfiles.workspaceId, workspaceId)))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Find all import profiles for a workspace
   */
  async findAllByWorkspace(workspaceId: number): Promise<ImportProfile[]> {
    return await db
      .select()
      .from(importProfiles)
      .where(eq(importProfiles.workspaceId, workspaceId))
      .orderBy(desc(importProfiles.lastUsedAt));
  }

  /**
   * Find import profile by column signature
   */
  async findByColumnSignature(
    columnSignature: string,
    workspaceId: number
  ): Promise<ImportProfile | null> {
    const result = await db
      .select()
      .from(importProfiles)
      .where(
        and(
          eq(importProfiles.columnSignature, columnSignature),
          eq(importProfiles.workspaceId, workspaceId)
        )
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * Find profiles matching a filename pattern
   * Returns profiles where the filename matches their pattern
   */
  async findByFilenamePattern(workspaceId: number): Promise<ImportProfile[]> {
    // Get all profiles with filename patterns for this workspace
    const result = await db
      .select()
      .from(importProfiles)
      .where(
        and(
          eq(importProfiles.workspaceId, workspaceId),
          // Only get profiles that have a filename pattern set
          like(importProfiles.filenamePattern, "%")
        )
      );

    // Filter out null patterns
    return result.filter((p) => p.filenamePattern !== null);
  }

  /**
   * Find account default profile
   */
  async findAccountDefault(
    accountId: number,
    workspaceId: number
  ): Promise<ImportProfile | null> {
    const result = await db
      .select()
      .from(importProfiles)
      .where(
        and(
          eq(importProfiles.accountId, accountId),
          eq(importProfiles.isAccountDefault, true),
          eq(importProfiles.workspaceId, workspaceId)
        )
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * Update an import profile
   */
  override async update(
    id: number,
    data: UpdateImportProfileData,
    workspaceId: number
  ): Promise<ImportProfile> {
    const [updated] = await db
      .update(importProfiles)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(importProfiles.id, id), eq(importProfiles.workspaceId, workspaceId)))
      .returning();

    if (!updated) {
      throw new Error("Failed to update import profile");
    }

    return updated;
  }

  /**
   * Delete an import profile
   */
  override async delete(id: number, workspaceId: number): Promise<void> {
    await db
      .delete(importProfiles)
      .where(and(eq(importProfiles.id, id), eq(importProfiles.workspaceId, workspaceId)));
  }

  /**
   * Increment use count and update last used timestamp
   */
  async recordUsage(id: number, workspaceId: number): Promise<void> {
    const profile = await this.findById(id, workspaceId);
    if (!profile) return;

    await db
      .update(importProfiles)
      .set({
        useCount: (profile.useCount ?? 0) + 1,
        lastUsedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(importProfiles.id, id), eq(importProfiles.workspaceId, workspaceId)));
  }

  /**
   * Clear account default flag for all profiles of an account
   */
  async clearAccountDefault(accountId: number, workspaceId: number): Promise<void> {
    await db
      .update(importProfiles)
      .set({
        isAccountDefault: false,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(eq(importProfiles.accountId, accountId), eq(importProfiles.workspaceId, workspaceId))
      );
  }
}
