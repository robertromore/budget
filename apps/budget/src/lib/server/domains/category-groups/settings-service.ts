import type { CategoryGroupSettings } from "$lib/schema/category-groups";
import { ValidationError } from "$lib/server/shared/types/errors";
import { CategoryGroupSettingsRepository } from "./repository";

// ================================================================================
// DTOs
// ================================================================================

export interface UpdateCategoryGroupSettingsData {
	recommendationsEnabled?: boolean;
	minConfidenceScore?: number;
}

// ================================================================================
// CategoryGroupSettingsService
// ================================================================================

/**
 * Service for category group settings business logic
 */
export class CategoryGroupSettingsService {
	constructor(private settingsRepository: CategoryGroupSettingsRepository) {}

	/**
	 * Get current settings (singleton)
	 */
	async getSettings(): Promise<CategoryGroupSettings> {
		return await this.settingsRepository.getSettings();
	}

	/**
	 * Update settings
	 */
	async updateSettings(data: UpdateCategoryGroupSettingsData): Promise<CategoryGroupSettings> {
		// Validate minConfidenceScore if provided
		if (data.minConfidenceScore !== undefined) {
			if (data.minConfidenceScore < 0 || data.minConfidenceScore > 1) {
				throw new ValidationError("Confidence score must be between 0 and 1");
			}
		}

		// Validate recommendationsEnabled if provided
		if (data.recommendationsEnabled !== undefined) {
			if (typeof data.recommendationsEnabled !== "boolean") {
				throw new ValidationError("Recommendations enabled must be a boolean");
			}
		}

		// Update settings (singleton row with id=1)
		return await this.settingsRepository.updateSettings(data);
	}
}
