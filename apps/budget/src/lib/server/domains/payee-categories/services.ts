import type { PayeeCategory } from "$lib/schema/payee-categories";
import { ConflictError, NotFoundError, ValidationError } from "$lib/server/shared/types/errors";
import { InputSanitizer } from "$lib/server/shared/validation";
import { defaultPayeeCategories } from "./default-payee-categories";
import {
  PayeeCategoryRepository,
  type PayeeCategoryWithCounts,
  type UpdatePayeeCategoryData,
} from "./repository";

// ================================================================================
// DTOs
// ================================================================================

export interface CreatePayeeCategoryData {
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

// ================================================================================
// PayeeCategoryService
// ================================================================================

/**
 * Service for payee category business logic
 *
 * Dependencies are injected via constructor for testability.
 * Use ServiceFactory to instantiate in production code.
 */
export class PayeeCategoryService {
  constructor(private repository: PayeeCategoryRepository) {}

  /**
   * Generate a URL-friendly slug from a string
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }

  // ================================================================================
  // READ OPERATIONS
  // ================================================================================

  /**
   * List all payee categories
   */
  async listCategories(workspaceId: number): Promise<PayeeCategory[]> {
    return await this.repository.findAll(workspaceId);
  }

  /**
   * List all payee categories with payee counts
   */
  async listCategoriesWithCounts(workspaceId: number): Promise<PayeeCategoryWithCounts[]> {
    return await this.repository.findAllWithCounts(workspaceId);
  }

  /**
   * Get a payee category by ID
   */
  async getCategoryById(id: number, workspaceId: number): Promise<PayeeCategory> {
    const category = await this.repository.findById(id, workspaceId);
    if (!category) {
      throw new NotFoundError("PayeeCategory", id);
    }
    return category;
  }

  /**
   * Get a payee category by slug
   */
  async getCategoryBySlug(slug: string, workspaceId: number): Promise<PayeeCategory> {
    if (!slug?.trim()) {
      throw new ValidationError("Payee category slug is required");
    }

    const category = await this.repository.findBySlug(slug, workspaceId);
    if (!category) {
      throw new NotFoundError("PayeeCategory", slug);
    }

    return category;
  }

  // ================================================================================
  // WRITE OPERATIONS
  // ================================================================================

  /**
   * Create a new payee category
   */
  async createCategory(data: CreatePayeeCategoryData, workspaceId: number): Promise<PayeeCategory> {
    // Validate and sanitize name
    if (!data.name?.trim()) {
      throw new ValidationError("Payee category name is required");
    }

    const sanitizedName = InputSanitizer.sanitizeName(data.name.trim());
    if (!sanitizedName) {
      throw new ValidationError("Invalid payee category name");
    }

    // Sanitize optional description
    const sanitizedDescription = data.description
      ? InputSanitizer.sanitizeDescription(data.description)
      : null;

    // Check for duplicate name/slug and make both unique if needed
    let uniqueName = sanitizedName;
    let uniqueSlug = this.generateSlug(sanitizedName);
    let attempt = 0;
    const maxAttempts = 100;

    // Keep checking until both name AND slug are unique
    while (attempt < maxAttempts) {
      const [nameExists, slugExists] = await Promise.all([
        this.repository.findByName(uniqueName, workspaceId),
        this.repository.findBySlug(uniqueSlug, workspaceId),
      ]);

      if (!nameExists && !slugExists) {
        break; // Both are unique
      }

      // Append number to make both unique
      attempt++;
      uniqueName = `${sanitizedName} ${attempt}`;
      uniqueSlug = this.generateSlug(uniqueName);
    }

    if (attempt >= maxAttempts) {
      throw new ConflictError(
        `Unable to create unique name/slug for payee category "${sanitizedName}" after ${maxAttempts} attempts`
      );
    }

    // Create the category
    return await this.repository.create({
      workspaceId,
      name: uniqueName,
      slug: uniqueSlug,
      description: sanitizedDescription,
      icon: data.icon ?? null,
      color: data.color ?? null,
      displayOrder: data.displayOrder ?? 0,
      isActive: data.isActive ?? true,
    });
  }

  /**
   * Update a payee category
   */
  async updateCategory(
    id: number,
    data: UpdatePayeeCategoryData,
    workspaceId: number
  ): Promise<PayeeCategory> {
    // Check if category exists
    const existingCategory = await this.repository.findById(id, workspaceId);
    if (!existingCategory) {
      throw new NotFoundError("PayeeCategory", id);
    }

    // Sanitize and validate name if provided
    let sanitizedName: string | undefined;
    let newSlug: string | undefined;

    if (data.name !== undefined) {
      if (!data.name?.trim()) {
        throw new ValidationError("Payee category name cannot be empty");
      }

      sanitizedName = InputSanitizer.sanitizeName(data.name.trim());
      if (!sanitizedName) {
        throw new ValidationError("Invalid payee category name");
      }

      // Check for name conflicts (excluding current category)
      const nameConflict = await this.repository.findByName(sanitizedName, workspaceId);
      if (nameConflict && nameConflict.id !== id) {
        throw new ConflictError(
          `A payee category with name "${sanitizedName}" already exists in this workspace`
        );
      }

      // Generate new slug
      newSlug = this.generateSlug(sanitizedName);

      // Check for slug conflicts (excluding current category)
      const slugConflict = await this.repository.findBySlug(newSlug, workspaceId);
      if (slugConflict && slugConflict.id !== id) {
        throw new ConflictError(
          `A payee category with slug "${newSlug}" already exists in this workspace`
        );
      }
    }

    // Sanitize description if provided
    const sanitizedDescription =
      data.description !== undefined
        ? data.description
          ? InputSanitizer.sanitizeDescription(data.description)
          : null
        : undefined;

    // Update the category
    const updateData: UpdatePayeeCategoryData = {
      ...data,
      name: sanitizedName,
      description: sanitizedDescription,
    };

    // Remove undefined values
    Object.keys(updateData).forEach(
      (key) =>
        updateData[key as keyof UpdatePayeeCategoryData] === undefined &&
        delete updateData[key as keyof UpdatePayeeCategoryData]
    );

    return await this.repository.update(id, updateData, workspaceId);
  }

  /**
   * Delete a payee category
   */
  async deleteCategory(id: number, workspaceId: number): Promise<void> {
    // Check if category exists
    const category = await this.repository.findById(id, workspaceId);
    if (!category) {
      throw new NotFoundError("PayeeCategory", id);
    }

    // Soft delete the category (payees will have their payeeCategoryId set to NULL due to ON DELETE SET NULL)
    await this.repository.softDelete(id, workspaceId);
  }

  /**
   * Reorder payee categories
   */
  async reorderCategories(
    updates: Array<{ id: number; displayOrder: number }>,
    workspaceId: number
  ): Promise<void> {
    // Validate all categories exist
    const categoryIds = updates.map((u) => u.id);
    const validationPromises = categoryIds.map((id) => this.repository.findById(id, workspaceId));
    const categories = await Promise.all(validationPromises);

    const missingIds = categoryIds.filter((id, index) => !categories[index]);
    if (missingIds.length > 0) {
      throw new NotFoundError("PayeeCategory", missingIds[0]);
    }

    // Perform bulk update
    await this.repository.bulkUpdateDisplayOrder(updates, workspaceId);
  }

  // ================================================================================
  // DEFAULT CATEGORIES
  // ================================================================================

  /**
   * Seed default payee categories
   * Only creates categories that don't already exist (by slug)
   * @param slugs - Optional array of slugs to seed. If not provided, seeds all default categories.
   */
  async seedDefaultPayeeCategories(
    workspaceId: number,
    slugs?: string[]
  ): Promise<{
    created: number;
    skipped: number;
    errors: string[];
  }> {
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Filter categories if specific slugs are provided
    const categoriesToSeed = slugs
      ? defaultPayeeCategories.filter((cat) => slugs.includes(cat.slug))
      : defaultPayeeCategories;

    for (const defaultCategory of categoriesToSeed) {
      try {
        // Check if category with this slug already exists
        const existing = await this.repository.findBySlug(defaultCategory.slug, workspaceId);

        if (existing) {
          skipped++;
          continue;
        }

        // Create the category
        await this.repository.create({
          workspaceId,
          name: defaultCategory.name,
          slug: defaultCategory.slug,
          description: defaultCategory.description ?? null,
          icon: defaultCategory.icon ?? null,
          color: defaultCategory.color ?? null,
          displayOrder: defaultCategory.displayOrder ?? 0,
          isActive: defaultCategory.isActive ?? true,
        });

        created++;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        errors.push(`Failed to create "${defaultCategory.name}": ${message}`);
      }
    }

    return { created, skipped, errors };
  }

  /**
   * Get list of available default payee categories (for preview)
   */
  async getAvailableDefaultPayeeCategories(): Promise<typeof defaultPayeeCategories> {
    return defaultPayeeCategories;
  }

  /**
   * Check which default payee categories are already installed
   */
  async getDefaultPayeeCategoriesStatus(workspaceId: number): Promise<{
    total: number;
    installed: number;
    available: number;
    categories: Array<{
      name: string;
      slug: string;
      description: string;
      icon: string | null;
      installed: boolean;
    }>;
  }> {
    const existingCategories = await this.repository.findAll(workspaceId);
    const existingSlugs = new Set(existingCategories.map((c) => c.slug));

    const categories = defaultPayeeCategories.map((dc) => ({
      name: dc.name,
      slug: dc.slug,
      description: dc.description ?? "",
      icon: dc.icon ?? null,
      installed: existingSlugs.has(dc.slug),
    }));

    const installedCount = categories.filter((c) => c.installed).length;

    return {
      total: defaultPayeeCategories.length,
      installed: installedCount,
      available: defaultPayeeCategories.length - installedCount,
      categories,
    };
  }
}
