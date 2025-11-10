import type {PayeeCategory} from "$lib/schema/payee-categories";
import {payeeCategories} from "$lib/schema/payee-categories";
import {payees} from "$lib/schema/payees";
import {db} from "$lib/server/db";
import {and, count, eq, isNull} from "drizzle-orm";

// ================================================================================
// Types
// ================================================================================

export interface PayeeCategoryWithCounts extends PayeeCategory {
  payeeCount: number;
}

export interface UpdatePayeeCategoryData {
  name?: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

// ================================================================================
// PayeeCategoryRepository
// ================================================================================

/**
 * Repository for payee category data access
 *
 * Handles all database operations for payee categories
 */
export class PayeeCategoryRepository {
  /**
   * Find all payee categories for a workspace
   */
  async findAll(workspaceId: number): Promise<PayeeCategory[]> {
    return await db
      .select()
      .from(payeeCategories)
      .where(
        and(
          eq(payeeCategories.workspaceId, workspaceId),
          isNull(payeeCategories.deletedAt)
        )
      )
      .orderBy(payeeCategories.displayOrder, payeeCategories.name);
  }

  /**
   * Find all payee categories with payee counts
   */
  async findAllWithCounts(workspaceId: number): Promise<PayeeCategoryWithCounts[]> {
    const categories = await db
      .select({
        id: payeeCategories.id,
        workspaceId: payeeCategories.workspaceId,
        name: payeeCategories.name,
        slug: payeeCategories.slug,
        description: payeeCategories.description,
        icon: payeeCategories.icon,
        color: payeeCategories.color,
        displayOrder: payeeCategories.displayOrder,
        isActive: payeeCategories.isActive,
        dateCreated: payeeCategories.dateCreated,
        createdAt: payeeCategories.createdAt,
        updatedAt: payeeCategories.updatedAt,
        deletedAt: payeeCategories.deletedAt,
        payeeCount: count(payees.id),
      })
      .from(payeeCategories)
      .leftJoin(
        payees,
        and(
          eq(payees.payeeCategoryId, payeeCategories.id),
          isNull(payees.deletedAt)
        )
      )
      .where(
        and(
          eq(payeeCategories.workspaceId, workspaceId),
          isNull(payeeCategories.deletedAt)
        )
      )
      .groupBy(payeeCategories.id)
      .orderBy(payeeCategories.displayOrder, payeeCategories.name);

    return categories as PayeeCategoryWithCounts[];
  }

  /**
   * Find a payee category by ID
   */
  async findById(id: number, workspaceId: number): Promise<PayeeCategory | null> {
    const [category] = await db
      .select()
      .from(payeeCategories)
      .where(
        and(
          eq(payeeCategories.id, id),
          eq(payeeCategories.workspaceId, workspaceId),
          isNull(payeeCategories.deletedAt)
        )
      );

    return category || null;
  }

  /**
   * Find a payee category by slug
   */
  async findBySlug(slug: string, workspaceId: number): Promise<PayeeCategory | null> {
    const [category] = await db
      .select()
      .from(payeeCategories)
      .where(
        and(
          eq(payeeCategories.slug, slug),
          eq(payeeCategories.workspaceId, workspaceId),
          isNull(payeeCategories.deletedAt)
        )
      );

    return category || null;
  }

  /**
   * Find a payee category by name
   */
  async findByName(name: string, workspaceId: number): Promise<PayeeCategory | null> {
    const [category] = await db
      .select()
      .from(payeeCategories)
      .where(
        and(
          eq(payeeCategories.name, name),
          eq(payeeCategories.workspaceId, workspaceId),
          isNull(payeeCategories.deletedAt)
        )
      );

    return category || null;
  }

  /**
   * Create a new payee category
   */
  async create(data: {
    workspaceId: number;
    name: string;
    slug: string;
    description?: string | null;
    icon?: string | null;
    color?: string | null;
    displayOrder?: number;
    isActive?: boolean;
  }): Promise<PayeeCategory> {
    const [category] = await db
      .insert(payeeCategories)
      .values({
        workspaceId: data.workspaceId,
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        icon: data.icon ?? null,
        color: data.color ?? null,
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive ?? true,
      })
      .returning();

    return category;
  }

  /**
   * Update a payee category
   */
  async update(
    id: number,
    data: UpdatePayeeCategoryData,
    workspaceId: number
  ): Promise<PayeeCategory> {
    const [updated] = await db
      .update(payeeCategories)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(payeeCategories.id, id),
          eq(payeeCategories.workspaceId, workspaceId),
          isNull(payeeCategories.deletedAt)
        )
      )
      .returning();

    return updated;
  }

  /**
   * Soft delete a payee category
   */
  async softDelete(id: number, workspaceId: number): Promise<void> {
    await db
      .update(payeeCategories)
      .set({
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(payeeCategories.id, id),
          eq(payeeCategories.workspaceId, workspaceId)
        )
      );
  }

  /**
   * Bulk update display orders
   */
  async bulkUpdateDisplayOrder(
    updates: Array<{id: number; displayOrder: number}>,
    workspaceId: number
  ): Promise<void> {
    // Use a transaction to ensure all updates succeed or none do
    await db.transaction(async (tx) => {
      for (const {id, displayOrder} of updates) {
        await tx
          .update(payeeCategories)
          .set({
            displayOrder,
            updatedAt: new Date().toISOString(),
          })
          .where(
            and(
              eq(payeeCategories.id, id),
              eq(payeeCategories.workspaceId, workspaceId),
              isNull(payeeCategories.deletedAt)
            )
          );
      }
    });
  }
}
