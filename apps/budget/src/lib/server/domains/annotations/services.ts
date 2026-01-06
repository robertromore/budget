import type { MonthAnnotation } from "$lib/schema/month-annotations";
import { NotFoundError, ValidationError } from "$lib/server/shared/types/errors";
import {
  AnnotationRepository,
  type UpdateAnnotationData,
} from "./repository";

export interface CreateAnnotationData {
  month: string;
  accountId?: number;
  categoryId?: number;
  note?: string | null;
  flaggedForReview?: boolean;
  tags?: string[];
}

export interface BulkCreateAnnotationData {
  months: string[];
  accountId?: number;
  categoryId?: number;
  note?: string | null;
  flaggedForReview?: boolean;
  tags?: string[];
}

/**
 * Service for annotation business logic
 */
export class AnnotationService {
  constructor(private repository: AnnotationRepository) {}

  /**
   * Create or update an annotation
   */
  async createOrUpdateAnnotation(
    data: CreateAnnotationData,
    workspaceId: number
  ): Promise<MonthAnnotation> {
    // Validate month format
    if (!data.month || !/^\d{4}-\d{2}$/.test(data.month)) {
      throw new ValidationError("Month must be in YYYY-MM format");
    }

    // Validate note length
    if (data.note && data.note.length > 500) {
      throw new ValidationError("Note cannot exceed 500 characters");
    }

    // Validate tags
    if (data.tags && data.tags.length > 10) {
      throw new ValidationError("Cannot have more than 10 tags");
    }

    return await this.repository.upsert(data, workspaceId);
  }

  /**
   * Create annotations for multiple months at once
   */
  async createBulkAnnotations(
    data: BulkCreateAnnotationData,
    workspaceId: number
  ): Promise<MonthAnnotation[]> {
    // Validate all months
    for (const month of data.months) {
      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        throw new ValidationError(`Invalid month format: ${month}`);
      }
    }

    // Validate note length
    if (data.note && data.note.length > 500) {
      throw new ValidationError("Note cannot exceed 500 characters");
    }

    // Create/update annotation for each month
    const annotations: MonthAnnotation[] = [];
    for (const month of data.months) {
      const annotation = await this.repository.upsert(
        {
          month,
          accountId: data.accountId,
          categoryId: data.categoryId,
          note: data.note,
          flaggedForReview: data.flaggedForReview,
          tags: data.tags,
        },
        workspaceId
      );
      annotations.push(annotation);
    }

    return annotations;
  }

  /**
   * Get all annotations for a workspace
   */
  async getAnnotations(workspaceId: number): Promise<MonthAnnotation[]> {
    return await this.repository.findAllByWorkspace(workspaceId);
  }

  /**
   * Get annotations for specific months
   */
  async getAnnotationsForMonths(
    months: string[],
    workspaceId: number,
    accountId?: number
  ): Promise<MonthAnnotation[]> {
    return await this.repository.findByMonths(months, workspaceId, accountId);
  }

  /**
   * Get an annotation by ID
   */
  async getAnnotationById(
    id: number,
    workspaceId: number
  ): Promise<MonthAnnotation> {
    const annotation = await this.repository.findById(id, workspaceId);
    if (!annotation) {
      throw new NotFoundError("MonthAnnotation", id);
    }
    return annotation;
  }

  /**
   * Get annotations for an account
   */
  async getAnnotationsForAccount(
    accountId: number,
    workspaceId: number
  ): Promise<MonthAnnotation[]> {
    return await this.repository.findByAccount(accountId, workspaceId);
  }

  /**
   * Get all flagged annotations
   */
  async getFlaggedAnnotations(workspaceId: number): Promise<MonthAnnotation[]> {
    return await this.repository.findFlagged(workspaceId);
  }

  /**
   * Update an annotation
   */
  async updateAnnotation(
    id: number,
    data: UpdateAnnotationData,
    workspaceId: number
  ): Promise<MonthAnnotation> {
    // Verify annotation exists
    await this.getAnnotationById(id, workspaceId);

    // Validate note length
    if (data.note && data.note.length > 500) {
      throw new ValidationError("Note cannot exceed 500 characters");
    }

    // Validate tags
    if (data.tags && data.tags.length > 10) {
      throw new ValidationError("Cannot have more than 10 tags");
    }

    return await this.repository.update(id, data, workspaceId);
  }

  /**
   * Delete an annotation
   */
  async deleteAnnotation(id: number, workspaceId: number): Promise<void> {
    // Verify annotation exists
    await this.getAnnotationById(id, workspaceId);
    await this.repository.delete(id, workspaceId);
  }

  /**
   * Toggle flag status on an annotation
   */
  async toggleFlag(id: number, workspaceId: number): Promise<MonthAnnotation> {
    const annotation = await this.getAnnotationById(id, workspaceId);
    return await this.repository.update(
      id,
      { flaggedForReview: !annotation.flaggedForReview },
      workspaceId
    );
  }

  /**
   * Quick flag a month (creates minimal annotation with just flag set)
   */
  async quickFlag(
    month: string,
    workspaceId: number,
    accountId?: number
  ): Promise<MonthAnnotation> {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      throw new ValidationError("Month must be in YYYY-MM format");
    }

    return await this.repository.upsert(
      {
        month,
        accountId,
        flaggedForReview: true,
      },
      workspaceId
    );
  }
}
