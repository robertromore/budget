import type { Database } from "bun:sqlite";
import { eq, desc, asc, like, and, or, count } from "drizzle-orm";
import { DatabaseError, NotFoundError } from "../types/errors";
import type { PaginationOptions, PaginatedResult, SortOptions, FilterOptions, SearchOptions } from "../types";
import { DATABASE_CONFIG } from "$lib/server/config/database";

/**
 * Base repository class providing common database operations
 */
export abstract class BaseRepository<
  TTable,
  TEntity,
  TCreateInput,
  TUpdateInput = Partial<TCreateInput>
> {
  constructor(
    protected db: any, // Drizzle database instance
    protected table: TTable,
    protected entityName: string
  ) {}

  /**
   * Find entity by ID
   */
  async findById(id: number): Promise<TEntity | null> {
    try {
      const result = await this.db
        .select()
        .from(this.table)
        .where(eq((this.table as any).id, id))
        .limit(1);
      
      return result[0] || null;
    } catch (error) {
      throw new DatabaseError(`Failed to find ${this.entityName}`, 'findById');
    }
  }

  /**
   * Find entity by ID or throw NotFoundError
   */
  async findByIdOrThrow(id: number): Promise<TEntity> {
    const entity = await this.findById(id);
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
        limit
      } = options || {};

      // Use offset/limit if provided, otherwise calculate from page/pageSize
      const actualLimit = limit || Math.min(pageSize, DATABASE_CONFIG.LIMITS.MAX_PAGE_SIZE);
      const actualOffset = offset !== undefined ? offset : (page - 1) * actualLimit;

      // Get total count
      const [{ total }] = await this.db
        .select({ total: count() })
        .from(this.table);

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
      throw new DatabaseError(`Failed to find ${this.entityName} entities`, 'findAll');
    }
  }

  /**
   * Create new entity
   */
  async create(data: TCreateInput): Promise<TEntity> {
    try {
      const result = await this.db
        .insert(this.table)
        .values(data)
        .returning();
      
      if (!result[0]) {
        throw new DatabaseError(`Failed to create ${this.entityName}`, 'create');
      }
      
      return result[0];
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Failed to create ${this.entityName}`, 'create');
    }
  }

  /**
   * Update entity by ID
   */
  async update(id: number, data: TUpdateInput): Promise<TEntity> {
    try {
      // Verify entity exists
      await this.findByIdOrThrow(id);
      
      const result = await this.db
        .update(this.table)
        .set(data)
        .where(eq((this.table as any).id, id))
        .returning();
      
      if (!result[0]) {
        throw new DatabaseError(`Failed to update ${this.entityName}`, 'update');
      }
      
      return result[0];
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError) throw error;
      throw new DatabaseError(`Failed to update ${this.entityName}`, 'update');
    }
  }

  /**
   * Delete entity by ID (hard delete)
   */
  async delete(id: number): Promise<void> {
    try {
      // Verify entity exists
      await this.findByIdOrThrow(id);
      
      const result = await this.db
        .delete(this.table)
        .where(eq((this.table as any).id, id));
      
      if (result.changes === 0) {
        throw new DatabaseError(`Failed to delete ${this.entityName}`, 'delete');
      }
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError) throw error;
      throw new DatabaseError(`Failed to delete ${this.entityName}`, 'delete');
    }
  }

  /**
   * Soft delete entity by ID (if supported)
   */
  async softDelete(id: number): Promise<TEntity> {
    try {
      // Check if table has deletedAt column
      if (!('deletedAt' in (this.table as any))) {
        throw new DatabaseError(`Soft delete not supported for ${this.entityName}`, 'softDelete');
      }

      return await this.update(id, { deletedAt: new Date() } as TUpdateInput);
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError) throw error;
      throw new DatabaseError(`Failed to soft delete ${this.entityName}`, 'softDelete');
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
          'bulkCreate'
        );
      }

      const result = await this.db
        .insert(this.table)
        .values(data)
        .returning();
      
      return result;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Failed to bulk create ${this.entityName} entities`, 'bulkCreate');
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
        throw new DatabaseError(`No ${this.entityName} entities were deleted`, 'bulkDelete');
      }
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Failed to bulk delete ${this.entityName} entities`, 'bulkDelete');
    }
  }

  /**
   * Count entities
   */
  async count(): Promise<number> {
    try {
      const [{ total }] = await this.db
        .select({ total: count() })
        .from(this.table);
      
      return total || 0;
    } catch (error) {
      throw new DatabaseError(`Failed to count ${this.entityName} entities`, 'count');
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
      throw new DatabaseError(`Failed to check if ${this.entityName} exists`, 'exists');
    }
  }

  // Helper methods
  protected buildInCondition(column: any, values: any[]) {
    // Build IN condition for bulk operations
    return or(...values.map(value => eq(column, value)));
  }

  protected buildSortConditions(sorts: SortOptions[]) {
    return sorts.map(sort => {
      const column = (this.table as any)[sort.field];
      return sort.direction === 'desc' ? desc(column) : asc(column);
    });
  }

  protected buildFilterConditions(filters: FilterOptions[]) {
    return filters.map(filter => {
      const column = (this.table as any)[filter.field];
      
      switch (filter.operator) {
        case 'eq': return eq(column, filter.value);
        case 'ne': return eq(column, filter.value); // Note: Drizzle doesn't have ne, use not(eq())
        case 'like': return like(column, `%${filter.value}%`);
        default: return eq(column, filter.value);
      }
    });
  }
}