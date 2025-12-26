<script lang="ts">
/**
 * Onboarding Choice Component
 *
 * Presents new users with a choice between:
 * 1. Taking a tour first (with demo data) to learn the app
 * 2. Setting up their account immediately
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
import { Button } from '$lib/components/ui/button';
import { spotlightTour } from '$lib/states/ui/spotlight-tour.svelte';
import { demoMode } from '$lib/states/ui/demo-mode.svelte';
import { UNIFIED_TOUR_STEPS } from '$lib/constants/tour-steps';
import { trpc } from '$lib/trpc/client';
import { goto } from '$app/navigation';
import Map from '@lucide/svelte/icons/map';
import Sparkles from '@lucide/svelte/icons/sparkles';
import Settings from '@lucide/svelte/icons/settings';
import ArrowRight from '@lucide/svelte/icons/arrow-right';
import Clock from '@lucide/svelte/icons/clock';
import CheckCircle from '@lucide/svelte/icons/check-circle';

interface Props {
  onChooseSetup: () => void;
}

let { onChooseSetup }: Props = $props();

let isStartingTour = $state(false);

async function handleStartTour() {
  isStartingTour = true;

  try {
    // Activate demo mode first
    demoMode.activate();

    // Navigate to home page (tour will start from there)
    await goto('/');

    // Start the unified tour with completion callback
    await spotlightTour.start(UNIFIED_TOUR_STEPS, {
      onComplete: async (result) => {
        try {
          if (result.completed) {
            await trpc().onboardingRoutes.completeTour.mutate();
          } else if (result.skipped) {
            await trpc().onboardingRoutes.skipTour.mutate();
          }
        } catch (error) {
          console.error('Failed to persist tour completion:', error);
        }

        // Clean up demo mode after tour completes
        demoMode.endTour();
        demoMode.deactivate();

        // After tour, redirect to onboarding wizard for account setup
        // The wizard will show since onboarding is not complete
        await goto('/onboarding?showWizard=true');
      },
    });
  } catch (error) {
    console.error('Failed to start tour:', error);
    isStartingTour = false;
  }
}

function handleChooseSetup() {
  onChooseSetup();
}
</script>

<div class="min-h-screen bg-gradient-to-br from-background to-muted/20 px-4 py-8">
  <div class="mx-auto w-full max-w-3xl">
    <!-- Header -->
    <div class="mb-12 text-center">
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Sparkles class="h-8 w-8 text-primary" />
      </div>
      <h1 class="text-3xl font-bold sm:text-4xl">Welcome to Budget</h1>
      <p class="text-muted-foreground mt-3 text-lg">
        How would you like to get started?
      </p>
    </div>

    <!-- Choice Cards -->
    <div class="grid gap-6 md:grid-cols-2">
      <!-- Tour First Option -->
      <Card class="relative cursor-pointer border-2 transition-all hover:border-primary hover:shadow-lg" onclick={handleStartTour}>
        <div class="absolute -top-3 left-4">
          <span class="bg-primary text-primary-foreground rounded-full px-3 py-1 text-xs font-medium">
            Recommended
          </span>
        </div>
        <CardHeader class="pt-6">
          <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Map class="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle class="text-xl">Take a Tour First</CardTitle>
          <CardDescription>
            Explore the app with sample data before setting up your accounts
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <ul class="space-y-2 text-sm">
            <li class="flex items-start gap-2">
              <CheckCircle class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
              <span>See all features in action with demo data</span>
            </li>
            <li class="flex items-start gap-2">
              <CheckCircle class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
              <span>Learn the interface before adding your info</span>
            </li>
            <li class="flex items-start gap-2">
              <CheckCircle class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
              <span>No commitment - explore risk-free</span>
            </li>
          </ul>

          <div class="flex items-center gap-2 text-muted-foreground text-sm">
            <Clock class="h-4 w-4" />
            <span>About 5 minutes</span>
          </div>

          <Button class="w-full" disabled={isStartingTour}>
            {#if isStartingTour}
              Starting tour...
            {:else}
              <Map class="mr-2 h-4 w-4" />
              Explore with Tour
              <ArrowRight class="ml-2 h-4 w-4" />
            {/if}
          </Button>
        </CardContent>
      </Card>

      <!-- Setup Now Option -->
      <Card class="cursor-pointer border-2 transition-all hover:border-primary hover:shadow-lg" onclick={handleChooseSetup}>
        <CardHeader class="pt-6">
          <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <Settings class="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle class="text-xl">Set Up My Account</CardTitle>
          <CardDescription>
            Jump right in and configure your accounts and preferences
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <ul class="space-y-2 text-sm">
            <li class="flex items-start gap-2">
              <CheckCircle class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
              <span>Add your bank accounts and cards</span>
            </li>
            <li class="flex items-start gap-2">
              <CheckCircle class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
              <span>Set up categories and budgets</span>
            </li>
            <li class="flex items-start gap-2">
              <CheckCircle class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
              <span>Smart defaults based on your profile</span>
            </li>
          </ul>

          <div class="flex items-center gap-2 text-muted-foreground text-sm">
            <Clock class="h-4 w-4" />
            <span>About 3 minutes</span>
          </div>

          <Button variant="outline" class="w-full">
            <Settings class="mr-2 h-4 w-4" />
            Start Setup
            <ArrowRight class="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>

    <!-- Additional Info -->
    <div class="mt-8 text-center">
      <p class="text-muted-foreground text-sm">
        Don't worry - you can always take the tour later from the Help menu,
        <br class="hidden sm:block" />
        or restart the setup process anytime.
      </p>
    </div>
  </div>
</div>
