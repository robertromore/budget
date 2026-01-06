import {
  reportTemplates,
  type ReportTemplate,
  type NewReportTemplate,
  type ReportTemplateType,
} from "$lib/schema/report-templates";
import { db } from "$lib/server/db";
import { BaseRepository } from "$lib/server/shared/database/base-repository";
import { and, desc, eq } from "drizzle-orm";
import { getCurrentTimestamp } from "$lib/utils/dates";

export interface UpdateReportTemplateData {
  name?: string;
  description?: string | null;
  icon?: string | null;
  isDefault?: boolean;
  templateType?: ReportTemplateType;
  config?: ReportTemplate["config"];
}

/**
 * Repository for report template database operations
 */
export class ReportTemplateRepository extends BaseRepository<
  typeof reportTemplates,
  ReportTemplate,
  NewReportTemplate,
  UpdateReportTemplateData
> {
  constructor() {
    super(db, reportTemplates, "ReportTemplate");
  }

  /**
   * Create a new report template
   */
  override async create(
    data: NewReportTemplate,
    workspaceId: number
  ): Promise<ReportTemplate> {
    const [template] = await db
      .insert(reportTemplates)
      .values({ ...data, workspaceId })
      .returning();

    if (!template) {
      throw new Error("Failed to create report template");
    }

    return template;
  }

  /**
   * Find template by ID with workspace filtering
   */
  override async findById(
    id: number,
    workspaceId: number
  ): Promise<ReportTemplate | null> {
    const result = await db
      .select()
      .from(reportTemplates)
      .where(
        and(
          eq(reportTemplates.id, id),
          eq(reportTemplates.workspaceId, workspaceId)
        )
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * Find all templates for a workspace
   */
  async findAllByWorkspace(workspaceId: number): Promise<ReportTemplate[]> {
    return await db
      .select()
      .from(reportTemplates)
      .where(eq(reportTemplates.workspaceId, workspaceId))
      .orderBy(desc(reportTemplates.updatedAt));
  }

  /**
   * Find templates by type
   */
  async findByType(
    templateType: ReportTemplateType,
    workspaceId: number
  ): Promise<ReportTemplate[]> {
    return await db
      .select()
      .from(reportTemplates)
      .where(
        and(
          eq(reportTemplates.workspaceId, workspaceId),
          eq(reportTemplates.templateType, templateType)
        )
      )
      .orderBy(desc(reportTemplates.updatedAt));
  }

  /**
   * Find default template for a workspace
   */
  async findDefault(workspaceId: number): Promise<ReportTemplate | null> {
    const result = await db
      .select()
      .from(reportTemplates)
      .where(
        and(
          eq(reportTemplates.workspaceId, workspaceId),
          eq(reportTemplates.isDefault, true)
        )
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * Update a template
   */
  override async update(
    id: number,
    data: UpdateReportTemplateData,
    workspaceId: number
  ): Promise<ReportTemplate> {
    const [updated] = await db
      .update(reportTemplates)
      .set({
        ...data,
        updatedAt: getCurrentTimestamp(),
      })
      .where(
        and(
          eq(reportTemplates.id, id),
          eq(reportTemplates.workspaceId, workspaceId)
        )
      )
      .returning();

    if (!updated) {
      throw new Error("Failed to update report template");
    }

    return updated;
  }

  /**
   * Delete a template
   */
  override async delete(id: number, workspaceId: number): Promise<void> {
    await db
      .delete(reportTemplates)
      .where(
        and(
          eq(reportTemplates.id, id),
          eq(reportTemplates.workspaceId, workspaceId)
        )
      );
  }

  /**
   * Set a template as default (and unset others)
   */
  async setDefault(id: number, workspaceId: number): Promise<ReportTemplate> {
    // First, unset any existing defaults
    await db
      .update(reportTemplates)
      .set({ isDefault: false, updatedAt: getCurrentTimestamp() })
      .where(
        and(
          eq(reportTemplates.workspaceId, workspaceId),
          eq(reportTemplates.isDefault, true)
        )
      );

    // Then set the new default
    return await this.update(id, { isDefault: true }, workspaceId);
  }

  /**
   * Record usage of a template
   */
  async recordUsage(id: number, workspaceId: number): Promise<void> {
    const template = await this.findById(id, workspaceId);
    if (!template) return;

    await db
      .update(reportTemplates)
      .set({
        useCount: (template.useCount ?? 0) + 1,
        lastUsedAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
      })
      .where(
        and(
          eq(reportTemplates.id, id),
          eq(reportTemplates.workspaceId, workspaceId)
        )
      );
  }
}
