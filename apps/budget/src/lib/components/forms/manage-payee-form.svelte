<script lang="ts">
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { Button, buttonVariants } from '$lib/components/ui/button';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import * as Form from '$lib/components/ui/form';
import * as Tabs from '$lib/components/ui/tabs';
import { toast } from '$lib/utils/toast-interceptor';

import { beforeNavigate, goto } from '$app/navigation';
import { page } from '$app/state';
import { PayeeBasicInfoForm, PayeeBusinessForm, PayeeContactForm } from '$lib/components/payees';
import { useEntityForm } from '$lib/hooks/forms/use-entity-form';
import { getFieldEnhancementSummary, recordEnhancement, type FieldEnhancementSummary } from '$lib/query/payee-enhancements';
import { enrichPayeeContact, explainInsights, getPayeeSuggestions, inferPayeeDetails, type ContactEnrichmentSuggestions, type PayeeDetailsSuggestions, type PayeeSuggestions } from '$lib/query/payees';
import type { EnhanceableField } from '$lib/schema';
import type { Payee, PayeeAiPreferences, PaymentFrequency } from '$lib/schema/payees';
import { superformInsertPayeeSchema } from '$lib/schema/superforms';
import { PayeesState } from '$lib/states/entities/payees.svelte';
import { trpc } from '$lib/trpc/client';
import type { EditableEntityItem } from '$lib/types';
// Icons
import ArrowRight from '@lucide/svelte/icons/arrow-right';
import Brain from '@lucide/svelte/icons/brain';
import Building from '@lucide/svelte/icons/building';
import ChevronDown from '@lucide/svelte/icons/chevron-down';
import CircleCheck from '@lucide/svelte/icons/circle-check';
import Loader2 from '@lucide/svelte/icons/loader-2';
import LoaderCircle from '@lucide/svelte/icons/loader-circle';
import Phone from '@lucide/svelte/icons/phone';
import Sparkles from '@lucide/svelte/icons/sparkles';
import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
import User from '@lucide/svelte/icons/user';
import Wand2 from '@lucide/svelte/icons/wand-2';

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

// Capture props at mount time to avoid reactivity warnings
const _id = (() => id)();
const _formId = (() => formId)();

// Page data and states - handle case where page data might not be available
const pageData = page?.data || {};
const payees = PayeesState.get();

// Create a minimal form data structure for compatibility
const managePayeeForm = pageData['form'] || { name: '', notes: '' };
const categories = pageData['categories'] || [];

// Form setup
const isUpdate = Boolean(_id && _id > 0);

const entityForm = useEntityForm({
  formData: managePayeeForm,
  schema: superformInsertPayeeSchema,
  formId: _formId,
  entityId: _id,
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
  onSuccess: (entity: Payee) => {
    // Sync form data with saved entity to clear tainted state
    // This prevents false "unsaved changes" detection after save
    syncFormWithEntity(entity);
  },
  customOptions: {
    dataType: 'json',
    resetForm: false, // Prevent form reset - we'll sync manually
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

const { form: formData, enhance, submitting, errors, tainted } = entityForm;

/**
 * Sync form data with the saved entity to clear tainted state.
 * This ensures form values match exactly what was saved to prevent
 * false "unsaved changes" detection.
 */
function syncFormWithEntity(entity: Payee) {
  $formData.id = entity.id;
  $formData.name = entity.name;
  $formData.notes = entity.notes ?? '';
  $formData.payeeType = entity.payeeType;
  $formData.defaultCategoryId = entity.defaultCategoryId ?? 0;
  $formData.taxRelevant = entity.taxRelevant ?? false;
  $formData.isActive = entity.isActive ?? true;
  $formData.avgAmount = entity.avgAmount ?? 0;
  $formData.paymentFrequency = entity.paymentFrequency ?? 'monthly';
  $formData.website = entity.website ?? '';
  $formData.phone = entity.phone ?? '';
  $formData.email = entity.email ?? '';
  $formData.address = entity.address ?? '';
  $formData.accountNumber = entity.accountNumber ?? '';
  $formData.alertThreshold = entity.alertThreshold ?? 0;
  $formData.isSeasonal = entity.isSeasonal ?? false;
  $formData.subscriptionInfo = entity.subscriptionInfo ?? '';
  $formData.tags = entity.tags ?? [];
  $formData.preferredPaymentMethods = entity.preferredPaymentMethods ?? [];
  $formData.merchantCategoryCode = entity.merchantCategoryCode ?? '';

  // Reset tainted state after syncing
  if ($tainted) {
    for (const key of Object.keys($tainted)) {
      $tainted[key] = false;
    }
  }
}

// Local state
let activeTab = $state('basic');

// Unsaved changes navigation guard
let unsavedChangesDialogOpen = $state(false);
let pendingNavigation = $state<{ url: URL; cancel: () => void } | null>(null);

// Check if form has unsaved changes
const hasUnsavedChanges = $derived.by(() => {
  if (!$tainted) return false;
  // Check if any field is tainted
  return Object.values($tainted).some(Boolean);
});

// Handle SvelteKit navigation
beforeNavigate(({ cancel, to }) => {
  if (hasUnsavedChanges && to?.url) {
    cancel();
    pendingNavigation = { url: to.url, cancel };
    unsavedChangesDialogOpen = true;
  }
});

// Handle browser navigation (close tab, refresh, etc.)
$effect(() => {
  function handleBeforeUnload(e: BeforeUnloadEvent) {
    if (hasUnsavedChanges) {
      e.preventDefault();
      // Modern browsers show a generic message, but we still need to set returnValue
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return e.returnValue;
    }
  }

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
});

// Confirm navigation (discard changes)
function confirmNavigation() {
  if (pendingNavigation) {
    // Mark form as not tainted to prevent recursive dialog
    if ($tainted) {
      for (const key of Object.keys($tainted)) {
        $tainted[key] = false;
      }
    }
    const url = pendingNavigation.url;
    pendingNavigation = null;
    unsavedChangesDialogOpen = false;
    goto(url.pathname + url.search);
  }
}

// Cancel navigation (stay on page)
function cancelNavigation() {
  pendingNavigation = null;
  unsavedChangesDialogOpen = false;
}

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
  business: ['merchantCategoryCode', 'alertThreshold', 'tags', 'preferredPaymentMethods', 'subscriptionInfo'],
};

// Computed: Check which tabs have errors
const tabErrors = $derived.by(() => {
  const result = {
    basic: false,
    contact: false,
    business: false,
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
  };

  // Only 'name' is required in basic tab
  result.basic = !$formData.name || $formData.name.trim() === '';

  return result;
});
let isLoadingSubscriptionDetection = $state(false);
let subscriptionInfo = $state<any>(null);
let alertDialogOpen = $state(false);

// LLM explanation state
let aiExplanation = $state<string | null>(null);
const explainMutation = explainInsights().options();

// Enhancement tracking state
let payeeAiPreferences = $state<PayeeAiPreferences | null>(null);
let enhancementSummary = $state<FieldEnhancementSummary[]>([]);

// Intelligence strategy types
type IntelligenceStrategy = 'llm-only' | 'ml-only' | 'llm-then-ml' | 'ml-then-llm';

interface StrategyOption {
  value: IntelligenceStrategy;
  label: string;
  description: string;
  icon: 'sparkles' | 'brain' | 'sparkles-brain' | 'brain-sparkles';
}

const intelligenceStrategies: StrategyOption[] = [
  {
    value: 'llm-only',
    label: 'LLM Only',
    description: 'Use AI language models for all fields',
    icon: 'sparkles',
  },
  {
    value: 'ml-only',
    label: 'ML Only',
    description: 'Use machine learning from transaction history',
    icon: 'brain',
  },
  {
    value: 'llm-then-ml',
    label: 'LLM → ML',
    description: 'Try LLM first, then fill gaps with ML',
    icon: 'sparkles-brain',
  },
  {
    value: 'ml-then-llm',
    label: 'ML → LLM',
    description: 'Try ML first, then enhance with LLM',
    icon: 'brain-sparkles',
  },
];

// Apply Intelligence to All state
let isApplyingAllIntelligence = $state(false);
let selectedStrategy = $state<IntelligenceStrategy>('llm-then-ml');
const inferMutation = inferPayeeDetails().options();
const enrichContactMutation = enrichPayeeContact().options();
const recordEnhancementMutation = recordEnhancement().options();

// Helper to record an enhancement
function recordFieldEnhancement(
  fieldName: EnhanceableField,
  originalValue: unknown,
  suggestedValue: unknown,
  confidence?: number,
  mode: 'ml' | 'llm' = 'llm'
) {
  if (!_id) return;
  recordEnhancementMutation.mutate({
    payeeId: _id,
    fieldName,
    mode,
    originalValue,
    suggestedValue,
    appliedValue: suggestedValue,
    confidence: confidence ?? undefined,
  });
}

// Apply all suggestions from inferPayeeDetails to form
function applyDetailsSuggestions(suggestions: PayeeDetailsSuggestions, filledFields: Set<string>) {
  const confidence = suggestions.confidence ?? undefined;

  // Basic info fields
  if (suggestions.enhancedName && !filledFields.has('name')) {
    const originalValue = $formData.name;
    $formData.name = suggestions.enhancedName;
    recordFieldEnhancement('name', originalValue, suggestions.enhancedName, confidence);
    filledFields.add('name');
  }
  if (suggestions.payeeType && !filledFields.has('payeeType')) {
    const originalValue = $formData.payeeType;
    $formData.payeeType = suggestions.payeeType;
    recordFieldEnhancement('payeeType', originalValue, suggestions.payeeType, confidence);
    filledFields.add('payeeType');
  }
  if (suggestions.paymentFrequency && !filledFields.has('paymentFrequency')) {
    const originalValue = $formData.paymentFrequency;
    $formData.paymentFrequency = suggestions.paymentFrequency;
    recordFieldEnhancement('paymentFrequency', originalValue, suggestions.paymentFrequency, confidence);
    filledFields.add('paymentFrequency');
  }
  if (suggestions.suggestedCategoryId && !filledFields.has('defaultCategoryId')) {
    const originalValue = $formData.defaultCategoryId;
    $formData.defaultCategoryId = suggestions.suggestedCategoryId.toString();
    recordFieldEnhancement('defaultCategoryId', originalValue, suggestions.suggestedCategoryId, confidence);
    filledFields.add('defaultCategoryId');
  }
  if (suggestions.taxRelevant !== null && !filledFields.has('taxRelevant')) {
    const originalValue = $formData.taxRelevant;
    $formData.taxRelevant = suggestions.taxRelevant;
    recordFieldEnhancement('taxRelevant', originalValue, suggestions.taxRelevant, confidence);
    filledFields.add('taxRelevant');
  }
  if (suggestions.isSeasonal !== null && !filledFields.has('isSeasonal')) {
    const originalValue = $formData.isSeasonal;
    $formData.isSeasonal = suggestions.isSeasonal;
    recordFieldEnhancement('isSeasonal', originalValue, suggestions.isSeasonal, confidence);
    filledFields.add('isSeasonal');
  }

  // Business fields
  if (suggestions.suggestedMCC && !filledFields.has('merchantCategoryCode')) {
    const originalValue = $formData.merchantCategoryCode;
    $formData.merchantCategoryCode = suggestions.suggestedMCC;
    recordFieldEnhancement('merchantCategoryCode', originalValue, suggestions.suggestedMCC, confidence);
    filledFields.add('merchantCategoryCode');
  }
  if (suggestions.suggestedTags?.length && !filledFields.has('tags')) {
    const originalValue = $formData.tags;
    $formData.tags = suggestions.suggestedTags;
    recordFieldEnhancement('tags', originalValue, suggestions.suggestedTags, confidence);
    filledFields.add('tags');
  }
  if (suggestions.suggestedPaymentMethods?.length && !filledFields.has('preferredPaymentMethods')) {
    const originalValue = $formData.preferredPaymentMethods;
    $formData.preferredPaymentMethods = suggestions.suggestedPaymentMethods;
    recordFieldEnhancement('preferredPaymentMethods', originalValue, suggestions.suggestedPaymentMethods, confidence);
    filledFields.add('preferredPaymentMethods');
  }

  // Contact field (website from infer)
  if (suggestions.suggestedWebsite && !filledFields.has('website')) {
    const originalValue = $formData.website;
    $formData.website = suggestions.suggestedWebsite;
    recordFieldEnhancement('website', originalValue, suggestions.suggestedWebsite, confidence);
    filledFields.add('website');
  }
}

// Apply contact enrichment suggestions (LLM-based)
function applyContactSuggestions(suggestions: ContactEnrichmentSuggestions, filledFields: Set<string>) {
  if (suggestions.website && !filledFields.has('website')) {
    const originalValue = $formData.website;
    $formData.website = suggestions.website;
    recordFieldEnhancement('website', originalValue, suggestions.website, undefined, 'llm');
    filledFields.add('website');
  }
  if (suggestions.phone && !filledFields.has('phone')) {
    const originalValue = $formData.phone;
    $formData.phone = suggestions.phone;
    recordFieldEnhancement('phone', originalValue, suggestions.phone, undefined, 'llm');
    filledFields.add('phone');
  }
  if (suggestions.email && !filledFields.has('email')) {
    const originalValue = $formData.email;
    $formData.email = suggestions.email;
    recordFieldEnhancement('email', originalValue, suggestions.email, undefined, 'llm');
    filledFields.add('email');
  }
  if (suggestions.address && !filledFields.has('address')) {
    const originalValue = $formData.address;
    $formData.address = suggestions.address;
    recordFieldEnhancement('address', originalValue, suggestions.address, undefined, 'llm');
    filledFields.add('address');
  }
}

// Apply ML-based suggestions (from transaction history)
function applyMLSuggestions(suggestions: PayeeSuggestions, filledFields: Set<string>) {
  const confidence = suggestions.confidence ?? undefined;

  if (suggestions.suggestedCategoryId && !filledFields.has('defaultCategoryId')) {
    const originalValue = $formData.defaultCategoryId;
    $formData.defaultCategoryId = suggestions.suggestedCategoryId.toString();
    recordFieldEnhancement('defaultCategoryId', originalValue, suggestions.suggestedCategoryId, confidence, 'ml');
    filledFields.add('defaultCategoryId');
  }
  if (suggestions.suggestedFrequency && !filledFields.has('paymentFrequency')) {
    const originalValue = $formData.paymentFrequency;
    $formData.paymentFrequency = suggestions.suggestedFrequency;
    recordFieldEnhancement('paymentFrequency', originalValue, suggestions.suggestedFrequency, confidence, 'ml');
    filledFields.add('paymentFrequency');
  }
  if (suggestions.suggestedAmount && !filledFields.has('avgAmount')) {
    const originalValue = $formData.avgAmount;
    $formData.avgAmount = suggestions.suggestedAmount;
    // avgAmount is not an EnhanceableField, skip recording
    filledFields.add('avgAmount');
  }
}

// Fetch LLM suggestions
async function fetchLLMSuggestions(payeeName: string): Promise<{
  details?: PayeeDetailsSuggestions;
  contact?: ContactEnrichmentSuggestions;
}> {
  const [detailsResult, contactResult] = await Promise.allSettled([
    new Promise<{ success: boolean; suggestions?: PayeeDetailsSuggestions }>((resolve, reject) => {
      inferMutation.mutate(
        { name: payeeName, currentCategoryId: $formData.defaultCategoryId ? Number($formData.defaultCategoryId) : undefined },
        { onSuccess: resolve, onError: reject }
      );
    }),
    new Promise<{ success: boolean; suggestions?: ContactEnrichmentSuggestions }>((resolve, reject) => {
      enrichContactMutation.mutate(
        { name: payeeName },
        { onSuccess: resolve, onError: reject }
      );
    }),
  ]);

  return {
    details: detailsResult.status === 'fulfilled' && detailsResult.value.success
      ? detailsResult.value.suggestions
      : undefined,
    contact: contactResult.status === 'fulfilled' && contactResult.value.success
      ? contactResult.value.suggestions
      : undefined,
  };
}

// Fetch ML suggestions (requires existing payee with transaction history)
async function fetchMLSuggestions(): Promise<PayeeSuggestions | undefined> {
  if (!_id) return undefined;
  try {
    const suggestions = await getPayeeSuggestions(_id).execute();
    return suggestions;
  } catch {
    return undefined;
  }
}

// Apply intelligence to all fields across all tabs
async function handleApplyAllIntelligence(strategy: IntelligenceStrategy = selectedStrategy) {
  const payeeName = $formData.name?.trim();
  if (!payeeName) return;

  isApplyingAllIntelligence = true;
  const filledFields = new Set<string>();

  // Show loading toast
  const toastId = toast.loading('Applying intelligence...', {
    description: `Using ${strategy.replace(/-/g, ' ')} strategy`,
  });

  try {
    switch (strategy) {
      case 'llm-only': {
        const { details, contact } = await fetchLLMSuggestions(payeeName);
        if (details) applyDetailsSuggestions(details, filledFields);
        if (contact) applyContactSuggestions(contact, filledFields);
        break;
      }

      case 'ml-only': {
        const mlSuggestions = await fetchMLSuggestions();
        if (mlSuggestions) applyMLSuggestions(mlSuggestions, filledFields);
        break;
      }

      case 'llm-then-ml': {
        // First apply LLM
        const { details, contact } = await fetchLLMSuggestions(payeeName);
        if (details) applyDetailsSuggestions(details, filledFields);
        if (contact) applyContactSuggestions(contact, filledFields);

        // Then fill gaps with ML
        const mlSuggestions = await fetchMLSuggestions();
        if (mlSuggestions) applyMLSuggestions(mlSuggestions, filledFields);
        break;
      }

      case 'ml-then-llm': {
        // First apply ML
        const mlSuggestions = await fetchMLSuggestions();
        if (mlSuggestions) applyMLSuggestions(mlSuggestions, filledFields);

        // Then enhance with LLM for fields ML couldn't fill
        const { details, contact } = await fetchLLMSuggestions(payeeName);
        if (details) {
          // Only apply fields not already filled by ML
          const confidence = details.confidence ?? undefined;
          if (details.enhancedName && !filledFields.has('name')) {
            const originalValue = $formData.name;
            $formData.name = details.enhancedName;
            recordFieldEnhancement('name', originalValue, details.enhancedName, confidence, 'llm');
            filledFields.add('name');
          }
          if (details.payeeType && !filledFields.has('payeeType')) {
            const originalValue = $formData.payeeType;
            $formData.payeeType = details.payeeType;
            recordFieldEnhancement('payeeType', originalValue, details.payeeType, confidence, 'llm');
            filledFields.add('payeeType');
          }
          if (details.paymentFrequency && !filledFields.has('paymentFrequency')) {
            const originalValue = $formData.paymentFrequency;
            $formData.paymentFrequency = details.paymentFrequency;
            recordFieldEnhancement('paymentFrequency', originalValue, details.paymentFrequency, confidence, 'llm');
            filledFields.add('paymentFrequency');
          }
          if (details.suggestedCategoryId && !filledFields.has('defaultCategoryId')) {
            const originalValue = $formData.defaultCategoryId;
            $formData.defaultCategoryId = details.suggestedCategoryId.toString();
            recordFieldEnhancement('defaultCategoryId', originalValue, details.suggestedCategoryId, confidence, 'llm');
            filledFields.add('defaultCategoryId');
          }
          if (details.taxRelevant !== null && !filledFields.has('taxRelevant')) {
            const originalValue = $formData.taxRelevant;
            $formData.taxRelevant = details.taxRelevant;
            recordFieldEnhancement('taxRelevant', originalValue, details.taxRelevant, confidence, 'llm');
            filledFields.add('taxRelevant');
          }
          if (details.isSeasonal !== null && !filledFields.has('isSeasonal')) {
            const originalValue = $formData.isSeasonal;
            $formData.isSeasonal = details.isSeasonal;
            recordFieldEnhancement('isSeasonal', originalValue, details.isSeasonal, confidence, 'llm');
            filledFields.add('isSeasonal');
          }
          // Business fields
          if (details.suggestedMCC && !filledFields.has('merchantCategoryCode')) {
            const originalValue = $formData.merchantCategoryCode;
            $formData.merchantCategoryCode = details.suggestedMCC;
            recordFieldEnhancement('merchantCategoryCode', originalValue, details.suggestedMCC, confidence, 'llm');
            filledFields.add('merchantCategoryCode');
          }
          if (details.suggestedTags?.length && !filledFields.has('tags')) {
            const originalValue = $formData.tags;
            $formData.tags = details.suggestedTags;
            recordFieldEnhancement('tags', originalValue, details.suggestedTags, confidence, 'llm');
            filledFields.add('tags');
          }
          if (details.suggestedPaymentMethods?.length && !filledFields.has('preferredPaymentMethods')) {
            const originalValue = $formData.preferredPaymentMethods;
            $formData.preferredPaymentMethods = details.suggestedPaymentMethods;
            recordFieldEnhancement('preferredPaymentMethods', originalValue, details.suggestedPaymentMethods, confidence, 'llm');
            filledFields.add('preferredPaymentMethods');
          }
          if (details.suggestedWebsite && !filledFields.has('website')) {
            const originalValue = $formData.website;
            $formData.website = details.suggestedWebsite;
            recordFieldEnhancement('website', originalValue, details.suggestedWebsite, confidence, 'llm');
            filledFields.add('website');
          }
        }
        if (contact) applyContactSuggestions(contact, filledFields);
        break;
      }
    }

    // Reload enhancement summary to update UI indicators
    if (_id) {
      getFieldEnhancementSummary(_id)
        .execute()
        .then((data) => {
          enhancementSummary = data ?? [];
        });
    }

    // Show success toast
    const fieldCount = filledFields.size;
    if (fieldCount > 0) {
      toast.success('Intelligence applied', {
        id: toastId,
        description: `Updated ${fieldCount} field${fieldCount === 1 ? '' : 's'}`,
      });
    } else {
      toast.info('No updates available', {
        id: toastId,
        description: 'No suggestions found for this payee',
      });
    }
  } catch (error) {
    console.error('Failed to apply intelligence:', error);
    toast.error('Failed to apply intelligence', {
      id: toastId,
      description: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  } finally {
    isApplyingAllIntelligence = false;
  }
}

// Initialize form data for existing or new payee
if (_id && _id > 0) {
  // Existing payee - load from data
  const payee = payees.getById(_id);
  if (payee) {
    $formData.id = _id;
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

    // Load AI preferences from payee
    payeeAiPreferences = (payee as any).aiPreferences ?? null;

    // Load enhancement summary in the background
    getFieldEnhancementSummary(_id)
      .execute()
      .then((data) => {
        enhancementSummary = data ?? [];
      })
      .catch((error) => {
        console.error('Failed to load enhancement summary:', error);
      });
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

// Reset tainted state after initial form data load
// This prevents the "unsaved changes" dialog from appearing immediately
let initialLoadComplete = $state(false);
$effect(() => {
  if (!initialLoadComplete && $tainted) {
    // Clear tainted state from initial data loading
    for (const key of Object.keys($tainted)) {
      $tainted[key] = false;
    }
    initialLoadComplete = true;
  }
});

function handleExplainInsights() {
  if (!_id) return;

  explainMutation.mutate(
    { id: _id },
    {
      onSuccess: (result) => {
        if (result.success && result.explanation) {
          aiExplanation = result.explanation;
        }
      },
    }
  );
}

async function detectSubscription() {
  if (!_id) return;

  isLoadingSubscriptionDetection = true;
  try {
    const result = await trpc().payeeRoutes.classifySubscription.query({
      payeeId: _id,
    });

    subscriptionInfo = result;
  } catch (error) {
    console.error('Failed to detect subscription:', error);
  } finally {
    isLoadingSubscriptionDetection = false;
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
    detectSubscription();
  }
});
</script>

<form id={_formId} method="post" action="?/save-payee" use:enhance class="space-y-6">
  <input hidden value={$formData.id} name="id" />

  <!-- Header with Apply Intelligence dropdown -->
  <div class="flex items-center justify-end gap-2">
    <DropdownMenu.Root>
      <DropdownMenu.Trigger disabled={isApplyingAllIntelligence || !$formData.name?.trim()}>
        {#snippet child({ props })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="gap-2"
            {...props}
          >
            {#if isApplyingAllIntelligence}
              <Loader2 class="h-4 w-4 animate-spin" />
              Applying...
            {:else}
              <Wand2 class="h-4 w-4" />
              Apply Intelligence
              <ChevronDown class="h-3 w-3 opacity-50" />
            {/if}
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>

      <DropdownMenu.Content align="end" class="w-64">
        <DropdownMenu.Label>Intelligence Strategy</DropdownMenu.Label>
        <DropdownMenu.Separator />

        {#each intelligenceStrategies as strategy (strategy.value)}
          {@const isSelected = selectedStrategy === strategy.value}
          {@const isMlDisabled = !_id && (strategy.value === 'ml-only' || strategy.value === 'ml-then-llm')}
          <DropdownMenu.Item
            class="gap-3 {isMlDisabled ? 'opacity-50' : ''}"
            disabled={isMlDisabled}
            onclick={() => {
              if (!isMlDisabled) {
                selectedStrategy = strategy.value;
                handleApplyAllIntelligence(strategy.value);
              }
            }}
          >
            <div class="flex items-center gap-1.5">
              {#if strategy.icon === 'sparkles'}
                <Sparkles class="h-4 w-4 text-violet-500" />
              {:else if strategy.icon === 'brain'}
                <Brain class="h-4 w-4 text-blue-500" />
              {:else if strategy.icon === 'sparkles-brain'}
                <Sparkles class="h-4 w-4 text-violet-500" />
                <ArrowRight class="h-3 w-3 text-muted-foreground" />
                <Brain class="h-4 w-4 text-blue-500" />
              {:else if strategy.icon === 'brain-sparkles'}
                <Brain class="h-4 w-4 text-blue-500" />
                <ArrowRight class="h-3 w-3 text-muted-foreground" />
                <Sparkles class="h-4 w-4 text-violet-500" />
              {/if}
            </div>
            <div class="flex flex-col flex-1">
              <span class="font-medium">{strategy.label}</span>
              <span class="text-muted-foreground text-xs">
                {isMlDisabled ? 'Requires existing payee with history' : strategy.description}
              </span>
            </div>
            {#if isSelected}
              <CircleCheck class="h-4 w-4 text-primary" />
            {/if}
          </DropdownMenu.Item>
        {/each}

        <DropdownMenu.Separator />
        <div class="px-2 py-1.5">
          <p class="text-muted-foreground text-xs">
            <strong>LLM</strong> uses AI language models for suggestions.
            <strong>ML</strong> learns from your transaction history.
          </p>
        </div>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </div>

  <Tabs.Root bind:value={activeTab} class="w-full">
    <Tabs.List class="grid w-full grid-cols-3">
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
    </Tabs.List>

    <!-- Basic Information Tab -->
    <Tabs.Content value="basic" class="space-y-6">
      <PayeeBasicInfoForm
        {formData}
        {entityForm}
        {categories}
        payeeId={_id}
        aiPreferences={payeeAiPreferences}
        {enhancementSummary}
        isGlobalApplying={isApplyingAllIntelligence}
      />
    </Tabs.Content>

    <!-- Contact Information Tab -->
    <Tabs.Content value="contact" class="space-y-6">
      <PayeeContactForm {formData} {entityForm} payeeName={$formData.name} {enhancementSummary} isGlobalApplying={isApplyingAllIntelligence} />
    </Tabs.Content>

    <!-- Business Information Tab -->
    <Tabs.Content value="business" class="space-y-6">
      <PayeeBusinessForm
        {formData}
        {entityForm}
        {isUpdate}
        {subscriptionInfo}
        {isLoadingSubscriptionDetection}
        onDetectSubscription={detectSubscription}
        payeeName={$formData.name}
        {enhancementSummary}
        isGlobalApplying={isApplyingAllIntelligence} />
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
      {#if _id}
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
        onclick={() => deletePayee(_id!)}
        class={buttonVariants({ variant: 'destructive' })}>Continue</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<!-- Unsaved Changes Confirmation Dialog -->
<AlertDialog.Root bind:open={unsavedChangesDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <TriangleAlert class="h-5 w-5 text-amber-600 dark:text-amber-500" />
        </div>
        <AlertDialog.Title>Unsaved Changes</AlertDialog.Title>
      </div>
      <AlertDialog.Description class="pt-2">
        You have unsaved changes that will be lost if you leave this page. Are you sure you want to discard your changes?
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel onclick={cancelNavigation}>Stay on Page</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={confirmNavigation}
        class={buttonVariants({ variant: 'destructive' })}>
        Discard Changes
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
