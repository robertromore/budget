<script lang="ts">
import * as Form from '$lib/components/ui/form';
import * as Card from '$lib/components/ui/card';
import * as Tabs from '$lib/components/ui/tabs';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { Button, buttonVariants } from '$lib/components/ui/button';
import { Separator } from '$lib/components/ui/separator';
import { Textarea } from '$lib/components/ui/textarea';
import { Badge } from '$lib/components/ui/badge';

import { page } from '$app/state';
import { useEntityForm } from '$lib/hooks/forms/use-entity-form';
import { superformInsertPayeeSchema } from '$lib/schema/superforms';
import type { Payee } from '$lib/schema/payees';
import { PayeesState } from '$lib/states/entities/payees.svelte';
import { trpc } from '$lib/trpc/client';
import type { EditableEntityItem } from '$lib/types';
import { PayeeBasicInfoForm, PayeeContactForm, PayeeBusinessForm } from '$lib/components/payees';

// Icons
import User from '@lucide/svelte/icons/user';
import Phone from '@lucide/svelte/icons/phone';
import Brain from '@lucide/svelte/icons/brain';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import Target from '@lucide/svelte/icons/target';
import Calendar from '@lucide/svelte/icons/calendar';
import DollarSign from '@lucide/svelte/icons/dollar-sign';
import Tag from '@lucide/svelte/icons/tag';
import Building from '@lucide/svelte/icons/building';
import CircleCheck from '@lucide/svelte/icons/circle-check';
import CircleAlert from '@lucide/svelte/icons/circle-alert';
import LoaderCircle from '@lucide/svelte/icons/loader-circle';
import Sparkles from '@lucide/svelte/icons/sparkles';

let {
  id,
  onDelete,
  onSave,
  formId = 'payee-form',
}: {
  id?: number | undefined;
  onDelete?: (id: number) => void;
  onSave?: (new_payee: EditableEntityItem, is_new: boolean) => void;
  formId?: string;
} = $props();

// Page data and states - handle case where page data might not be available
const pageData = page?.data || {};
const payees = PayeesState.get();

// Create a minimal form data structure for compatibility
const managePayeeForm = pageData['form'] || { name: '', notes: '' };
const categories = pageData['categories'] || [];

// Form setup
const isUpdate = Boolean(id && id > 0);

const entityForm = useEntityForm({
  formData: managePayeeForm,
  schema: superformInsertPayeeSchema,
  formId,
  entityId: id,
  onSave: (entity: Payee) => {
    if (isUpdate) {
      payees.updatePayee(entity);
    } else {
      payees.addPayee(entity);
    }
    if (onSave) {
      // Call the onSave callback after updating the client state
      onSave(entity as EditableEntityItem, !isUpdate);
    }
  },
  customOptions: {
    dataType: 'json',
    transformData: (data: any) => {
      // Transform empty strings to null for optional fields
      const transformed = { ...data };

      // Handle string fields that should be null when empty
      const nullableStringFields = [
        'website',
        'phone',
        'email',
        'address',
        'accountNumber',
        'merchantCategoryCode',
        'notes',
        'subscriptionInfo',
      ];

      for (const field of nullableStringFields) {
        if (transformed[field] === '' || transformed[field] === undefined) {
          transformed[field] = null;
        }
      }

      // Handle numeric fields that should be null when empty
      const numericFields = ['defaultCategoryId', 'avgAmount', 'alertThreshold'];
      for (const field of numericFields) {
        if (transformed[field] === '' || transformed[field] === undefined) {
          transformed[field] = null;
        } else if (transformed[field] !== null) {
          const numValue = Number(transformed[field]);
          // defaultCategoryId: 0 means no category selected
          if (field === 'defaultCategoryId' && numValue === 0) {
            transformed[field] = null;
          } else {
            transformed[field] = numValue;
          }
        }
      }

      return transformed;
    },
  },
});

const { form: formData, enhance, submitting, errors } = entityForm;

// Local state
let activeTab = $state('basic');

// Define which fields belong to which tabs
const tabFieldMapping = {
  basic: [
    'name',
    'notes',
    'payeeType',
    'defaultCategoryId',
    'avgAmount',
    'paymentFrequency',
    'taxRelevant',
    'isActive',
    'isSeasonal',
  ],
  contact: ['phone', 'email', 'website', 'accountNumber', 'address'],
  business: ['merchantCategoryCode', 'alertThreshold', 'tags', 'preferredPaymentMethods'],
  intelligence: [], // No form fields, just displays data
  automation: [], // No form fields, just displays data
};

// Computed: Check which tabs have errors
const tabErrors = $derived.by(() => {
  const result = {
    basic: false,
    contact: false,
    business: false,
    intelligence: false,
    automation: false,
  };

  if ($errors) {
    for (const [tab, fields] of Object.entries(tabFieldMapping)) {
      result[tab as keyof typeof result] = fields.some(
        (field) => $errors[field] && $errors[field].length > 0
      );
    }
  }

  return result;
});

// Computed: Check which tabs have required fields missing
const tabRequiredFields = $derived.by(() => {
  const result = {
    basic: false,
    contact: false,
    business: false,
    intelligence: false,
    automation: false,
  };

  // Only 'name' is required in basic tab
  result.basic = !$formData.name || $formData.name.trim() === '';

  return result;
});
let isLoadingRecommendations = $state(false);
let isLoadingContactValidation = $state(false);
let isLoadingSubscriptionDetection = $state(false);
let recommendations = $state<any>(null);
let contactValidation = $state<any>(null);
let subscriptionInfo = $state<any>(null);
let alertDialogOpen = $state(false);

// Initialize form data for existing or new payee
if (id && id > 0) {
  // Existing payee - load from data
  const payee = payees.getById(id);
  if (payee) {
    $formData.id = id;
    $formData.name = payee.name;
    $formData.notes = payee.notes;
    $formData.payeeType = payee.payeeType;
    $formData.defaultCategoryId = payee.defaultCategoryId;
    $formData.taxRelevant = payee.taxRelevant ?? false;
    $formData.isActive = payee.isActive ?? true;
    $formData.avgAmount = payee.avgAmount ?? 0;
    $formData.paymentFrequency = payee.paymentFrequency ?? 'monthly';
    $formData.website = payee.website ?? '';
    $formData.phone = payee.phone ?? '';
    $formData.email = payee.email ?? '';
    $formData.address = payee.address ?? '';
    $formData.accountNumber = payee.accountNumber ?? '';
    $formData.alertThreshold = payee.alertThreshold ?? 0;
    $formData.isSeasonal = payee.isSeasonal ?? false;
    $formData.subscriptionInfo = payee.subscriptionInfo ?? '';
    $formData.tags = payee.tags ?? [];
    $formData.preferredPaymentMethods = payee.preferredPaymentMethods ?? [];
    $formData.merchantCategoryCode = payee.merchantCategoryCode;
  }
} else {
  // New payee - set sensible defaults
  $formData.taxRelevant = false;
  $formData.isActive = true;
  $formData.isSeasonal = false;
  $formData.avgAmount = 0;
  $formData.paymentFrequency = 'monthly';
  $formData.website = '';
  $formData.phone = '';
  $formData.email = '';
  $formData.address = '';
  $formData.accountNumber = '';
  $formData.alertThreshold = 0;
  $formData.subscriptionInfo = '';
  $formData.tags = [];
  $formData.preferredPaymentMethods = [];
  $formData.defaultCategoryId = 0;
}

// ML and intelligence functions
async function loadRecommendations() {
  if (!id) return;

  isLoadingRecommendations = true;
  try {
    const [intelligence, suggestions, stats] = await Promise.all([
      trpc().payeeRoutes.intelligence.query({ id }),
      trpc().payeeRoutes.suggestions.query({ id }),
      trpc().payeeRoutes.stats.query({ id }),
    ]);

    recommendations = { intelligence, suggestions, stats };
  } catch (error) {
    console.error('Failed to load ML recommendations:', error);
  } finally {
    isLoadingRecommendations = false;
  }
}

async function validateContact() {
  if (!id) return;

  isLoadingContactValidation = true;
  try {
    const result = await trpc().payeeRoutes.validateAndEnrichContact.query({
      payeeId: id,
      contactOverrides: {
        phone: $formData.phone,
        email: $formData.email,
        website: $formData.website,
        address: $formData.address,
      },
    });

    contactValidation = result;
  } catch (error) {
    console.error('Failed to validate contact:', error);
  } finally {
    isLoadingContactValidation = false;
  }
}

async function detectSubscription() {
  if (!id) return;

  isLoadingSubscriptionDetection = true;
  try {
    const result = await trpc().payeeRoutes.classifySubscription.query({
      payeeId: id,
    });

    subscriptionInfo = result;
  } catch (error) {
    console.error('Failed to detect subscription:', error);
  } finally {
    isLoadingSubscriptionDetection = false;
  }
}

async function applyIntelligentDefaults() {
  if (!id) return;

  try {
    const result = await trpc().payeeRoutes.applyIntelligentDefaults.mutate({
      id,
      applyCategory: true,
      applyBudget: true,
    });

    if (result.defaultCategoryId) {
      $formData.defaultCategoryId = result.defaultCategoryId;
    }

    // Reload recommendations
    await loadRecommendations();
  } catch (error) {
    console.error('Failed to apply intelligent defaults:', error);
  }
}

const deletePayee = async (id: number) => {
  alertDialogOpen = false;
  if (onDelete) {
    onDelete(id);
  }
};

// Load initial data for existing payee
$effect(() => {
  if (isUpdate) {
    loadRecommendations();
    detectSubscription();
  }
});
</script>

<form id={formId} method="post" action="?/save-payee" use:enhance class="space-y-6">
  <input hidden value={$formData.id} name="id" />

  <Tabs.Root bind:value={activeTab} class="w-full">
    <Tabs.List class="grid w-full grid-cols-5">
      <Tabs.Trigger value="basic" class="relative flex items-center gap-2">
        <User class="h-4 w-4" />
        Basic Info
        {#if tabErrors.basic}
          <div
            class="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-red-500"
            title="Has validation errors">
          </div>
        {:else if tabRequiredFields.basic}
          <div
            class="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-amber-500"
            title="Required fields missing">
          </div>
        {/if}
      </Tabs.Trigger>
      <Tabs.Trigger value="contact" class="relative flex items-center gap-2">
        <Phone class="h-4 w-4" />
        Contact
        {#if tabErrors.contact}
          <div
            class="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-red-500"
            title="Has validation errors">
          </div>
        {:else if tabRequiredFields.contact}
          <div
            class="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-amber-500"
            title="Required fields missing">
          </div>
        {/if}
      </Tabs.Trigger>
      <Tabs.Trigger value="business" class="relative flex items-center gap-2">
        <Building class="h-4 w-4" />
        Business
        {#if tabErrors.business}
          <div
            class="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-red-500"
            title="Has validation errors">
          </div>
        {:else if tabRequiredFields.business}
          <div
            class="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-amber-500"
            title="Required fields missing">
          </div>
        {/if}
      </Tabs.Trigger>
      <Tabs.Trigger value="intelligence" class="relative flex items-center gap-2">
        <Brain class="h-4 w-4" />
        ML Insights
        {#if tabErrors.intelligence}
          <div
            class="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-red-500"
            title="Has validation errors">
          </div>
        {:else if tabRequiredFields.intelligence}
          <div
            class="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-amber-500"
            title="Required fields missing">
          </div>
        {/if}
      </Tabs.Trigger>
      <Tabs.Trigger value="automation" class="relative flex items-center gap-2">
        <Target class="h-4 w-4" />
        Automation
        {#if tabErrors.automation}
          <div
            class="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-red-500"
            title="Has validation errors">
          </div>
        {:else if tabRequiredFields.automation}
          <div
            class="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-amber-500"
            title="Required fields missing">
          </div>
        {/if}
      </Tabs.Trigger>
    </Tabs.List>

    <!-- Basic Information Tab -->
    <Tabs.Content value="basic" class="space-y-6">
      <PayeeBasicInfoForm {formData} {entityForm} {categories} />
    </Tabs.Content>

    <!-- Contact Information Tab -->
    <Tabs.Content value="contact" class="space-y-6">
      <PayeeContactForm
        {formData}
        {entityForm}
        {isUpdate}
        {contactValidation}
        {isLoadingContactValidation}
        onValidateContact={validateContact} />
    </Tabs.Content>

    <!-- Business Information Tab -->
    <Tabs.Content value="business" class="space-y-6">
      <PayeeBusinessForm
        {formData}
        {entityForm}
        {isUpdate}
        {subscriptionInfo}
        {isLoadingSubscriptionDetection}
        onDetectSubscription={detectSubscription} />
    </Tabs.Content>

    <!-- ML Insights Tab -->
    <Tabs.Content value="intelligence" class="space-y-6">
      {#if isUpdate}
        <Card.Root>
          <Card.Header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Brain class="text-primary h-5 w-5" />
                <Card.Title>Machine Learning Insights</Card.Title>
              </div>
              <div class="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onclick={loadRecommendations}
                  disabled={isLoadingRecommendations}>
                  {#if isLoadingRecommendations}
                    <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
                  {/if}
                  Refresh
                </Button>
                <Button variant="default" size="sm" onclick={applyIntelligentDefaults}>
                  <Sparkles class="mr-2 h-4 w-4" />
                  Apply Defaults
                </Button>
              </div>
            </div>
            <Card.Description>
              AI-powered recommendations and insights based on transaction history.
            </Card.Description>
          </Card.Header>
          <Card.Content>
            {#if isLoadingRecommendations}
              <div class="flex items-center justify-center py-8">
                <LoaderCircle class="h-8 w-8 animate-spin" />
              </div>
            {:else if recommendations}
              <div class="space-y-6">
                <!-- Statistics -->
                {#if recommendations.stats}
                  <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div class="bg-muted/50 rounded-lg p-4 text-center">
                      <DollarSign class="mx-auto mb-2 h-6 w-6 text-green-500" />
                      <div class="text-2xl font-bold">${recommendations.stats.totalSpent || 0}</div>
                      <div class="text-muted-foreground text-sm">Total Spent</div>
                    </div>
                    <div class="bg-muted/50 rounded-lg p-4 text-center">
                      <TrendingUp class="mx-auto mb-2 h-6 w-6 text-blue-500" />
                      <div class="text-2xl font-bold">
                        {recommendations.stats.transactionCount || 0}
                      </div>
                      <div class="text-muted-foreground text-sm">Transactions</div>
                    </div>
                    <div class="bg-muted/50 rounded-lg p-4 text-center">
                      <Calendar class="mx-auto mb-2 h-6 w-6 text-purple-500" />
                      <div class="text-2xl font-bold">
                        ${Math.round(recommendations.stats.avgAmount || 0)}
                      </div>
                      <div class="text-muted-foreground text-sm">Avg Amount</div>
                    </div>
                  </div>
                {/if}

                <!-- Intelligence Insights -->
                {#if recommendations.intelligence}
                  <div class="space-y-4">
                    <h4 class="font-medium">AI Insights</h4>
                    {#if recommendations.intelligence.categoryRecommendation}
                      <div class="flex items-center gap-2 rounded-lg bg-blue-50 p-3">
                        <Tag class="h-4 w-4 text-blue-500" />
                        <span class="text-sm">
                          Recommended category: <strong
                            >{recommendations.intelligence.categoryRecommendation.name}</strong>
                          ({Math.round(
                            recommendations.intelligence.categoryRecommendation.confidence * 100
                          )}% confidence)
                        </span>
                      </div>
                    {/if}
                    {#if recommendations.intelligence.frequencyPrediction}
                      <div class="flex items-center gap-2 rounded-lg bg-green-50 p-3">
                        <Calendar class="h-4 w-4 text-green-500" />
                        <span class="text-sm">
                          Predicted frequency: <strong
                            >{recommendations.intelligence.frequencyPrediction}</strong>
                        </span>
                      </div>
                    {/if}
                  </div>
                {/if}

                <!-- Suggestions -->
                {#if recommendations.suggestions && recommendations.suggestions.length > 0}
                  <div class="space-y-4">
                    <h4 class="font-medium">Optimization Suggestions</h4>
                    <div class="space-y-2">
                      {#each recommendations.suggestions as suggestion}
                        <div class="bg-muted/50 flex items-start gap-2 rounded-lg p-3">
                          <CircleAlert class="mt-0.5 h-4 w-4 text-orange-500" />
                          <div class="text-sm">
                            <strong>{suggestion.type}:</strong>
                            {suggestion.description}
                            {#if suggestion.impact}
                              <Badge variant="secondary" class="ml-2">{suggestion.impact}</Badge>
                            {/if}
                          </div>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>
            {:else}
              <p class="text-muted-foreground py-8 text-center text-sm">
                Click "Refresh" to load ML insights for this payee
              </p>
            {/if}
          </Card.Content>
        </Card.Root>
      {:else}
        <Card.Root>
          <Card.Content class="py-8 text-center">
            <Brain class="text-muted-foreground mx-auto mb-4 h-12 w-12" />
            <p class="text-muted-foreground text-sm">
              ML insights will be available after saving this payee and processing transaction
              history.
            </p>
          </Card.Content>
        </Card.Root>
      {/if}
    </Tabs.Content>

    <!-- Automation Tab -->
    <Tabs.Content value="automation" class="space-y-6">
      <Card.Root>
        <Card.Header>
          <div class="flex items-center gap-2">
            <Target class="text-primary h-5 w-5" />
            <Card.Title>Automation & Defaults</Card.Title>
          </div>
          <Card.Description>
            Configure automatic categorization and budget assignment defaults.
          </Card.Description>
        </Card.Header>
        <Card.Content class="space-y-4">
          <!-- Subscription Information -->
          <Form.Field form={entityForm} name="subscriptionInfo">
            <Form.Control>
              {#snippet children({ props })}
                <Form.Label>Subscription Metadata</Form.Label>
                <Textarea
                  {...props}
                  bind:value={$formData.subscriptionInfo}
                  placeholder="JSON metadata for subscription details" />
                <Form.Description
                  >Advanced subscription configuration (JSON format)</Form.Description>
                <Form.FieldErrors />
              {/snippet}
            </Form.Control>
          </Form.Field>

          {#if isUpdate}
            <Separator />

            <div class="space-y-4">
              <h4 class="font-medium">Quick Actions</h4>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Button
                  variant="outline"
                  class="h-auto p-4 text-left"
                  onclick={loadRecommendations}>
                  <div class="flex items-center gap-3">
                    <Brain class="h-5 w-5 text-blue-500" />
                    <div>
                      <div class="font-medium">Update ML Fields</div>
                      <div class="text-muted-foreground text-sm">
                        Recalculate averages and predictions
                      </div>
                    </div>
                  </div>
                </Button>

                <Button variant="outline" class="h-auto p-4 text-left" onclick={validateContact}>
                  <div class="flex items-center gap-3">
                    <CircleCheck class="h-5 w-5 text-green-500" />
                    <div>
                      <div class="font-medium">Validate Contact</div>
                      <div class="text-muted-foreground text-sm">
                        Check and enrich contact information
                      </div>
                    </div>
                  </div>
                </Button>

                <Button variant="outline" class="h-auto p-4 text-left" onclick={detectSubscription}>
                  <div class="flex items-center gap-3">
                    <Calendar class="h-5 w-5 text-purple-500" />
                    <div>
                      <div class="font-medium">Detect Subscription</div>
                      <div class="text-muted-foreground text-sm">
                        Analyze recurring payment patterns
                      </div>
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  class="h-auto p-4 text-left"
                  onclick={applyIntelligentDefaults}>
                  <div class="flex items-center gap-3">
                    <Sparkles class="h-5 w-5 text-orange-500" />
                    <div>
                      <div class="font-medium">Apply AI Defaults</div>
                      <div class="text-muted-foreground text-sm">
                        Set category and budget based on ML
                      </div>
                    </div>
                  </div>
                </Button>
              </div>
            </div>
          {/if}
        </Card.Content>
      </Card.Root>
    </Tabs.Content>
  </Tabs.Root>

  <!-- Hidden fields for complex data -->
  <input hidden bind:value={$formData.payeeType} name="payeeType" />
  <input hidden bind:value={$formData.defaultCategoryId} name="defaultCategoryId" />
  <input hidden bind:value={$formData.paymentFrequency} name="paymentFrequency" />
  <input hidden bind:value={$formData.avgAmount} name="avgAmount" />
  <input hidden bind:value={$formData.taxRelevant} name="taxRelevant" />
  <input hidden bind:value={$formData.isActive} name="isActive" />
  <input hidden bind:value={$formData.website} name="website" />
  <input hidden bind:value={$formData.phone} name="phone" />
  <input hidden bind:value={$formData.email} name="email" />
  <input hidden bind:value={$formData.address} name="address" />
  <input hidden bind:value={$formData.accountNumber} name="accountNumber" />
  <input hidden bind:value={$formData.alertThreshold} name="alertThreshold" />
  <input hidden bind:value={$formData.isSeasonal} name="isSeasonal" />
  <input hidden bind:value={$formData.subscriptionInfo} name="subscriptionInfo" />
  <input hidden bind:value={$formData.tags} name="tags" />
  <input hidden bind:value={$formData.preferredPaymentMethods} name="preferredPaymentMethods" />
  <input hidden bind:value={$formData.merchantCategoryCode} name="merchantCategoryCode" />

  <!-- Submit Button -->
  <div class="flex justify-between pt-4">
    <div>
      {#if id}
        <Button variant="destructive" onclick={() => (alertDialogOpen = true)}>Delete Payee</Button>
      {/if}
    </div>
    <Form.Button class="px-8" disabled={$submitting}>
      {#if $submitting}
        <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
        Saving...
      {:else}
        {isUpdate ? 'Update Payee' : 'Create Payee'}
      {/if}
    </Form.Button>
  </div>
</form>

<AlertDialog.Root bind:open={alertDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
      <AlertDialog.Description>
        This action cannot be undone. This will permanently delete this payee.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={() => deletePayee(id!)}
        class={buttonVariants({ variant: 'destructive' })}>Continue</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
