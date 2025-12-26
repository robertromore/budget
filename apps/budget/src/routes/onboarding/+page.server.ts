import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, url }) => {
  const { currentWorkspace } = await parent();

  // Parse workspace preferences
  let preferences = null;
  if (currentWorkspace?.preferences) {
    try {
      preferences = typeof currentWorkspace.preferences === 'string'
        ? JSON.parse(currentWorkspace.preferences)
        : currentWorkspace.preferences;
    } catch {
      preferences = null;
    }
  }

  // Check if wizard is already completed
  const onboardingStatus = preferences?.onboarding;

  // Allow reset via query param
  const forceReset = url.searchParams.get('reset') === 'true';

  if (onboardingStatus?.wizardCompleted && !forceReset) {
    // Wizard already done, redirect to main app
    // Check if tour should start
    if (!onboardingStatus.tourCompleted && !onboardingStatus.tourSkipped) {
      throw redirect(302, '/?tour=start');
    }
    throw redirect(302, '/');
  }

  return {
    showOnboarding: true,
  };
};
