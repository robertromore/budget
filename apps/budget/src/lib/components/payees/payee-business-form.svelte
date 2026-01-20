<script lang="ts">
import { IntelligenceModeToggle, type IntelligenceMode } from '$lib/components/intelligence';
import { intelligenceInput } from '$lib/components/intelligence-input';
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as Collapsible from '$lib/components/ui/collapsible';
import * as Form from '$lib/components/ui/form';
import { Input } from '$lib/components/ui/input';
import { Textarea } from '$lib/components/ui/textarea';
import { type FieldEnhancementSummary } from '$lib/query/payee-enhancements';
import { inferPayeeDetails, type PayeeDetailsSuggestions } from '$lib/query/payees';
import { normalize } from '$lib/utils/string-utilities';
// Icons
import Building from '@lucide/svelte/icons/building';
import Calendar from '@lucide/svelte/icons/calendar';
import ChevronDown from '@lucide/svelte/icons/chevron-down';
import LoaderCircle from '@lucide/svelte/icons/loader-circle';
import Settings from '@lucide/svelte/icons/settings';

interface Props {
  formData: any; // Store type from superform
  entityForm: any;
  isUpdate: boolean;
  subscriptionInfo: any;
  isLoadingSubscriptionDetection: boolean;
  onDetectSubscription: () => Promise<void>;
  payeeName?: string; // For AI inference
  /** Enhancement summary for each field */
  enhancementSummary?: FieldEnhancementSummary[];
  /** Whether the global apply intelligence is in progress */
  isGlobalApplying?: boolean;
}

let {
  formData,
  entityForm,
  isUpdate,
  subscriptionInfo,
  isLoadingSubscriptionDetection,
  onDetectSubscription,
  payeeName,
  enhancementSummary = [],
  isGlobalApplying = false,
}: Props = $props();

// Helper to get the mode for a field from enhancement summary
function getFieldMode(fieldName: string): IntelligenceMode {
  const enhancementInfo = enhancementSummary.find((s) => s.fieldName === fieldName);
  return enhancementInfo?.lastMode ?? 'none';
}

// Per-field intelligence mode state
let fieldModes = $state<Record<string, IntelligenceMode>>({
  merchantCategoryCode: getFieldMode('merchantCategoryCode'),
  tags: getFieldMode('tags'),
  preferredPaymentMethods: getFieldMode('preferredPaymentMethods'),
});

// Update fieldModes when enhancementSummary changes
$effect(() => {
  const summary = enhancementSummary;
  if (summary.length > 0) {
    for (const info of summary) {
      if (info.lastMode && info.fieldName in fieldModes) {
        fieldModes[info.fieldName] = info.lastMode;
      }
    }
  }
});

// Helper to get enhancement info for a field
function getEnhancementInfo(fieldName: string): FieldEnhancementSummary | undefined {
  return enhancementSummary.find((s) => s.fieldName === fieldName);
}

// Check if a field has been enhanced
function isFieldEnhanced(fieldName: string): boolean {
  const info = getEnhancementInfo(fieldName);
  return info?.isEnhanced ?? false;
}

// No modes are disabled
const disabledModes: { mode: IntelligenceMode; reason: string }[] = [];

// AI inference mutation
const inferMutation = inferPayeeDetails().options();

// Track which field is being enhanced
let enhancingField = $state<string | null>(null);

// Handle field intelligence action
async function handleFieldAction(field: string) {
  if (!payeeName?.trim()) return;
  enhancingField = field;

  try {
    const result = await inferMutation.mutateAsync({ name: payeeName });
    if (result.success && result.suggestions) {
      applySuggestions(result.suggestions, field);
    }
  } finally {
    enhancingField = null;
  }
}

// Apply suggestions to form fields
function applySuggestions(suggestions: PayeeDetailsSuggestions, scope: string | 'all') {
  if (scope === 'all' || scope === 'merchantCategoryCode') {
    if (suggestions.suggestedMCC) {
      $formData.merchantCategoryCode = suggestions.suggestedMCC;
    }
  }
  if (scope === 'all' || scope === 'tags') {
    if (suggestions.suggestedTags && suggestions.suggestedTags.length > 0) {
      // Merge with existing tags if present
      const existingTags = $formData.tags
        ? $formData.tags.split(',').map((t: string) => normalize(t)).filter(Boolean)
        : [];
      const newTags = [...new Set([...existingTags, ...suggestions.suggestedTags])];
      $formData.tags = newTags.join(', ');
    }
  }
  if (scope === 'all' || scope === 'preferredPaymentMethods') {
    if (suggestions.suggestedPaymentMethods && suggestions.suggestedPaymentMethods.length > 0) {
      // Format payment methods nicely (replace underscores with spaces)
      const formatted = suggestions.suggestedPaymentMethods.map((m) =>
        m.replace(/_/g, ' ')
      );
      $formData.preferredPaymentMethods = formatted.join(', ');
    }
  }
}
</script>

<Card.Root>
  <Card.Header>
    <div class="flex items-center gap-2">
      <Building class="text-primary h-5 w-5" />
      <Card.Title>Business & Payment Details</Card.Title>
    </div>
    <Card.Description>
      Business-specific information and payment processing details.
    </Card.Description>
  </Card.Header>
  <Card.Content class="space-y-4">
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <!-- Merchant Category Code -->
      <Form.Field form={entityForm} name="merchantCategoryCode">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>Merchant Category Code</Form.Label>
            <div class="flex gap-2">
              <div
                class="flex-1"
                use:intelligenceInput={{
                  id: 'business-mcc',
                  title: 'Infer MCC',
                  modes: ['llm'],
                  order: 20,
                  onTrigger: async () => handleFieldAction('merchantCategoryCode')
                }}
              >
                <Input
                  {...props}
                  bind:value={$formData.merchantCategoryCode}
                  placeholder="4-digit MCC"
                  maxlength={4}
                />
              </div>
              <IntelligenceModeToggle
                mode={fieldModes.merchantCategoryCode}
                onModeChange={(m) => (fieldModes.merchantCategoryCode = m)}
                onAction={() => handleFieldAction('merchantCategoryCode')}
                isPending={isGlobalApplying || enhancingField === 'merchantCategoryCode'}
                disabled={!payeeName?.trim()}
                disabledModes={disabledModes}
                variant="icon"
                isEnhanced={isFieldEnhanced('merchantCategoryCode')}
                enhancedAt={getEnhancementInfo('merchantCategoryCode')?.lastEnhancedAt}
                enhancedConfidence={getEnhancementInfo('merchantCategoryCode')?.lastConfidence}
              />
            </div>
            <Form.Description>Standard industry classification code</Form.Description>
            <Form.FieldErrors />
          {/snippet}
        </Form.Control>
      </Form.Field>

      <!-- Alert Threshold -->
      <Form.Field form={entityForm} name="alertThreshold">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>Alert Threshold</Form.Label>
            <Input
              {...props}
              bind:value={$formData.alertThreshold}
              type="number"
              step="0.01"
              placeholder="0.00" />
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
              <Calendar class="text-primary h-4 w-4" />
              <Card.Title class="text-base">Subscription Detection</Card.Title>
            </div>
            <Button
              variant="outline"
              size="sm"
              onclick={onDetectSubscription}
              disabled={isLoadingSubscriptionDetection}>
              {#if isLoadingSubscriptionDetection}
                <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
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
                <div class="text-muted-foreground text-sm">
                  <p><strong>Type:</strong> {subscriptionInfo.details.type}</p>
                  <p><strong>Frequency:</strong> {subscriptionInfo.details.frequency}</p>
                  {#if subscriptionInfo.details.estimatedCost}
                    <p>
                      <strong>Estimated Cost:</strong> ${subscriptionInfo.details.estimatedCost}
                    </p>
                  {/if}
                </div>
              {/if}
            </div>
          {:else}
            <p class="text-muted-foreground text-sm">
              Click "Detect" to analyze subscription patterns
            </p>
          {/if}
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Tags -->
    <Form.Field form={entityForm} name="tags">
      <Form.Control>
        {#snippet children({ props })}
          <Form.Label>Tags</Form.Label>
          <div class="flex gap-2">
            <div
              class="flex-1"
              use:intelligenceInput={{
                id: 'business-tags',
                title: 'Suggest Tags',
                modes: ['llm'],
                order: 21,
                onTrigger: async () => handleFieldAction('tags')
              }}
            >
              <Input
                {...props}
                bind:value={$formData.tags}
                placeholder="comma, separated, tags"
              />
            </div>
            <IntelligenceModeToggle
              mode={fieldModes.tags}
              onModeChange={(m) => (fieldModes.tags = m)}
              onAction={() => handleFieldAction('tags')}
              isPending={isGlobalApplying || enhancingField === 'tags'}
              disabled={!payeeName?.trim()}
              disabledModes={disabledModes}
              variant="icon"
              isEnhanced={isFieldEnhanced('tags')}
              enhancedAt={getEnhancementInfo('tags')?.lastEnhancedAt}
              enhancedConfidence={getEnhancementInfo('tags')?.lastConfidence}
            />
          </div>
          <Form.Description>Comma-separated tags for organization</Form.Description>
          <Form.FieldErrors />
        {/snippet}
      </Form.Control>
    </Form.Field>

    <!-- Preferred Payment Methods -->
    <Form.Field form={entityForm} name="preferredPaymentMethods">
      <Form.Control>
        {#snippet children({ props })}
          <Form.Label>Preferred Payment Methods</Form.Label>
          <div class="flex gap-2">
            <div
              class="flex-1"
              use:intelligenceInput={{
                id: 'business-payment-methods',
                title: 'Suggest Payment Methods',
                modes: ['llm'],
                order: 22,
                onTrigger: async () => handleFieldAction('preferredPaymentMethods')
              }}
            >
              <Input
                {...props}
                bind:value={$formData.preferredPaymentMethods}
                placeholder="credit card, bank transfer, cash"
              />
            </div>
            <IntelligenceModeToggle
              mode={fieldModes.preferredPaymentMethods}
              onModeChange={(m) => (fieldModes.preferredPaymentMethods = m)}
              onAction={() => handleFieldAction('preferredPaymentMethods')}
              isPending={isGlobalApplying || enhancingField === 'preferredPaymentMethods'}
              disabled={!payeeName?.trim()}
              disabledModes={disabledModes}
              variant="icon"
              isEnhanced={isFieldEnhanced('preferredPaymentMethods')}
              enhancedAt={getEnhancementInfo('preferredPaymentMethods')?.lastEnhancedAt}
              enhancedConfidence={getEnhancementInfo('preferredPaymentMethods')?.lastConfidence}
            />
          </div>
          <Form.Description>Comma-separated list of accepted payment methods</Form.Description>
          <Form.FieldErrors />
        {/snippet}
      </Form.Control>
    </Form.Field>

    <!-- Advanced Settings (Collapsible) -->
    <Collapsible.Root class="mt-4">
      <Collapsible.Trigger class="flex w-full items-center justify-between rounded-lg border p-3 hover:bg-muted/50">
        <div class="flex items-center gap-2">
          <Settings class="h-4 w-4 text-muted-foreground" />
          <span class="text-sm font-medium">Advanced Settings</span>
        </div>
        <ChevronDown class="h-4 w-4 text-muted-foreground transition-transform in-data-[state=open]:rotate-180" />
      </Collapsible.Trigger>
      <Collapsible.Content class="pt-4">
        <Form.Field form={entityForm} name="subscriptionInfo">
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label>Subscription Metadata</Form.Label>
              <Textarea
                {...props}
                bind:value={$formData.subscriptionInfo}
                placeholder="JSON metadata for subscription details"
                rows={4}
              />
              <Form.Description>
                Advanced subscription configuration in JSON format. Used for detailed billing tracking.
              </Form.Description>
              <Form.FieldErrors />
            {/snippet}
          </Form.Control>
        </Form.Field>
      </Collapsible.Content>
    </Collapsible.Root>
  </Card.Content>
</Card.Root>
