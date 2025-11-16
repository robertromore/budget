import slugify from "@sindresorhus/slugify";
import { db } from "..";
import {
  categoryGroups,
  categoryGroupMemberships,
  type CategoryGroup,
} from "$lib/schema/category-groups";
import { faker } from "@faker-js/faker";
import { sequence } from "./utils/sequence";
import { categoryFactory } from "./categories";

export interface CategoryGroupFactoryOptions {
  categoriesPerGroup?: number;
  withHierarchy?: boolean;
}

/**
 * Creates category group(s) with member categories for a specific workspace
 *
 * Category groups organize categories into logical groupings (e.g., "Housing", "Transportation")
 * Automatically creates and assigns member categories
 *
 * @param workspaceId - The workspace ID (REQUIRED)
 * @param count - Number of groups to create (default: random 3-8)
 * @param options - Configuration options
 * @returns Promise<CategoryGroup[]> - Array of created category groups
 *
 * @example
 * ```typescript
 * // Create groups with 3 categories each
 * const groups = await categoryGroupFactory(workspaceId, 5, {
 *   categoriesPerGroup: 3
 * });
 *
 * // Create groups with default settings
 * const groups = await categoryGroupFactory(workspaceId);
 * ```
 */
export const categoryGroupFactory = async (
  workspaceId: number,
  count: number = faker.number.int({ min: 3, max: 8 }),
  options: CategoryGroupFactoryOptions = {}
): Promise<CategoryGroup[]> => {
  const groups_collection: CategoryGroup[] = [];

  // Realistic category group names
  const groupNames = [
    "Housing & Utilities",
    "Transportation",
    "Food & Dining",
    "Entertainment",
    "Healthcare",
    "Personal Care",
    "Shopping",
    "Travel",
    "Savings & Investments",
    "Debt Payments",
    "Insurance",
    "Education",
    "Gifts & Donations",
    "Business Expenses",
  ];

  // Group colors
  const colors = [
    "#ef4444", // red
    "#f59e0b", // amber
    "#10b981", // green
    "#3b82f6", // blue
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#14b8a6", // teal
    "#f97316", // orange
  ];

  // Group icons
  const icons = [
    "🏠",
    "🚗",
    "🍔",
    "🎬",
    "🏥",
    "💇",
    "🛍️",
    "✈️",
    "💰",
    "💳",
    "🛡️",
    "📚",
    "🎁",
    "💼",
  ];

  const categoriesPerGroup = options.categoriesPerGroup ?? faker.number.int({ min: 2, max: 5 });

  for (let i = 0; i < Math.min(count, groupNames.length); i++) {
    const name = groupNames[i]!;
    const slug = `${slugify(name)}-${sequence("category-group")}`;

    const [group] = await db
      .insert(categoryGroups)
      .values({
        workspaceId,
        name,
        slug,
        description: faker.lorem.sentence(),
        groupIcon: icons[i % icons.length],
        groupColor: colors[i % colors.length],
        sortOrder: i,
      })
      .returning();

    if (!group) {
      throw new Error(`Failed to create category group: ${name}`);
    }

    // Create categories for this group
    const categories = await categoryFactory(workspaceId, categoriesPerGroup);

    // Link categories to group
    for (let j = 0; j < categories.length; j++) {
      await db.insert(categoryGroupMemberships).values({
        categoryGroupId: group.id,
        categoryId: categories[j]!.id,
        sortOrder: j,
      });
    }

    groups_collection.push(group);
  }

  return groups_collection;
};
