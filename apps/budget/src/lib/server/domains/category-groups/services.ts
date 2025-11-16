import type { Category } from "$lib/schema/categories";
import type { CategoryGroup, NewCategoryGroup } from "$lib/schema/category-groups";
import {
  categoryGroupMemberships,
  categoryGroupRecommendations,
} from "$lib/schema/category-groups";
import { db } from "$lib/server/db";
import { ConflictError, NotFoundError, ValidationError } from "$lib/server/shared/types/errors";
import { InputSanitizer } from "$lib/server/shared/validation";
import { eq, inArray } from "drizzle-orm";
import {
  CategoryGroupMembershipRepository,
  CategoryGroupRepository,
  type CategoryGroupWithCategories,
  type CategoryGroupWithCounts,
  type UpdateCategoryGroupData,
} from "./repository";

// ================================================================================
// DTOs
// ================================================================================

export interface CreateCategoryGroupData {
  name: string;
  description?: string | null;
  groupIcon?: string | null;
  groupColor?: string | null;
  sortOrder?: number;
}

// ================================================================================
// CategoryGroupService
// ================================================================================

/**
 * Service for category group business logic
 *
 * Dependencies are injected via constructor for testability.
 * Use ServiceFactory to instantiate in production code.
 */
export class CategoryGroupService {
  constructor(
    private groupRepository: CategoryGroupRepository,
    private membershipRepository: CategoryGroupMembershipRepository
  ) {}

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
   * List all groups with member counts and pending recommendation counts
   */
  async listGroupsWithCounts(workspaceId: number): Promise<CategoryGroupWithCounts[]> {
    return await this.groupRepository.findAllWithCounts(workspaceId);
  }

  /**
   * Get a group by slug
   */
  async getGroupBySlug(slug: string, workspaceId: number): Promise<CategoryGroup> {
    if (!slug?.trim()) {
      throw new ValidationError("Category group slug is required");
    }

    const group = await this.groupRepository.findBySlug(slug, workspaceId);
    if (!group) {
      throw new NotFoundError("CategoryGroup", slug);
    }

    return group;
  }

  /**
   * Get a group with all its member categories
   */
  async getGroupWithCategories(
    slug: string,
    workspaceId: number
  ): Promise<CategoryGroupWithCategories> {
    const group = await this.groupRepository.findBySlugWithCategories(slug, workspaceId);
    if (!group) {
      throw new NotFoundError("CategoryGroup", slug);
    }

    return group;
  }

  /**
   * Get all categories for a group
   */
  async getCategoriesForGroup(groupId: number, workspaceId: number): Promise<Category[]> {
    // Validate group exists
    const group = await this.groupRepository.findById(groupId, workspaceId);
    if (!group) {
      throw new NotFoundError("CategoryGroup", groupId);
    }

    return await this.membershipRepository.findCategoriesForGroup(groupId, workspaceId);
  }

  // ================================================================================
  // WRITE OPERATIONS
  // ================================================================================

  /**
   * Create a new category group
   */
  async createGroup(data: CreateCategoryGroupData, workspaceId: number): Promise<CategoryGroup> {
    // Validate and sanitize name
    if (!data.name?.trim()) {
      throw new ValidationError("Category group name is required");
    }

    const sanitizedName = InputSanitizer.sanitizeName(data.name.trim());
    if (!sanitizedName) {
      throw new ValidationError("Invalid category group name");
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
        this.groupRepository.findByName(uniqueName, workspaceId),
        this.groupRepository.findBySlug(uniqueSlug, workspaceId),
      ]);

      if (!nameExists && !slugExists) {
        break; // Both are unique
      }

      // Append number to make both unique
      attempt++;
      uniqueName = `${sanitizedName} ${attempt}`;
      uniqueSlug = `${this.generateSlug(sanitizedName)}-${attempt}`;
    }

    if (attempt >= maxAttempts) {
      throw new ConflictError(`Failed to generate unique name/slug after ${maxAttempts} attempts`);
    }

    const newGroup: NewCategoryGroup = {
      name: uniqueName,
      slug: uniqueSlug,
      description: sanitizedDescription,
      groupIcon: data.groupIcon ?? null,
      groupColor: data.groupColor ?? null,
      sortOrder: data.sortOrder ?? 0,
    };

    return await this.groupRepository.create(newGroup, workspaceId);
  }

  /**
   * Update a category group
   */
  async updateGroup(
    id: number,
    data: UpdateCategoryGroupData,
    workspaceId: number
  ): Promise<CategoryGroup> {
    // Check group exists
    const existing = await this.groupRepository.findById(id, workspaceId);
    if (!existing) {
      throw new NotFoundError("CategoryGroup", id);
    }

    // Build update object with sanitized values
    const updates: UpdateCategoryGroupData = {};

    if (data.name !== undefined) {
      const sanitizedName = InputSanitizer.sanitizeName(data.name.trim());
      if (!sanitizedName) {
        throw new ValidationError("Invalid category group name");
      }
      updates.name = sanitizedName;

      // Regenerate slug if name changed
      if (sanitizedName !== existing.name) {
        let baseSlug = this.generateSlug(sanitizedName);
        let slug = baseSlug;
        let counter = 1;

        while (await this.groupRepository.findBySlug(slug, workspaceId)) {
          slug = `${baseSlug}-${counter}`;
          counter++;
        }

        // Note: slug is not in UpdateCategoryGroupData type, need to cast
        (updates as any).slug = slug;
      }
    }

    if (data.description !== undefined) {
      updates.description = data.description
        ? InputSanitizer.sanitizeDescription(data.description)
        : null;
    }

    if (data.groupIcon !== undefined) updates.groupIcon = data.groupIcon;
    if (data.groupColor !== undefined) updates.groupColor = data.groupColor;
    if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder;

    return await this.groupRepository.update(id, updates, workspaceId);
  }

  /**
   * Delete a category group
   */
  async deleteGroup(id: number, workspaceId: number): Promise<void> {
    // Check group exists
    const group = await this.groupRepository.findById(id, workspaceId);
    if (!group) {
      throw new NotFoundError("CategoryGroup", id);
    }

    // Manually delete memberships (foreign key constraints might not be enabled)
    await db
      .delete(categoryGroupMemberships)
      .where(eq(categoryGroupMemberships.categoryGroupId, id));

    // Manually delete related recommendations
    await db
      .delete(categoryGroupRecommendations)
      .where(eq(categoryGroupRecommendations.suggestedGroupId, id));

    // Delete the group
    await this.groupRepository.delete(id, workspaceId);
  }

  /**
   * Add categories to a group
   */
  async addCategoriesToGroup(
    groupId: number,
    categoryIds: number[],
    workspaceId: number
  ): Promise<void> {
    // Validate group exists
    const group = await this.groupRepository.findById(groupId, workspaceId);
    if (!group) {
      throw new NotFoundError("CategoryGroup", groupId);
    }

    if (categoryIds.length === 0) {
      return; // Nothing to add
    }

    // Check if any categories are already in ANY group (due to unique constraint)
    const existingMemberships = await db
      .select()
      .from(categoryGroupMemberships)
      .where(inArray(categoryGroupMemberships.categoryId, categoryIds));

    if (existingMemberships.length > 0) {
      const conflictIds = existingMemberships.map((m) => m.categoryId).join(", ");
      throw new ConflictError(
        `Categories already in groups: ${conflictIds}. Remove them from their current groups first.`
      );
    }

    // Add categories to the group
    for (let i = 0; i < categoryIds.length; i++) {
      const categoryId = categoryIds[i];
      if (categoryId !== undefined) {
        await this.membershipRepository.addCategoryToGroup(categoryId, groupId, i);
      }
    }
  }

  /**
   * Remove a category from its group
   */
  async removeCategoryFromGroup(categoryId: number): Promise<void> {
    await this.membershipRepository.removeCategoryFromGroup(categoryId);
  }

  /**
   * Move a category to a different group
   */
  async moveCategoryToGroup(
    categoryId: number,
    newGroupId: number,
    workspaceId: number
  ): Promise<void> {
    // Validate new group exists
    const group = await this.groupRepository.findById(newGroupId, workspaceId);
    if (!group) {
      throw new NotFoundError("CategoryGroup", newGroupId);
    }

    // Move category (this removes from old group and adds to new)
    await this.membershipRepository.moveCategoryToGroup(categoryId, newGroupId, 0);
  }

  /**
   * Reorder groups
   */
  async reorderGroups(
    updates: Array<{ id: number; sortOrder: number }>,
    workspaceId: number
  ): Promise<void> {
    await db.transaction(async (tx) => {
      for (const { id, sortOrder } of updates) {
        await this.groupRepository.update(id, { sortOrder }, workspaceId);
      }
    });
  }

  /**
   * Reorder categories within a group
   */
  async reorderCategoriesInGroup(
    updates: Array<{ categoryId: number; sortOrder: number }>
  ): Promise<void> {
    await this.membershipRepository.updateSortOrders(updates);
  }
}
