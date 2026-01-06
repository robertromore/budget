import {
  monthAnnotations,
  type MonthAnnotation,
  type NewMonthAnnotation,
} from "$lib/schema/month-annotations";
import { db } from "$lib/server/db";
import { BaseRepository } from "$lib/server/shared/database/base-repository";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getCurrentTimestamp } from "$lib/utils/dates";

export interface UpdateAnnotationData {
  note?: string | null | undefined;
  flaggedForReview?: boolean | undefined;
  tags?: string[] | undefined;
}

/**
 * Repository for month annotation database operations
 */
export class AnnotationRepository extends BaseRepository<
  typeof monthAnnotations,
  MonthAnnotation,
  NewMonthAnnotation,
  UpdateAnnotationData
> {
  constructor() {
    super(db, monthAnnotations, "MonthAnnotation");
  }

  /**
   * Create a new annotation
   */
  override async create(
    data: NewMonthAnnotation,
    workspaceId: number
  ): Promise<MonthAnnotation> {
    const [annotation] = await db
      .insert(monthAnnotations)
      .values({ ...data, workspaceId })
      .returning();

    if (!annotation) {
      throw new Error("Failed to create annotation");
    }

    return annotation;
  }

  /**
   * Find annotation by ID with workspace filtering
   */
  override async findById(
    id: number,
    workspaceId: number
  ): Promise<MonthAnnotation | null> {
    const result = await db
      .select()
      .from(monthAnnotations)
      .where(
        and(
          eq(monthAnnotations.id, id),
          eq(monthAnnotations.workspaceId, workspaceId)
        )
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * Find all annotations for a workspace
   */
  async findAllByWorkspace(workspaceId: number): Promise<MonthAnnotation[]> {
    return await db
      .select()
      .from(monthAnnotations)
      .where(eq(monthAnnotations.workspaceId, workspaceId))
      .orderBy(desc(monthAnnotations.month));
  }

  /**
   * Find annotations for specific months
   */
  async findByMonths(
    months: string[],
    workspaceId: number,
    accountId?: number
  ): Promise<MonthAnnotation[]> {
    const conditions = [
      eq(monthAnnotations.workspaceId, workspaceId),
      inArray(monthAnnotations.month, months),
    ];

    if (accountId !== undefined) {
      conditions.push(eq(monthAnnotations.accountId, accountId));
    }

    return await db
      .select()
      .from(monthAnnotations)
      .where(and(...conditions))
      .orderBy(desc(monthAnnotations.month));
  }

  /**
   * Find annotation for a specific month/account/category combination
   */
  async findByContext(
    month: string,
    workspaceId: number,
    accountId?: number,
    categoryId?: number
  ): Promise<MonthAnnotation | null> {
    const conditions = [
      eq(monthAnnotations.month, month),
      eq(monthAnnotations.workspaceId, workspaceId),
    ];

    // Handle accountId - check for specific value or null
    if (accountId !== undefined) {
      conditions.push(eq(monthAnnotations.accountId, accountId));
    }

    // Handle categoryId - check for specific value or null
    if (categoryId !== undefined) {
      conditions.push(eq(monthAnnotations.categoryId, categoryId));
    }

    const result = await db
      .select()
      .from(monthAnnotations)
      .where(and(...conditions))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Find all annotations for an account
   */
  async findByAccount(
    accountId: number,
    workspaceId: number
  ): Promise<MonthAnnotation[]> {
    return await db
      .select()
      .from(monthAnnotations)
      .where(
        and(
          eq(monthAnnotations.accountId, accountId),
          eq(monthAnnotations.workspaceId, workspaceId)
        )
      )
      .orderBy(desc(monthAnnotations.month));
  }

  /**
   * Find all flagged annotations
   */
  async findFlagged(workspaceId: number): Promise<MonthAnnotation[]> {
    return await db
      .select()
      .from(monthAnnotations)
      .where(
        and(
          eq(monthAnnotations.workspaceId, workspaceId),
          eq(monthAnnotations.flaggedForReview, true)
        )
      )
      .orderBy(desc(monthAnnotations.month));
  }

  /**
   * Update an annotation
   */
  override async update(
    id: number,
    data: UpdateAnnotationData,
    workspaceId: number
  ): Promise<MonthAnnotation> {
    const [updated] = await db
      .update(monthAnnotations)
      .set({
        ...data,
        updatedAt: getCurrentTimestamp(),
      })
      .where(
        and(
          eq(monthAnnotations.id, id),
          eq(monthAnnotations.workspaceId, workspaceId)
        )
      )
      .returning();

    if (!updated) {
      throw new Error("Failed to update annotation");
    }

    return updated;
  }

  /**
   * Delete an annotation
   */
  override async delete(id: number, workspaceId: number): Promise<void> {
    await db
      .delete(monthAnnotations)
      .where(
        and(
          eq(monthAnnotations.id, id),
          eq(monthAnnotations.workspaceId, workspaceId)
        )
      );
  }

  /**
   * Upsert annotation - create or update based on context
   */
  async upsert(
    data: {
      month: string;
      accountId?: number;
      categoryId?: number;
      note?: string | null;
      flaggedForReview?: boolean;
      tags?: string[];
    },
    workspaceId: number
  ): Promise<MonthAnnotation> {
    // Check if annotation already exists for this context
    const existing = await this.findByContext(
      data.month,
      workspaceId,
      data.accountId,
      data.categoryId
    );

    if (existing) {
      // Update existing
      return await this.update(
        existing.id,
        {
          note: data.note,
          flaggedForReview: data.flaggedForReview,
          tags: data.tags,
        },
        workspaceId
      );
    } else {
      // Create new
      return await this.create(
        {
          month: data.month,
          accountId: data.accountId ?? null,
          categoryId: data.categoryId ?? null,
          note: data.note ?? null,
          flaggedForReview: data.flaggedForReview ?? false,
          tags: data.tags ?? [],
          workspaceId,
        },
        workspaceId
      );
    }
  }
}
