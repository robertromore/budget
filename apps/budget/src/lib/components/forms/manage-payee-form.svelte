<script lang="ts">
import * as Form from '$lib/components/ui/form';
import * as Card from '$lib/components/ui/card';
import * as Tabs from '$lib/components/ui/tabs';
import * as Select from '$lib/components/ui/select';
import * as Dialog from '$lib/components/ui/dialog';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import {Input} from '$lib/components/ui/input';
import {Textarea} from '$lib/components/ui/textarea';
import {Switch} from '$lib/components/ui/switch';
import {Badge} from '$lib/components/ui/badge';
import {Button, buttonVariants} from '$lib/components/ui/button';
import {Separator} from '$lib/components/ui/separator';
import {Label} from '$lib/components/ui/label';

import {page} from '$app/state';
import {useEntityForm} from '$lib/hooks/forms/use-entity-form';
import {superformInsertPayeeSchema} from '$lib/schema/superforms';
import {payeeTypes, paymentFrequencies, type Payee, type PayeeType, type PaymentFrequency} from '$lib/schema/payees';
import {PayeesState} from '$lib/states/entities/payees.svelte';
import {CategoriesState} from '$lib/states/entities/categories.svelte';
import {EntityInput} from '$lib/components/input';
import {trpc} from '$lib/trpc/client';
import type {EditableEntityItem} from '$lib/types';
import ManageCategoryForm from '$lib/components/forms/manage-category-form.svelte';

// Icons
import User from '@lucide/svelte/icons/user';
import CreditCard from '@lucide/svelte/icons/credit-card';
import MapPin from '@lucide/svelte/icons/map-pin';
import Phone from '@lucide/svelte/icons/phone';
import Mail from '@lucide/svelte/icons/mail';
import Globe from '@lucide/svelte/icons/globe';
import Brain from '@lucide/svelte/icons/brain';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import Target from '@lucide/svelte/icons/target';
import Calendar from '@lucide/svelte/icons/calendar';
import DollarSign from '@lucide/svelte/icons/dollar-sign';
import Bell from '@lucide/svelte/icons/bell';
import Tag from '@lucide/svelte/icons/tag';
import Building from '@lucide/svelte/icons/building';
import CheckCircle from '@lucide/svelte/icons/check-circle';
import AlertCircle from '@lucide/svelte/icons/alert-circle';
import Loader2 from '@lucide/svelte/icons/loader-2';
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
const categoriesState = CategoriesState.get();

// Create a minimal form data structure for compatibility
const managePayeeForm = pageData['managePayeeForm'] || {name: '', notes: ''};
const categories = pageData['categories'] || [];

// Form setup
const isUpdate = id && id > 0;

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
    if (onSave) onSave(entity as EditableEntityItem, !isUpdate);
  },
});

const {form: formData, enhance, submitting} = entityForm;

// Local state
let activeTab = $state('basic');
let isLoadingRecommendations = $state(false);
let isLoadingContactValidation = $state(false);
let isLoadingSubscriptionDetection = $state(false);
let recommendations = $state<any>(null);
let contactValidation = $state<any>(null);
let subscriptionInfo = $state<any>(null);
let alertDialogOpen = $state(false);

// Initialize form data for existing payee
if (id && id > 0) {
  const payee = payees.getById(id);
  if (payee) {
    $formData.id = id;
    $formData.name = payee.name;
    $formData.notes = payee.notes;
    $formData.payeeType = payee.payeeType;
    $formData.defaultCategoryId = payee.defaultCategoryId;
    $formData.taxRelevant = payee.taxRelevant;
    $formData.isActive = payee.isActive;
    $formData.avgAmount = payee.avgAmount;
    $formData.paymentFrequency = payee.paymentFrequency;
    $formData.website = payee.website;
    $formData.phone = payee.phone;
    $formData.email = payee.email;
    $formData.address = payee.address;
    $formData.accountNumber = payee.accountNumber;
    $formData.alertThreshold = payee.alertThreshold;
    $formData.isSeasonal = payee.isSeasonal;
    $formData.subscriptionInfo = payee.subscriptionInfo;
    $formData.tags = payee.tags;
    $formData.preferredPaymentMethods = payee.preferredPaymentMethods;
    $formData.merchantCategoryCode = payee.merchantCategoryCode;
  }
}

// Dropdown options
const payeeTypeOptions = payeeTypes.map(type => ({
  value: type,
  label: type.replace('_', ' ').split(' ').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
}));

const paymentFrequencyOptions = paymentFrequencies.map(freq => ({
  value: freq,
  label: freq.replace('_', ' ').split(' ').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
}));

// ML and intelligence functions
async function loadRecommendations() {
  if (!id) return;

  isLoadingRecommendations = true;
  try {
    const [intelligence, suggestions, stats] = await Promise.all([
      trpc().payeeRoutes.intelligence.query({id}),
      trpc().payeeRoutes.suggestions.query({id}),
      trpc().payeeRoutes.stats.query({id})
    ]);

    recommendations = {intelligence, suggestions, stats};
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
        address: $formData.address
      }
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
      payeeId: id
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
      applyBudget: true
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

// Handle tab changes to load data lazily
function handleTabChange(newTab: string) {
  activeTab = newTab;

  if (newTab === 'contact' && isUpdate && !contactValidation) {
    validateContact();
  }
}
</script>

<form id={formId} method="post" action="/payees?/save-payee" use:enhance class="space-y-6">
  <input hidden value={$formData.id} name="id" />

  <Tabs.Root value={activeTab} onValueChange={handleTabChange} class="w-full">
    <Tabs.List class="grid w-full grid-cols-5">
      <Tabs.Trigger value="basic" class="flex items-center gap-2">
        <User class="h-4 w-4" />
        Basic Info
      </Tabs.Trigger>
      <Tabs.Trigger value="contact" class="flex items-center gap-2">
        <Phone class="h-4 w-4" />
        Contact
      </Tabs.Trigger>
      <Tabs.Trigger value="business" class="flex items-center gap-2">
        <Building class="h-4 w-4" />
        Business
      </Tabs.Trigger>
      <Tabs.Trigger value="intelligence" class="flex items-center gap-2">
        <Brain class="h-4 w-4" />
        ML Insights
      </Tabs.Trigger>
      <Tabs.Trigger value="automation" class="flex items-center gap-2">
        <Target class="h-4 w-4" />
        Automation
      </Tabs.Trigger>
    </Tabs.List>

    <!-- Basic Information Tab -->
    <Tabs.Content value="basic" class="space-y-6">
      <Card.Root>
        <Card.Header>
          <div class="flex items-center gap-2">
            <User class="h-5 w-5 text-primary" />
            <Card.Title>Basic Information</Card.Title>
          </div>
          <Card.Description>
            Essential payee details and categorization settings.
          </Card.Description>
        </Card.Header>
        <Card.Content class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Payee Name -->
            <Form.Field form={entityForm} name="name">
              <Form.Control>
                {#snippet children({props})}
                  <Form.Label>Payee Name</Form.Label>
                  <Input {...props} bind:value={$formData.name} placeholder="e.g., Starbucks, Netflix, Electric Company" />
                  <Form.FieldErrors />
                {/snippet}
              </Form.Control>
            </Form.Field>

            <!-- Payee Type -->
            <Form.Field form={entityForm} name="payeeType">
              <Form.Control>
                {#snippet children({props})}
                  <Form.Label>Payee Type</Form.Label>
                  <Select.Root type="single" bind:value={$formData.payeeType}>
                    <Select.Trigger {...props}>
                      <span>{$formData.payeeType ? payeeTypeOptions.find(opt => opt.value === $formData.payeeType)?.label : "Select type"}</span>
                    </Select.Trigger>
                    <Select.Content>
                      {#each payeeTypeOptions as option}
                        <Select.Item value={option.value}>{option.label}</Select.Item>
                      {/each}
                    </Select.Content>
                  </Select.Root>
                  <Form.FieldErrors />
                {/snippet}
              </Form.Control>
            </Form.Field>

            <!-- Payment Frequency -->
            <Form.Field form={entityForm} name="paymentFrequency">
              <Form.Control>
                {#snippet children({props})}
                  <Form.Label>Payment Frequency</Form.Label>
                  <Select.Root type="single" bind:value={$formData.paymentFrequency}>
                    <Select.Trigger {...props}>
                      <span>{$formData.paymentFrequency ? paymentFrequencyOptions.find(opt => opt.value === $formData.paymentFrequency)?.label : "Select frequency"}</span>
                    </Select.Trigger>
                    <Select.Content>
                      {#each paymentFrequencyOptions as option}
                        <Select.Item value={option.value}>{option.label}</Select.Item>
                      {/each}
                    </Select.Content>
                  </Select.Root>
                  <Form.FieldErrors />
                {/snippet}
              </Form.Control>
            </Form.Field>

            <!-- Default Category -->
            <Form.Field form={entityForm} name="defaultCategoryId">
              <Form.Control>
                {#snippet children({props})}
                  <Form.Label>Default Category</Form.Label>
                  <EntityInput
                    entityLabel="categories"
                    entities={categories}
                    bind:value={$formData.defaultCategoryId}
                    handleSubmit={(category) => {
                      if (category) {
                        $formData.defaultCategoryId = category.id || 0;
                      }
                    }}
                    icon={Tag}
                    buttonClass="w-full"
                    management={{
                      enable: true,
                      component: ManageCategoryForm,
                      onSave: (new_value: any, is_new: boolean) => {
                        if (is_new) {
                          categoriesState.addCategory(new_value);
                        } else {
                          categoriesState.updateCategory(new_value);
                        }
                      },
                      onDelete: (id: number) => {
                        categoriesState.deleteCategory(id);
                      },
                    }}
                  />
                  <Form.FieldErrors />
                  <input hidden bind:value={$formData.defaultCategoryId} name={props.name} />
                {/snippet}
              </Form.Control>
            </Form.Field>

            <!-- Average Amount -->
            <Form.Field form={entityForm} name="avgAmount">
              <Form.Control>
                {#snippet children({props})}
                  <Form.Label>Average Transaction Amount</Form.Label>
                  <Input {...props} bind:value={$formData.avgAmount} type="number" step="0.01" placeholder="0.00" />
                  <Form.FieldErrors />
                {/snippet}
              </Form.Control>
            </Form.Field>
          </div>

          <!-- Notes -->
          <Form.Field form={entityForm} name="notes">
            <Form.Control>
              {#snippet children({props})}
                <Form.Label>Notes</Form.Label>
                <Textarea {...props} bind:value={$formData.notes} placeholder="Additional notes about this payee..." />
                <Form.FieldErrors />
              {/snippet}
            </Form.Control>
          </Form.Field>

          <!-- Flags -->
          <div class="flex flex-wrap gap-4">
            <div class="flex items-center space-x-2">
              <Switch bind:checked={$formData.taxRelevant} />
              <Label>Tax Relevant</Label>
            </div>
            <div class="flex items-center space-x-2">
              <Switch bind:checked={$formData.isSeasonal} />
              <Label>Seasonal Payee</Label>
            </div>
            <div class="flex items-center space-x-2">
              <Switch bind:checked={$formData.isActive} />
              <Label>Active</Label>
            </div>
          </div>
        </Card.Content>
      </Card.Root>
    </Tabs.Content>

    <!-- Contact Information Tab -->
    <Tabs.Content value="contact" class="space-y-6">
      <Card.Root>
        <Card.Header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Phone class="h-5 w-5 text-primary" />
              <Card.Title>Contact Information</Card.Title>
            </div>
            {#if isUpdate}
              <Button variant="outline" size="sm" onclick={validateContact} disabled={isLoadingContactValidation}>
                {#if isLoadingContactValidation}
                  <Loader2 class="h-4 w-4 animate-spin mr-2" />
                {/if}
                Validate & Enrich
              </Button>
            {/if}
          </div>
          <Card.Description>
            Contact details and validation status.
          </Card.Description>
        </Card.Header>
        <Card.Content class="space-y-4">
          {#if contactValidation}
            <div class="bg-muted/50 p-4 rounded-lg">
              <h4 class="font-medium mb-2 flex items-center gap-2">
                <CheckCircle class="h-4 w-4 text-green-500" />
                Validation Results
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {#if contactValidation.phoneValidation}
                  <div class="flex items-center gap-2">
                    <Badge variant={contactValidation.phoneValidation.isValid ? 'default' : 'destructive'}>
                      Phone: {contactValidation.phoneValidation.isValid ? 'Valid' : 'Invalid'}
                    </Badge>
                  </div>
                {/if}
                {#if contactValidation.emailValidation}
                  <div class="flex items-center gap-2">
                    <Badge variant={contactValidation.emailValidation.isValid ? 'default' : 'destructive'}>
                      Email: {contactValidation.emailValidation.isValid ? 'Valid' : 'Invalid'}
                    </Badge>
                  </div>
                {/if}
                {#if contactValidation.websiteValidation}
                  <div class="flex items-center gap-2">
                    <Badge variant={contactValidation.websiteValidation.isAccessible ? 'default' : 'destructive'}>
                      Website: {contactValidation.websiteValidation.isAccessible ? 'Accessible' : 'Inaccessible'}
                    </Badge>
                  </div>
                {/if}
              </div>
            </div>
          {/if}

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Phone -->
            <Form.Field form={entityForm} name="phone">
              <Form.Control>
                {#snippet children({props})}
                  <Form.Label>Phone Number</Form.Label>
                  <Input {...props} bind:value={$formData.phone} placeholder="+1 (555) 123-4567" />
                  <Form.FieldErrors />
                {/snippet}
              </Form.Control>
            </Form.Field>

            <!-- Email -->
            <Form.Field form={entityForm} name="email">
              <Form.Control>
                {#snippet children({props})}
                  <Form.Label>Email Address</Form.Label>
                  <Input {...props} bind:value={$formData.email} type="email" placeholder="contact@example.com" />
                  <Form.FieldErrors />
                {/snippet}
              </Form.Control>
            </Form.Field>

            <!-- Website -->
            <Form.Field form={entityForm} name="website">
              <Form.Control>
                {#snippet children({props})}
                  <Form.Label>Website</Form.Label>
                  <Input {...props} bind:value={$formData.website} placeholder="https://example.com" />
                  <Form.FieldErrors />
                {/snippet}
              </Form.Control>
            </Form.Field>

            <!-- Account Number -->
            <Form.Field form={entityForm} name="accountNumber">
              <Form.Control>
                {#snippet children({props})}
                  <Form.Label>Account Number</Form.Label>
                  <Input {...props} bind:value={$formData.accountNumber} placeholder="Account or reference number" />
                  <Form.FieldErrors />
                {/snippet}
              </Form.Control>
            </Form.Field>
          </div>

          <!-- Address -->
          <Form.Field form={entityForm} name="address">
            <Form.Control>
              {#snippet children({props})}
                <Form.Label>Address</Form.Label>
                <Textarea {...props} bind:value={$formData.address} placeholder="Street address, city, state, postal code" />
                <Form.FieldErrors />
              {/snippet}
            </Form.Control>
          </Form.Field>
        </Card.Content>
      </Card.Root>
    </Tabs.Content>

    <!-- Business Information Tab -->
    <Tabs.Content value="business" class="space-y-6">
      <Card.Root>
        <Card.Header>
          <div class="flex items-center gap-2">
            <Building class="h-5 w-5 text-primary" />
            <Card.Title>Business & Payment Details</Card.Title>
          </div>
          <Card.Description>
            Business-specific information and payment processing details.
          </Card.Description>
        </Card.Header>
        <Card.Content class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Merchant Category Code -->
            <Form.Field form={entityForm} name="merchantCategoryCode">
              <Form.Control>
                {#snippet children({props})}
                  <Form.Label>Merchant Category Code</Form.Label>
                  <Input {...props} bind:value={$formData.merchantCategoryCode} placeholder="4-digit MCC" maxlength={4} />
                  <Form.Description>Standard industry classification code</Form.Description>
                  <Form.FieldErrors />
                {/snippet}
              </Form.Control>
            </Form.Field>

            <!-- Alert Threshold -->
            <Form.Field form={entityForm} name="alertThreshold">
              <Form.Control>
                {#snippet children({props})}
                  <Form.Label>Alert Threshold</Form.Label>
                  <Input {...props} bind:value={$formData.alertThreshold} type="number" step="0.01" placeholder="0.00" />
                  <Form.Description>Notify when transactions exceed this amount</Form.Description>
                  <Form.FieldErrors />
                {/snippet}
              </Form.Control>
            </Form.Field>
          </div>

          <!-- Subscription Detection -->
          {#if isUpdate}
            <Card.Root>
              <Card.Header>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <Calendar class="h-4 w-4 text-primary" />
                    <Card.Title class="text-base">Subscription Detection</Card.Title>
                  </div>
                  <Button variant="outline" size="sm" onclick={detectSubscription} disabled={isLoadingSubscriptionDetection}>
                    {#if isLoadingSubscriptionDetection}
                      <Loader2 class="h-4 w-4 animate-spin mr-2" />
                    {/if}
                    Detect
                  </Button>
                </div>
              </Card.Header>
              <Card.Content>
                {#if subscriptionInfo}
                  <div class="space-y-2">
                    <div class="flex items-center gap-2">
                      <Badge variant={subscriptionInfo.isSubscription ? 'default' : 'secondary'}>
                        {subscriptionInfo.isSubscription ? 'Subscription Detected' : 'Not a Subscription'}
                      </Badge>
                      {#if subscriptionInfo.confidence}
                        <Badge variant="outline">
                          {Math.round(subscriptionInfo.confidence * 100)}% confidence
                        </Badge>
                      {/if}
                    </div>
                    {#if subscriptionInfo.details}
                      <div class="text-sm text-muted-foreground">
                        <p><strong>Type:</strong> {subscriptionInfo.details.type}</p>
                        <p><strong>Frequency:</strong> {subscriptionInfo.details.frequency}</p>
                        {#if subscriptionInfo.details.estimatedCost}
                          <p><strong>Estimated Cost:</strong> ${subscriptionInfo.details.estimatedCost}</p>
                        {/if}
                      </div>
                    {/if}
                  </div>
                {:else}
                  <p class="text-sm text-muted-foreground">Click "Detect" to analyze subscription patterns</p>
                {/if}
              </Card.Content>
            </Card.Root>
          {/if}

          <!-- Tags -->
          <Form.Field form={entityForm} name="tags">
            <Form.Control>
              {#snippet children({props})}
                <Form.Label>Tags</Form.Label>
                <Input {...props} bind:value={$formData.tags} placeholder="comma, separated, tags" />
                <Form.Description>Comma-separated tags for organization</Form.Description>
                <Form.FieldErrors />
              {/snippet}
            </Form.Control>
          </Form.Field>

          <!-- Preferred Payment Methods -->
          <Form.Field form={entityForm} name="preferredPaymentMethods">
            <Form.Control>
              {#snippet children({props})}
                <Form.Label>Preferred Payment Methods</Form.Label>
                <Input {...props} bind:value={$formData.preferredPaymentMethods} placeholder="credit card, bank transfer, cash" />
                <Form.Description>Comma-separated list of accepted payment methods</Form.Description>
                <Form.FieldErrors />
              {/snippet}
            </Form.Control>
          </Form.Field>
        </Card.Content>
      </Card.Root>
    </Tabs.Content>

    <!-- ML Insights Tab -->
    <Tabs.Content value="intelligence" class="space-y-6">
      {#if isUpdate}
        <Card.Root>
          <Card.Header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Brain class="h-5 w-5 text-primary" />
                <Card.Title>Machine Learning Insights</Card.Title>
              </div>
              <div class="flex gap-2">
                <Button variant="outline" size="sm" onclick={loadRecommendations} disabled={isLoadingRecommendations}>
                  {#if isLoadingRecommendations}
                    <Loader2 class="h-4 w-4 animate-spin mr-2" />
                  {/if}
                  Refresh
                </Button>
                <Button variant="default" size="sm" onclick={applyIntelligentDefaults}>
                  <Sparkles class="h-4 w-4 mr-2" />
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
                <Loader2 class="h-8 w-8 animate-spin" />
              </div>
            {:else if recommendations}
              <div class="space-y-6">
                <!-- Statistics -->
                {#if recommendations.stats}
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="text-center p-4 bg-muted/50 rounded-lg">
                      <DollarSign class="h-6 w-6 mx-auto mb-2 text-green-500" />
                      <div class="text-2xl font-bold">${recommendations.stats.totalSpent || 0}</div>
                      <div class="text-sm text-muted-foreground">Total Spent</div>
                    </div>
                    <div class="text-center p-4 bg-muted/50 rounded-lg">
                      <TrendingUp class="h-6 w-6 mx-auto mb-2 text-blue-500" />
                      <div class="text-2xl font-bold">{recommendations.stats.transactionCount || 0}</div>
                      <div class="text-sm text-muted-foreground">Transactions</div>
                    </div>
                    <div class="text-center p-4 bg-muted/50 rounded-lg">
                      <Calendar class="h-6 w-6 mx-auto mb-2 text-purple-500" />
                      <div class="text-2xl font-bold">${Math.round(recommendations.stats.avgAmount || 0)}</div>
                      <div class="text-sm text-muted-foreground">Avg Amount</div>
                    </div>
                  </div>
                {/if}

                <!-- Intelligence Insights -->
                {#if recommendations.intelligence}
                  <div class="space-y-4">
                    <h4 class="font-medium">AI Insights</h4>
                    {#if recommendations.intelligence.categoryRecommendation}
                      <div class="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                        <Tag class="h-4 w-4 text-blue-500" />
                        <span class="text-sm">
                          Recommended category: <strong>{recommendations.intelligence.categoryRecommendation.name}</strong>
                          ({Math.round(recommendations.intelligence.categoryRecommendation.confidence * 100)}% confidence)
                        </span>
                      </div>
                    {/if}
                    {#if recommendations.intelligence.frequencyPrediction}
                      <div class="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                        <Calendar class="h-4 w-4 text-green-500" />
                        <span class="text-sm">
                          Predicted frequency: <strong>{recommendations.intelligence.frequencyPrediction}</strong>
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
                        <div class="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                          <AlertCircle class="h-4 w-4 text-orange-500 mt-0.5" />
                          <div class="text-sm">
                            <strong>{suggestion.type}:</strong> {suggestion.description}
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
              <p class="text-sm text-muted-foreground text-center py-8">
                Click "Refresh" to load ML insights for this payee
              </p>
            {/if}
          </Card.Content>
        </Card.Root>
      {:else}
        <Card.Root>
          <Card.Content class="text-center py-8">
            <Brain class="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p class="text-sm text-muted-foreground">
              ML insights will be available after saving this payee and processing transaction history.
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
            <Target class="h-5 w-5 text-primary" />
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
              {#snippet children({props})}
                <Form.Label>Subscription Metadata</Form.Label>
                <Textarea {...props} bind:value={$formData.subscriptionInfo} placeholder="JSON metadata for subscription details" />
                <Form.Description>Advanced subscription configuration (JSON format)</Form.Description>
                <Form.FieldErrors />
              {/snippet}
            </Form.Control>
          </Form.Field>

          {#if isUpdate}
            <Separator />

            <div class="space-y-4">
              <h4 class="font-medium">Quick Actions</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" class="h-auto p-4 text-left" onclick={loadRecommendations}>
                  <div class="flex items-center gap-3">
                    <Brain class="h-5 w-5 text-blue-500" />
                    <div>
                      <div class="font-medium">Update ML Fields</div>
                      <div class="text-sm text-muted-foreground">Recalculate averages and predictions</div>
                    </div>
                  </div>
                </Button>

                <Button variant="outline" class="h-auto p-4 text-left" onclick={validateContact}>
                  <div class="flex items-center gap-3">
                    <CheckCircle class="h-5 w-5 text-green-500" />
                    <div>
                      <div class="font-medium">Validate Contact</div>
                      <div class="text-sm text-muted-foreground">Check and enrich contact information</div>
                    </div>
                  </div>
                </Button>

                <Button variant="outline" class="h-auto p-4 text-left" onclick={detectSubscription}>
                  <div class="flex items-center gap-3">
                    <Calendar class="h-5 w-5 text-purple-500" />
                    <div>
                      <div class="font-medium">Detect Subscription</div>
                      <div class="text-sm text-muted-foreground">Analyze recurring payment patterns</div>
                    </div>
                  </div>
                </Button>

                <Button variant="outline" class="h-auto p-4 text-left" onclick={applyIntelligentDefaults}>
                  <div class="flex items-center gap-3">
                    <Sparkles class="h-5 w-5 text-orange-500" />
                    <div>
                      <div class="font-medium">Apply AI Defaults</div>
                      <div class="text-sm text-muted-foreground">Set category and budget based on ML</div>
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
        <Loader2 class="h-4 w-4 animate-spin mr-2" />
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
        class={buttonVariants({variant: 'destructive'})}>Continue</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
