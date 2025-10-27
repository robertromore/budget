import type { Category } from "$lib/schema/categories";
import type { CategoryGroup, NewCategoryGroup } from "$lib/schema/category-groups";
import { categoryGroupMemberships, categoryGroupRecommendations } from "$lib/schema/category-groups";
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
	async listGroupsWithCounts(): Promise<CategoryGroupWithCounts[]> {
		return await this.groupRepository.findAllWithCounts();
	}

	/**
	 * Get a group by slug
	 */
	async getGroupBySlug(slug: string): Promise<CategoryGroup> {
		if (!slug?.trim()) {
			throw new ValidationError("Category group slug is required");
		}

		const group = await this.groupRepository.findBySlug(slug);
		if (!group) {
			throw new NotFoundError("CategoryGroup", slug);
		}

		return group;
	}

	/**
	 * Get a group with all its member categories
	 */
	async getGroupWithCategories(slug: string): Promise<CategoryGroupWithCategories> {
		const group = await this.groupRepository.findBySlugWithCategories(slug);
		if (!group) {
			throw new NotFoundError("CategoryGroup", slug);
		}

		return group;
	}

	/**
	 * Get all categories for a group
	 */
	async getCategoriesForGroup(groupId: number): Promise<Category[]> {
		// Validate group exists
		const group = await this.groupRepository.findById(groupId);
		if (!group) {
			throw new NotFoundError("CategoryGroup", groupId);
		}

		return await this.membershipRepository.findCategoriesForGroup(groupId);
	}

	// ================================================================================
	// WRITE OPERATIONS
	// ================================================================================

	/**
	 * Create a new category group
	 */
	async createGroup(data: CreateCategoryGroupData): Promise<CategoryGroup> {
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

		// Generate unique slug with retry logic for race conditions
		let baseSlug = this.generateSlug(sanitizedName);
		let slug = baseSlug;
		let counter = 1;
		const maxRetries = 10;
		let retries = 0;

		while (retries < maxRetries) {
			// Check if slug exists
			const existing = await this.groupRepository.findBySlug(slug);
			if (existing) {
				// Slug already exists, try next one
				slug = `${baseSlug}-${counter}`;
				counter++;
				continue;
			}

			// Try to create with this slug
			const newGroup: NewCategoryGroup = {
				name: sanitizedName,
				slug,
				description: sanitizedDescription,
				groupIcon: data.groupIcon ?? null,
				groupColor: data.groupColor ?? null,
				sortOrder: data.sortOrder ?? 0,
			};

			try {
				return await this.groupRepository.create(newGroup);
			} catch (error: any) {
				// Check if it's a UNIQUE constraint error
				const isUniqueConstraint =
					error?.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
					error?.errno === 2067 ||
					error?.message?.includes('UNIQUE constraint failed');

				if (isUniqueConstraint) {
					// Check if it's a name conflict vs slug conflict
					const isNameConflict = error?.message?.includes('category_groups_name_unique') ||
						error?.message?.includes('UNIQUE constraint failed: category_groups.name');

					if (isNameConflict) {
						// A group with this name already exists (race condition)
						// Find and return it instead of retrying
						const existing = await this.groupRepository.findBySlug(baseSlug);
						if (existing) {
							return existing;
						}
						// If not found by slug, search by name
						// This shouldn't happen, but handle it gracefully
						throw error;
					} else {
						// Slug conflict - try next slug
						slug = `${baseSlug}-${counter}`;
						counter++;
						retries++;
						continue;
					}
				}
				// Different error, rethrow
				throw error;
			}
		}

		throw new ValidationError(`Failed to generate unique slug after ${maxRetries} attempts`);
	}

	/**
	 * Update a category group
	 */
	async updateGroup(id: number, data: UpdateCategoryGroupData): Promise<CategoryGroup> {
		// Check group exists
		const existing = await this.groupRepository.findById(id);
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

				while (await this.groupRepository.findBySlug(slug)) {
					slug = `${baseSlug}-${counter}`;
					counter++;
				}

				// Note: slug is not in UpdateCategoryGroupData type, need to cast
				(updates as any).slug = slug;
			}
		}

		if (data.description !== undefined) {
			updates.description = data.description ? InputSanitizer.sanitizeDescription(data.description) : null;
		}

		if (data.groupIcon !== undefined) updates.groupIcon = data.groupIcon;
		if (data.groupColor !== undefined) updates.groupColor = data.groupColor;
		if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder;

		return await this.groupRepository.update(id, updates);
	}

	/**
	 * Delete a category group
	 */
	async deleteGroup(id: number): Promise<void> {
		// Check group exists
		const group = await this.groupRepository.findById(id);
		if (!group) {
			throw new NotFoundError("CategoryGroup", id);
		}

		// Manually delete memberships (foreign key constraints might not be enabled)
		await db.delete(categoryGroupMemberships).where(eq(categoryGroupMemberships.categoryGroupId, id));

		// Manually delete related recommendations
		await db
			.delete(categoryGroupRecommendations)
			.where(eq(categoryGroupRecommendations.suggestedGroupId, id));

		// Delete the group
		await this.groupRepository.delete(id);
	}

	/**
	 * Add categories to a group
	 */
	async addCategoriesToGroup(groupId: number, categoryIds: number[]): Promise<void> {
		// Validate group exists
		const group = await this.groupRepository.findById(groupId);
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
	async moveCategoryToGroup(categoryId: number, newGroupId: number): Promise<void> {
		// Validate new group exists
		const group = await this.groupRepository.findById(newGroupId);
		if (!group) {
			throw new NotFoundError("CategoryGroup", newGroupId);
		}

		// Move category (this removes from old group and adds to new)
		await this.membershipRepository.moveCategoryToGroup(categoryId, newGroupId, 0);
	}

	/**
	 * Reorder groups
	 */
	async reorderGroups(updates: Array<{id: number; sortOrder: number}>): Promise<void> {
		await db.transaction(async (tx) => {
			for (const {id, sortOrder} of updates) {
				await this.groupRepository.update(id, {sortOrder});
			}
		});
	}

	/**
	 * Reorder categories within a group
	 */
	async reorderCategoriesInGroup(updates: Array<{categoryId: number; sortOrder: number}>): Promise<void> {
		await this.membershipRepository.updateSortOrders(updates);
	}
}
