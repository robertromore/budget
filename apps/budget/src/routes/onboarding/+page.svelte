<script lang="ts">
import { page } from '$app/stores';
import { OnboardingWizard, OnboardingChoice } from '$lib/components/onboarding';

// Check if we should show the wizard directly (coming back from tour)
const showWizardParam = $derived($page.url.searchParams.get('showWizard') === 'true');

// Track whether user has chosen to set up (either from choice or from tour completion)
let showWizard = $state(false);

// Show wizard if param is set or user chose setup
const shouldShowWizard = $derived(showWizardParam || showWizard);

function handleChooseSetup() {
  showWizard = true;
}
</script>

<svelte:head>
  <title>Setup - Budget</title>
</svelte:head>

{#if shouldShowWizard}
  <OnboardingWizard />
{:else}
  <OnboardingChoice onChooseSetup={handleChooseSetup} />
{/if}
