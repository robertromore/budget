/**
 * Onboarding Service
 *
 * Handles onboarding wizard completion tracking, smart defaults creation,
 * and tour status management.
 */

import type { WorkspacePreferences } from "$lib/schema/workspaces";
import type { OnboardingFormData, OnboardingStatus } from "$lib/types/onboarding";
import { DEFAULT_ONBOARDING_STATUS } from "$lib/types/onboarding";
import type { AccountService } from "$lib/server/domains/accounts/services";
import type { CategoryService } from "$lib/server/domains/categories/services";
import { nowISOString } from "$lib/utils/dates";
import { SmartDefaultsGenerator, type AccountConfig, type SmartDefaultsResult } from "./smart-defaults";

/**
 * Result of completing the onboarding wizard
 */
export interface OnboardingCompletionResult {
  accountsCreated: number;
  categoriesSeeded: number;
  budgetsCreated: number;
  preferences: {
    currency: string;
    locale: string;
    dateFormat: string;
  };
}

/**
 * Database access interface for workspace operations
 */
export interface OnboardingWorkspaceRepository {
  getWorkspacePreferences(workspaceId: number): Promise<WorkspacePreferences | null>;
  updateWorkspacePreferences(workspaceId: number, preferences: WorkspacePreferences): Promise<void>;
}

/**
 * Onboarding Service
 *
 * Orchestrates onboarding completion, default creation, and status tracking.
 */
export class OnboardingService {
  private smartDefaultsGenerator: SmartDefaultsGenerator;

  constructor(
    private workspaceRepository: OnboardingWorkspaceRepository,
    private accountService: AccountService,
    private categoryService: CategoryService
  ) {
    this.smartDefaultsGenerator = new SmartDefaultsGenerator();
  }

  /**
   * Check if onboarding wizard should be shown
   */
  async shouldShowOnboarding(workspaceId: number): Promise<boolean> {
    const prefs = await this.workspaceRepository.getWorkspacePreferences(workspaceId);
    const status = prefs?.onboarding || DEFAULT_ONBOARDING_STATUS;
    return !status.wizardCompleted;
  }

  /**
   * Check if spotlight tour should auto-start
   */
  async shouldShowTour(workspaceId: number): Promise<boolean> {
    const prefs = await this.workspaceRepository.getWorkspacePreferences(workspaceId);
    const status = prefs?.onboarding || DEFAULT_ONBOARDING_STATUS;

    // Show tour only if wizard is complete but tour is not complete and not skipped
    return status.wizardCompleted && !status.tourCompleted && !status.tourSkipped;
  }

  /**
   * Get current onboarding status
   */
  async getOnboardingStatus(workspaceId: number): Promise<OnboardingStatus> {
    const prefs = await this.workspaceRepository.getWorkspacePreferences(workspaceId);
    return prefs?.onboarding || DEFAULT_ONBOARDING_STATUS;
  }

  /**
   * Complete the onboarding wizard
   *
   * Creates smart defaults based on user profile and marks wizard as complete.
   */
  async completeWizard(
    workspaceId: number,
    formData: OnboardingFormData
  ): Promise<OnboardingCompletionResult> {
    // Generate smart defaults based on form data
    const defaults = this.smartDefaultsGenerator.generateDefaults(formData);

    // Create accounts
    const accountsCreated = await this.createAccounts(workspaceId, defaults.accounts);

    // Seed categories based on filters
    const categoriesSeeded = await this.seedCategories(workspaceId, defaults.categoryFilters);

    // Update workspace preferences with onboarding data and status
    await this.updateOnboardingComplete(workspaceId, formData, defaults);

    // TODO: Create budgets based on templates (future enhancement)
    const budgetsCreated = 0;

    return {
      accountsCreated,
      categoriesSeeded,
      budgetsCreated,
      preferences: defaults.preferences,
    };
  }

  /**
   * Mark the tour as complete
   */
  async completeTour(workspaceId: number): Promise<void> {
    const prefs = await this.workspaceRepository.getWorkspacePreferences(workspaceId);
    const currentOnboarding = prefs?.onboarding || DEFAULT_ONBOARDING_STATUS;

    const updatedPrefs: WorkspacePreferences = {
      ...prefs,
      onboarding: {
        ...currentOnboarding,
        tourCompleted: true,
        tourCompletedAt: nowISOString(),
      },
    };

    await this.workspaceRepository.updateWorkspacePreferences(workspaceId, updatedPrefs);
  }

  /**
   * Skip the tour (mark as skipped without completing)
   */
  async skipTour(workspaceId: number): Promise<void> {
    const prefs = await this.workspaceRepository.getWorkspacePreferences(workspaceId);
    const currentOnboarding = prefs?.onboarding || DEFAULT_ONBOARDING_STATUS;

    const updatedPrefs: WorkspacePreferences = {
      ...prefs,
      onboarding: {
        ...currentOnboarding,
        tourSkipped: true,
      },
    };

    await this.workspaceRepository.updateWorkspacePreferences(workspaceId, updatedPrefs);
  }

  /**
   * Reset onboarding to allow re-running the wizard
   *
   * Does not delete any created entities, just resets status flags.
   */
  async resetOnboarding(workspaceId: number): Promise<void> {
    const prefs = await this.workspaceRepository.getWorkspacePreferences(workspaceId);

    const updatedPrefs: WorkspacePreferences = {
      ...prefs,
      onboarding: DEFAULT_ONBOARDING_STATUS,
      onboardingData: undefined,
    };

    await this.workspaceRepository.updateWorkspacePreferences(workspaceId, updatedPrefs);
  }

  /**
   * Create accounts from configurations
   */
  private async createAccounts(
    workspaceId: number,
    accounts: AccountConfig[]
  ): Promise<number> {
    let created = 0;

    for (const config of accounts) {
      try {
        await this.accountService.createAccount(
          {
            name: config.name,
            notes: config.notes,
            initialBalance: config.initialBalance || 0,
            accountType: config.accountType,
            onBudget: config.onBudget,
            accountIcon: config.accountIcon,
            accountColor: config.accountColor,
          },
          workspaceId
        );
        created++;
      } catch (error) {
        // Log but continue - account might already exist
        console.warn(`[OnboardingService] Failed to create account ${config.name}:`, error);
      }
    }

    return created;
  }

  /**
   * Seed categories based on filters
   */
  private async seedCategories(
    workspaceId: number,
    filters: { includeSlugs: string[]; excludeSlugs: string[] }
  ): Promise<number> {
    try {
      const result = await this.categoryService.seedDefaultCategories(
        workspaceId,
        filters.includeSlugs
      );
      return result.created;
    } catch (error) {
      console.warn(`[OnboardingService] Failed to seed categories:`, error);
      return 0;
    }
  }

  /**
   * Update workspace preferences after wizard completion
   */
  private async updateOnboardingComplete(
    workspaceId: number,
    formData: OnboardingFormData,
    defaults: SmartDefaultsResult
  ): Promise<void> {
    const prefs = await this.workspaceRepository.getWorkspacePreferences(workspaceId);

    const updatedPrefs: WorkspacePreferences = {
      ...prefs,
      // Apply preferences from wizard
      currency: defaults.preferences.currency,
      locale: defaults.preferences.locale,
      dateFormat: defaults.preferences.dateFormat as WorkspacePreferences["dateFormat"],
      // Save onboarding data for reference
      onboardingData: formData,
      // Mark wizard as complete
      onboarding: {
        ...(prefs?.onboarding || DEFAULT_ONBOARDING_STATUS),
        wizardCompleted: true,
        wizardCompletedAt: nowISOString(),
      },
    };

    await this.workspaceRepository.updateWorkspacePreferences(workspaceId, updatedPrefs);
  }
}

/**
 * Create onboarding service with injected dependencies
 */
export function createOnboardingService(
  workspaceRepository: OnboardingWorkspaceRepository,
  accountService: AccountService,
  categoryService: CategoryService
): OnboardingService {
  return new OnboardingService(workspaceRepository, accountService, categoryService);
}
