/**
 * Onboarding Query Layer
 *
 * Provides reactive query/mutation interfaces for the onboarding system.
 */

import type { OnboardingFormData } from "$lib/types/onboarding";
import { trpc } from "$lib/trpc/client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

// Query keys for onboarding operations
export const onboardingKeys = createQueryKeys("onboarding", {
  status: () => ["status"] as const,
  shouldShowOnboarding: () => ["shouldShowOnboarding"] as const,
  shouldShowTour: () => ["shouldShowTour"] as const,
});

/**
 * Check if onboarding wizard should be shown
 */
export const shouldShowOnboarding = defineQuery({
  queryKey: onboardingKeys.shouldShowOnboarding(),
  queryFn: () => trpc().onboardingRoutes.shouldShowOnboarding.query(),
});

/**
 * Check if spotlight tour should auto-start
 */
export const shouldShowTour = defineQuery({
  queryKey: onboardingKeys.shouldShowTour(),
  queryFn: () => trpc().onboardingRoutes.shouldShowTour.query(),
});

/**
 * Get current onboarding status
 */
export const getStatus = defineQuery({
  queryKey: onboardingKeys.status(),
  queryFn: () => trpc().onboardingRoutes.getStatus.query(),
});

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
 * Complete the onboarding wizard
 */
export const completeWizard = defineMutation<OnboardingFormData, OnboardingCompletionResult>({
  mutationFn: (formData: OnboardingFormData) =>
    trpc().onboardingRoutes.completeWizard.mutate(formData),
  successMessage: "Setup complete! Your workspace has been configured.",
  errorMessage: "Failed to complete setup",
});

/**
 * Mark tour as complete
 */
export const completeTour = defineMutation<void, { success: boolean }>({
  mutationFn: () => trpc().onboardingRoutes.completeTour.mutate(),
});

/**
 * Skip the tour
 */
export const skipTour = defineMutation<void, { success: boolean }>({
  mutationFn: () => trpc().onboardingRoutes.skipTour.mutate(),
});

/**
 * Reset onboarding to allow re-running the wizard
 */
export const resetOnboarding = defineMutation<void, { success: boolean }>({
  mutationFn: () => trpc().onboardingRoutes.resetOnboarding.mutate(),
  successMessage: "Onboarding has been reset",
  errorMessage: "Failed to reset onboarding",
});

// Convenience namespace export
export const Onboarding = {
  shouldShowOnboarding,
  shouldShowTour,
  getStatus,
  completeWizard,
  completeTour,
  skipTour,
  resetOnboarding,
};
