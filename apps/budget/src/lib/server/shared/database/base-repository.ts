import { DATABASE_CONFIG } from "$lib/server/config/database";
import { logger } from "$lib/server/shared/logging";
import type {
  FilterOptions,
  PaginatedResult,
  PaginationOptions,
  SortOptions
} from "$lib/server/shared/types";
import { DatabaseError, NotFoundError } from "$lib/server/shared/types";
import { getCurrentTimestamp } from "$lib/utils/dates";
import { and, asc, count, desc, eq, like, or } from "drizzle-orm";

/**
 * Base repository class providing common database operations
 */
export abstract class BaseRepository<
  TTable,
  TEntity,
  TCreateInput,
  TUpdateInput = Partial<TCreateInput>,
> {
  constructor(
    protected db: any, // Drizzle database instance
    protected table: TTable,
    protected entityName: string
  ) {}

  /**
   * Find entity by ID
   */
  async findById(id: number, workspaceId?: number): Promise<TEntity | null> {
    try {
      const conditions = [eq((this.table as any).id, id)];

      // Add workspaceId filtering if provided and table has workspaceId column
      if (workspaceId !== undefined && (this.table as any).workspaceId) {
        conditions.push(eq((this.table as any).workspaceId, workspaceId));
      }

      const result = await this.db
        .select()
        .from(this.table)
        .where(and(...conditions))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      throw new DatabaseError(`Failed to find ${this.entityName}`, "findById");
    }
  }

  /**
   * Find entity by ID or throw NotFoundError
   */
  async findByIdOrThrow(id: number, workspaceId?: number): Promise<TEntity> {
    const entity = await this.findById(id, workspaceId);
    if (!entity) {
      throw new NotFoundError(this.entityName, id);
    }
    return entity;
  }

  /**
   * Find all entities with optional pagination
   */
  async findAll(options?: PaginationOptions): Promise<PaginatedResult<TEntity>> {
    try {
      const {
        page = 1,
        pageSize = DATABASE_CONFIG.LIMITS.DEFAULT_PAGE_SIZE,
        offset,
        limit,
      } = options || {};

      // Use offset/limit if provided, otherwise calculate from page/pageSize
      const actualLimit = limit || Math.min(pageSize, DATABASE_CONFIG.LIMITS.MAX_PAGE_SIZE);
      const actualOffset = offset !== undefined ? offset : (page - 1) * actualLimit;

      // Get total count
      const [{ total }] = await this.db.select({ total: count() }).from(this.table);

      // Get paginated data
      const data = await this.db
        .select()
        .from(this.table)
        .limit(actualLimit)
        .offset(actualOffset)
        .orderBy(desc((this.table as any).id));

      return {
        data,
        total: total || 0,
        page,
        pageSize: actualLimit,
        hasNext: actualOffset + actualLimit < (total || 0),
        hasPrevious: actualOffset > 0,
      };
    } catch (error) {
      throw new DatabaseError(`Failed to find ${this.entityName} entities`, "findAll");
    }
  }

  /**
   * Create new entity
   */
  async create(data: TCreateInput, workspaceId?: number): Promise<TEntity> {
    try {
      // Add workspaceId to data if provided and table has workspaceId column
      const values =
        workspaceId !== undefined && (this.table as any).workspaceId
          ? { ...(data as any), workspaceId }
          : data;

      const result = await this.db.insert(this.table).values(values).returning();

      if (!result[0]) {
        throw new DatabaseError(`Failed to create ${this.entityName}`, "create");
      }

      return result[0];
    } catch (error: any) {
      if (error instanceof DatabaseError) throw error;

      // Log full error details for debugging
      console.error(`[BaseRepository.create] Full error for ${this.entityName}:`, {
        message: error?.message,
        code: error?.code,
        errno: error?.errno,
        name: error?.name,
        cause: error?.cause,
        stack: error?.stack?.split('\n').slice(0, 5).join('\n'),
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
      });

      // Preserve the original error message and properties for SQLite constraint errors
      const originalMessage = error?.message || String(error);
      const dbError = new DatabaseError(
        `Failed to create ${this.entityName}: ${originalMessage}`,
        "create"
      );
      if (error?.code) (dbError as any).code = error.code;
      if (error?.errno !== undefined) (dbError as any).errno = error.errno;
      throw dbError;
    }
  }

  /**
   * Update entity by ID
   */
  async update(id: number, data: TUpdateInput, workspaceId?: number): Promise<TEntity> {
    try {
      // Verify entity exists
      await this.findByIdOrThrow(id, workspaceId);

      const conditions = [eq((this.table as any).id, id)];

      // Add workspaceId filtering if provided and table has workspaceId column
      if (workspaceId !== undefined && (this.table as any).workspaceId) {
        conditions.push(eq((this.table as any).workspaceId, workspaceId));
      }

      const result = await this.db
        .update(this.table)
        .set(data)
        .where(and(...conditions))
        .returning();

      if (!result[0]) {
        throw new DatabaseError(`Failed to update ${this.entityName}`, "update");
      }

      return result[0];
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError) throw error;
      throw new DatabaseError(`Failed to update ${this.entityName}`, "update");
    }
  }

  /**
   * Delete entity by ID (hard delete)
   */
  async delete(id: number, workspaceId?: number): Promise<void> {
    try {
      // Verify entity exists
      await this.findByIdOrThrow(id, workspaceId);

      const conditions = [eq((this.table as any).id, id)];

      // Add workspaceId filtering if provided and table has workspaceId column
      if (workspaceId !== undefined && (this.table as any).workspaceId) {
        conditions.push(eq((this.table as any).workspaceId, workspaceId));
      }

      const result = await this.db.delete(this.table).where(and(...conditions));

      if (result.changes === 0) {
        throw new DatabaseError(`Failed to delete ${this.entityName}`, "delete");
      }
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError) throw error;
      throw new DatabaseError(`Failed to delete ${this.entityName}`, "delete");
    }
  }

  /**
   * Soft delete entity by ID (if supported)
   */
  async softDelete(id: number, workspaceId?: number): Promise<TEntity> {
    try {
      // Check if table has deletedAt column
      if (!("deletedAt" in (this.table as any))) {
        throw new DatabaseError(`Soft delete not supported for ${this.entityName}`, "softDelete");
      }

      return await this.update(id, { deletedAt: getCurrentTimestamp() } as TUpdateInput, workspaceId);
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError) throw error;
      throw new DatabaseError(`Failed to soft delete ${this.entityName}`, "softDelete");
    }
  }

  /**
   * Bulk create entities
   */
  async bulkCreate(data: TCreateInput[]): Promise<TEntity[]> {
    try {
      if (data.length > DATABASE_CONFIG.LIMITS.MAX_BULK_INSERT) {
        throw new DatabaseError(
          `Bulk insert limit exceeded. Maximum ${DATABASE_CONFIG.LIMITS.MAX_BULK_INSERT} items allowed`,
          "bulkCreate"
        );
      }

      const result = await this.db.insert(this.table).values(data).returning();

      return result;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Failed to bulk create ${this.entityName} entities`, "bulkCreate");
    }
  }

  /**
   * Bulk delete entities by IDs
   */
  async bulkDelete(ids: number[]): Promise<void> {
    try {
      if (ids.length === 0) return;

      const result = await this.db
        .delete(this.table)
        .where(this.buildInCondition((this.table as any).id, ids));

      if (result.changes === 0) {
        throw new DatabaseError(`No ${this.entityName} entities were deleted`, "bulkDelete");
      }
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Failed to bulk delete ${this.entityName} entities`, "bulkDelete");
    }
  }

  /**
   * Count entities
   */
  async count(): Promise<number> {
    try {
      const [{ total }] = await this.db.select({ total: count() }).from(this.table);

      return total || 0;
    } catch (error) {
      throw new DatabaseError(`Failed to count ${this.entityName} entities`, "count");
    }
  }

  /**
   * Check if entity exists
   */
  async exists(id: number): Promise<boolean> {
    try {
      const entity = await this.findById(id);
      return entity !== null;
    } catch (error) {
      throw new DatabaseError(`Failed to check if ${this.entityName} exists`, "exists");
    }
  }

  /**
   * Find entity by slug
   * Assumes table has a 'slug' column and optionally 'deletedAt' for soft deletes
   */
  async findBySlug(slug: string, workspaceId?: number): Promise<TEntity | null> {
    try {
      // Import isNull dynamically to avoid circular dependency
      const { isNull } = await import("drizzle-orm");

      const conditions = [eq((this.table as any).slug, slug)];

      // Add deletedAt check if table supports soft deletes
      if ((this.table as any).deletedAt) {
        conditions.push(isNull((this.table as any).deletedAt));
      }

      // Add workspaceId filtering if provided and table has workspaceId column
      if (workspaceId !== undefined && (this.table as any).workspaceId) {
        conditions.push(eq((this.table as any).workspaceId, workspaceId));
      }

      const result = await this.db
        .select()
        .from(this.table)
        .where(and(...conditions))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      throw new DatabaseError(`Failed to find ${this.entityName} by slug`, "findById");
    }
  }

  /**
   * Check if a slug is unique (optionally excluding a specific entity)
   * @param slug The slug to check
   * @param excludeId Optional ID to exclude from the check (for updates)
   */
  async isSlugUnique(slug: string, excludeId?: number): Promise<boolean> {
    try {
      const { ne } = await import("drizzle-orm");

      const conditions = [eq((this.table as any).slug, slug)];

      if (excludeId) {
        conditions.push(ne((this.table as any).id, excludeId));
      }

      const result = await this.db
        .select()
        .from(this.table)
        .where(and(...conditions))
        .limit(1);

      return !result[0]; // true if no entity found (slug is unique)
    } catch (error) {
      throw new DatabaseError(
        `Failed to check slug uniqueness for ${this.entityName}`,
        "isSlugUnique"
      );
    }
  }

  /**
   * Soft delete entity with slug archiving to prevent conflicts
   * Appends "-deleted-{timestamp}" to the slug before soft deleting
   */
  async softDeleteWithSlugArchive(id: number): Promise<TEntity> {
    try {
      // Check if table supports soft deletes and has slug column
      if (!("deletedAt" in (this.table as any)) || !("slug" in (this.table as any))) {
        throw new DatabaseError(
          `Soft delete with slug archive not supported for ${this.entityName}`,
          "softDeleteWithSlugArchive"
        );
      }

      // Get existing entity
      const entity = await this.findByIdOrThrow(id);
      const slug = (entity as any).slug;

      // Create archived slug
      const timestamp = Date.now();
      const archivedSlug = `${slug}-deleted-${timestamp}`;

      // Update with archived slug and deletedAt
      return await this.update(id, {
        slug: archivedSlug,
        deletedAt: getCurrentTimestamp(),
      } as TUpdateInput);
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError) throw error;
      throw new DatabaseError(
        `Failed to soft delete ${this.entityName} with slug archive`,
        "softDeleteWithSlugArchive"
      );
    }
  }

  /**
   * Bulk soft delete entities with slug archiving
   * Appends "-deleted-{timestamp}" to slugs before soft deleting
   * Returns the number of entities successfully deleted
   */
  async bulkSoftDeleteWithSlugArchive(ids: number[]): Promise<number> {
    try {
      if (ids.length === 0) return 0;

      // Check if table supports soft deletes and has slug column
      if (!("deletedAt" in (this.table as any)) || !("slug" in (this.table as any))) {
        throw new DatabaseError(
          `Bulk soft delete with slug archive not supported for ${this.entityName}`,
          "bulkSoftDeleteWithSlugArchive"
        );
      }

      const { inArray, isNull, and } = await import("drizzle-orm");

      // Get existing entities to access their slugs
      const entities = await this.db
        .select()
        .from(this.table)
        .where(and(inArray((this.table as any).id, ids), isNull((this.table as any).deletedAt)));

      if (entities.length === 0) return 0;

      // Delete each entity with slug modification
      const timestamp = Date.now();
      let deletedCount = 0;

      for (const entity of entities) {
        const slug = (entity as any).slug;
        const id = (entity as any).id;
        const archivedSlug = `${slug}-deleted-${timestamp}`;

        try {
          await this.update(id, {
            slug: archivedSlug,
            deletedAt: getCurrentTimestamp(),
          } as TUpdateInput);
          deletedCount++;
        } catch (error) {
          // Log error but continue with other entities
          logger.error(`Failed to delete ${this.entityName} ${id}:`, error);
        }
      }

      return deletedCount;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(
        `Failed to bulk soft delete ${this.entityName} entities with slug archive`,
        "bulkSoftDeleteWithSlugArchive"
      );
    }
  }

  /**
   * Search entities by name field
   * Assumes table has a 'name' column
   */
  async searchByName(
    query: string,
    options?: { limit?: number; excludeDeleted?: boolean }
  ): Promise<TEntity[]> {
    try {
      const { limit = 50, excludeDeleted = true } = options || {};
      const { isNull } = await import("drizzle-orm");

      if (!("name" in (this.table as any))) {
        throw new DatabaseError(
          `Search by name not supported for ${this.entityName}`,
          "searchByName"
        );
      }

      const conditions = [like((this.table as any).name, `%${query}%`)];

      // Exclude soft-deleted entities if requested and supported
      if (excludeDeleted && (this.table as any).deletedAt) {
        conditions.push(isNull((this.table as any).deletedAt));
      }

      return await this.db
        .select()
        .from(this.table)
        .where(and(...conditions))
        .limit(limit)
        .orderBy(asc((this.table as any).name));
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Failed to search ${this.entityName} by name`, "searchByName");
    }
  }

  // Helper methods
  protected buildInCondition(column: any, values: any[]) {
    // Build IN condition for bulk operations
    return or(...values.map((value) => eq(column, value)));
  }

  protected buildSortConditions(sorts: SortOptions[]) {
    return sorts.map((sort) => {
      const column = (this.table as any)[sort.field];
      return sort.direction === "desc" ? desc(column) : asc(column);
    });
  }

  protected buildFilterConditions(filters: FilterOptions[]) {
    return filters.map((filter) => {
      const column = (this.table as any)[filter.field];

      switch (filter.operator) {
        case "eq":
          return eq(column, filter.value);
        case "ne":
          return eq(column, filter.value); // Note: Drizzle doesn't have ne, use not(eq())
        case "like":
          return like(column, `%${filter.value}%`);
        default:
          return eq(column, filter.value);
      }
    });
  }
}
