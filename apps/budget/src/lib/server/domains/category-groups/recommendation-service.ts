import {categories, categoryGroupMemberships, categoryGroups} from "$lib/schema";
import type {Category} from "$lib/schema/categories";
import type {
  CategoryGroupRecommendation,
  NewCategoryGroupRecommendation,
} from "$lib/schema/category-groups";
import {db} from "$lib/server/db";
import {CategoryRepository} from "$lib/server/domains/categories/repository";
import {NotFoundError, ValidationError} from "$lib/server/shared/types/errors";
import {and, eq, isNull} from "drizzle-orm";
import {
  CategoryGroupMembershipRepository,
  CategoryGroupRecommendationRepository,
  CategoryGroupRepository,
  CategoryGroupSettingsRepository,
} from "./repository";
import {CategoryGroupService} from "./services";

// ================================================================================
// HELPERS
// ================================================================================

/**
 * Get default icon and color for a group based on its name
 */
function getDefaultGroupAppearance(groupName: string): {icon: string; color: string} {
  const defaults: Record<string, {icon: string; color: string}> = {
    "Food & Dining": {icon: "utensils", color: "#f97316"}, // orange
    Transportation: {icon: "car", color: "#3b82f6"}, // blue
    Housing: {icon: "home", color: "#8b5cf6"}, // purple
    Utilities: {icon: "zap", color: "#eab308"}, // yellow
    Entertainment: {icon: "film", color: "#ec4899"}, // pink
    Clothing: {icon: "shirt", color: "#6366f1"}, // indigo
    Healthcare: {icon: "heart-pulse", color: "#ef4444"}, // red
    Insurance: {icon: "shield", color: "#0891b2"}, // cyan
    "Fitness & Recreation": {icon: "dumbbell", color: "#10b981"}, // green
    Education: {icon: "graduation-cap", color: "#0ea5e9"}, // sky
    Travel: {icon: "plane", color: "#06b6d4"}, // cyan
    "Gifts & Donations": {icon: "gift", color: "#d946ef"}, // fuchsia
    "Home & Garden": {icon: "flower", color: "#84cc16"}, // lime
    Pets: {icon: "paw-print", color: "#f59e0b"}, // amber
    "Fees & Taxes": {icon: "receipt", color: "#64748b"}, // slate
    Income: {icon: "trending-up", color: "#22c55e"}, // green
    "Additional Income": {icon: "coins", color: "#10b981"}, // emerald
    "Investment Income": {icon: "chart-line", color: "#14b8a6"}, // teal
    Savings: {icon: "piggy-bank", color: "#8b5cf6"}, // purple
    Retirement: {icon: "landmark", color: "#6366f1"}, // indigo
  };

  // Try exact match first
  const exactMatch = defaults[groupName];
  if (exactMatch) {
    return exactMatch;
  }

  // Try case-insensitive match
  const lowerName = groupName.toLowerCase();
  for (const [key, value] of Object.entries(defaults)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }

  // Default fallback
  return {icon: "folder", color: "#6b7280"}; // gray
}

// ================================================================================
// CategoryGroupRecommendationService
// ================================================================================

/**
 * Service for category group recommendation business logic
 */
export class CategoryGroupRecommendationService {
  constructor(
    private recommendationRepository: CategoryGroupRecommendationRepository,
    private groupRepository: CategoryGroupRepository,
    private categoryRepository: CategoryRepository,
    private settingsRepository: CategoryGroupSettingsRepository
  ) {}

  // ================================================================================
  // READ OPERATIONS
  // ================================================================================

  /**
   * Get all pending recommendations
   */
  async getPendingRecommendations(): Promise<CategoryGroupRecommendation[]> {
    return await this.recommendationRepository.findPending();
  }

  /**
   * Get ungrouped categories (categories not in any group)
   */
  private async getUngroupedCategories(): Promise<Category[]> {
    // Find all active categories that are NOT in any group
    const ungrouped = await db
      .select()
      .from(categories)
      .leftJoin(categoryGroupMemberships, eq(categories.id, categoryGroupMemberships.categoryId))
      .where(
        and(
          eq(categories.isActive, true),
          isNull(categoryGroupMemberships.id),
          isNull(categories.deletedAt)
        )
      );

    return ungrouped.map((row) => row.categories);
  }

  // ================================================================================
  // WRITE OPERATIONS
  // ================================================================================

  /**
   * Generate recommendations for ungrouped categories using rule-based patterns
   */
  async generateRecommendations(): Promise<CategoryGroupRecommendation[]> {
    // Check if recommendations are enabled
    const settings = await this.settingsRepository.getSettings();
    if (!settings.recommendationsEnabled) {
      throw new ValidationError("Recommendations are disabled");
    }

    // Clear old pending recommendations
    const oldPending = await this.recommendationRepository.findPending();
    for (const rec of oldPending) {
      await this.recommendationRepository.delete(rec.id);
    }

    // Fetch ungrouped categories
    const ungroupedCategories = await this.getUngroupedCategories();
    if (ungroupedCategories.length === 0) {
      return []; // No categories to process
    }

    // Fetch all existing groups
    const existingGroups = await db.select().from(categoryGroups);

    // Define grouping rules
    const groupingRules = [
      // Insurance (check this first before more specific patterns)
      {
        pattern: /\b(car|auto|vehicle)\s+insurance\b/i,
        groupName: "Transportation",
        confidence: 0.95,
      },
      {
        pattern: /\b(home|house|property|homeowner)\s+insurance\b/i,
        groupName: "Housing",
        confidence: 0.95,
      },
      {
        pattern: /\b(life|term)\s+insurance\b/i,
        groupName: "Insurance",
        confidence: 0.95,
      },
      {
        pattern: /\b(health|medical|dental)\s+insurance\b/i,
        groupName: "Healthcare",
        confidence: 0.95,
      },

      // Common expense categories
      {
        pattern: /\b(groceries?|food|meal|restaurant|dining|cafe|coffee)\b/i,
        groupName: "Food & Dining",
        confidence: 0.9,
      },
      {
        pattern: /\b(gas|fuel|car|auto|vehicle|parking|toll|uber|lyft|taxi)\b/i,
        groupName: "Transportation",
        confidence: 0.85,
      },
      {
        pattern: /\b(rent|mortgage|hoa|property|landlord)\b/i,
        groupName: "Housing",
        confidence: 0.95,
      },
      {
        pattern: /\b(electric|gas|water|sewer|trash|internet|cable|phone|mobile)\b/i,
        groupName: "Utilities",
        confidence: 0.9,
      },
      {
        pattern: /\b(entertainment|movie|concert|game|streaming|netflix|spotify)\b/i,
        groupName: "Entertainment",
        confidence: 0.85,
      },
      {
        pattern: /\b(clothing|clothes|apparel|shoes|fashion)\b/i,
        groupName: "Clothing",
        confidence: 0.85,
      },
      {
        pattern: /\b(health|medical|doctor|pharmacy|prescription|dental)\b/i,
        groupName: "Healthcare",
        confidence: 0.9,
      },
      {
        pattern: /\b(fitness|gym|yoga|sport|exercise)\b/i,
        groupName: "Fitness & Recreation",
        confidence: 0.85,
      },
      {
        pattern: /\b(education|tuition|school|books|course|class)\b/i,
        groupName: "Education",
        confidence: 0.9,
      },
      {
        pattern: /\b(travel|vacation|hotel|flight|airfare)\b/i,
        groupName: "Travel",
        confidence: 0.85,
      },
      {
        pattern: /\b(gift|donation|charity)\b/i,
        groupName: "Gifts & Donations",
        confidence: 0.85,
      },
      {
        pattern: /\b(home|house|furniture|appliance|repair|maintenance)\b/i,
        groupName: "Home & Garden",
        confidence: 0.8,
      },
      {pattern: /\b(pet|dog|cat|vet|veterinary)\b/i, groupName: "Pets", confidence: 0.9},
      {pattern: /\b(tax|fee|fine|penalty)\b/i, groupName: "Fees & Taxes", confidence: 0.85},

      // Income categories
      {
        pattern: /\b(salary|wage|paycheck|income|pay)\b/i,
        groupName: "Income",
        confidence: 0.95,
      },
      {
        pattern: /\b(bonus|commission|tip|tips)\b/i,
        groupName: "Additional Income",
        confidence: 0.85,
      },
      {
        pattern: /\b(interest|dividend|investment|return)\b/i,
        groupName: "Investment Income",
        confidence: 0.9,
      },

      // Savings categories
      {pattern: /\b(saving|savings|emergency|fund)\b/i, groupName: "Savings", confidence: 0.9},
      {
        pattern: /\b(retirement|401k|ira|pension)\b/i,
        groupName: "Retirement",
        confidence: 0.95,
      },
    ];

    // Apply rules to each ungrouped category
    const recommendations: NewCategoryGroupRecommendation[] = [];

    for (const category of ungroupedCategories) {
      let bestMatch: {groupName: string; confidence: number; reasoning: string} | null = null;

      const catName = (category as any).name || "";
      const catId = (category as any).id;

      // Try to match against existing groups first (higher confidence)
      for (const group of existingGroups) {
        const groupName = (group as any).name;
        const nameMatch =
          catName.toLowerCase().includes(groupName.toLowerCase()) ||
          groupName.toLowerCase().includes(catName.toLowerCase());

        if (nameMatch) {
          bestMatch = {
            groupName: groupName,
            confidence: 0.95,
            reasoning: `Category name closely matches existing group "${groupName}"`,
          };
          break;
        }
      }

      // If no existing group match, try rule patterns
      if (!bestMatch && catName) {
        for (const rule of groupingRules) {
          if (rule.pattern.test(catName)) {
            // Check if a group with this name already exists
            const matchingGroup = existingGroups.find(
              (g) => (g as any).name.toLowerCase() === rule.groupName.toLowerCase()
            );

            // Suggest the rule regardless of whether group exists
            // If group doesn't exist, it will be suggested for creation
            bestMatch = {
              groupName: rule.groupName,
              confidence: rule.confidence,
              reasoning: matchingGroup
                ? `Category name matches "${rule.groupName}" pattern`
                : `Suggest creating new "${rule.groupName}" group`,
            };
            break;
          }
        }
      }

      // Only create recommendation if we found a match above threshold
      if (bestMatch && bestMatch.confidence >= settings.minConfidenceScore) {
        const existingGroup = existingGroups.find(
          (g) => (g as any).name.toLowerCase() === bestMatch.groupName.toLowerCase()
        );

        // Create recommendation for either existing or new group
        const recommendation: NewCategoryGroupRecommendation = {
          categoryId: catId,
          suggestedGroupId: existingGroup ? (existingGroup as any).id : null,
          suggestedGroupName: existingGroup ? null : bestMatch.groupName,
          confidenceScore: bestMatch.confidence,
          reasoning: bestMatch.reasoning,
          status: "pending",
        };

        recommendations.push(recommendation);
      }
    }

    // Create recommendation records in database
    const createdRecommendations: CategoryGroupRecommendation[] = [];
    for (const rec of recommendations) {
      const created = await this.recommendationRepository.create(rec);
      createdRecommendations.push(created);
    }

    return createdRecommendations;
  }

  /**
   * Approve a recommendation and apply it
   */
  async approveRecommendation(recommendationId: number): Promise<void> {
    // Get recommendation
    const recommendation = await this.recommendationRepository.findById(recommendationId);
    if (!recommendation) {
      throw new NotFoundError("CategoryGroupRecommendation", recommendationId);
    }

    if (recommendation.status !== "pending") {
      throw new ValidationError(`Recommendation ${recommendationId} is not pending`);
    }

    // Create service instance
    const membershipRepo = new CategoryGroupMembershipRepository();
    const categoryGroupService = new CategoryGroupService(this.groupRepository, membershipRepo);

    // Apply the recommendation
    if (recommendation.suggestedGroupId) {
      // Add category to existing group
      await categoryGroupService.addCategoriesToGroup(recommendation.suggestedGroupId, [
        recommendation.categoryId,
      ]);
    } else if (recommendation.suggestedGroupName) {
      // Try to create the group - if it already exists, we'll catch the error and find it
      let groupId: number;
      try {
        // Get default icon and color for this group
        const appearance = getDefaultGroupAppearance(recommendation.suggestedGroupName);

        const newGroup = await categoryGroupService.createGroup({
          name: recommendation.suggestedGroupName,
          groupIcon: appearance.icon,
          groupColor: appearance.color,
        });
        groupId = newGroup.id;
      } catch (error: any) {
        // Check if it's a UNIQUE constraint error OR the "failed to generate slug" error
        // Both indicate the group likely already exists
        const isUniqueConstraint =
          error?.code === "SQLITE_CONSTRAINT_UNIQUE" ||
          error?.errno === 2067 ||
          error?.message?.includes("UNIQUE constraint failed") ||
          error?.message?.includes("Failed to generate unique slug");

        if (isUniqueConstraint) {
          // A group with this name or slug already exists, find it by name
          const existingGroups = await db.select().from(categoryGroups);
          const existingGroup = existingGroups.find(
            (g) => g.name.toLowerCase() === recommendation.suggestedGroupName!.toLowerCase()
          );
          if (existingGroup) {
            groupId = existingGroup.id;
          } else {
            // Shouldn't happen, but rethrow if we can't find the group
            throw error;
          }
        } else {
          // Different error, rethrow
          throw error;
        }
      }

      await categoryGroupService.addCategoriesToGroup(groupId, [recommendation.categoryId]);
    } else {
      throw new ValidationError("Recommendation has no suggested group");
    }

    // Update recommendation status to 'approved'
    await this.recommendationRepository.updateStatus(recommendationId, "approved");
  }

  /**
   * Dismiss a recommendation (user doesn't want to apply it)
   */
  async dismissRecommendation(recommendationId: number): Promise<void> {
    const recommendation = await this.recommendationRepository.findById(recommendationId);
    if (!recommendation) {
      throw new NotFoundError("CategoryGroupRecommendation", recommendationId);
    }

    await this.recommendationRepository.updateStatus(recommendationId, "dismissed");
  }

  /**
   * Reject a recommendation (user actively disagrees with it)
   */
  async rejectRecommendation(recommendationId: number): Promise<void> {
    const recommendation = await this.recommendationRepository.findById(recommendationId);
    if (!recommendation) {
      throw new NotFoundError("CategoryGroupRecommendation", recommendationId);
    }

    await this.recommendationRepository.updateStatus(recommendationId, "rejected");
  }

  /**
   * Clear old recommendations (30+ days old, not pending)
   */
  async clearOldRecommendations(): Promise<void> {
    // Delete non-pending recommendations older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const allRecommendations = await this.recommendationRepository.findByStatus("dismissed");
    for (const rec of allRecommendations) {
      const createdDate = new Date(rec.createdAt);
      if (createdDate < thirtyDaysAgo) {
        await db
          .delete(require("$lib/schema/category-groups").categoryGroupRecommendations)
          .where(
            eq(require("$lib/schema/category-groups").categoryGroupRecommendations.id, rec.id)
          );
      }
    }
  }
}
