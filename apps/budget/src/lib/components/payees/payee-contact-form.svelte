<script lang="ts">
import { IntelligenceModeToggle, type IntelligenceMode } from '$lib/components/intelligence';
import { intelligenceInput } from '$lib/components/intelligence-input';
import * as Card from '$lib/components/ui/card';
import * as Form from '$lib/components/ui/form';
import { Input } from '$lib/components/ui/input';
import { Textarea } from '$lib/components/ui/textarea';
import type { FieldEnhancementSummary } from '$lib/query/payee-enhancements';
import { enrichPayeeContact, inferPayeeDetails } from '$lib/query/payees';
import type { EnhanceableField } from '$lib/schema';
// Icons
import Phone from '@lucide/svelte/icons/phone';

interface Props {
  formData: any; // Store type from superform
  entityForm: any;
  payeeName?: string; // For AI inference
  enhancementSummary?: FieldEnhancementSummary[]; // Enhancement tracking from parent
  /** Whether the global apply intelligence is in progress */
  isGlobalApplying?: boolean;
}

let { formData, entityForm, payeeName, enhancementSummary = [], isGlobalApplying = false }: Props = $props();

// Per-field intelligence mode state
let fieldModes = $state<Record<string, IntelligenceMode>>({
  phone: 'none',
  email: 'none',
  website: 'none',
  address: 'none',
});

// Update fieldModes when enhancementSummary changes (e.g., after global apply)
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
function getEnhancementInfo(fieldName: EnhanceableField): FieldEnhancementSummary | undefined {
  return enhancementSummary.find((f) => f.fieldName === fieldName);
}

// Helper to check if a field has been enhanced
function isFieldEnhanced(fieldName: EnhanceableField): boolean {
  return getEnhancementInfo(fieldName)?.isEnhanced ?? false;
}

// Both modes available via global apply, but field-level defaults to LLM
const disabledModes: { mode: IntelligenceMode; reason: string }[] = [];

// AI inference mutation for website suggestion
const inferMutation = inferPayeeDetails().options();

// Web search mutation for full contact enrichment
const enrichMutation = enrichPayeeContact().options();

// Track which field is being enhanced
let enhancingField = $state<string | null>(null);

// Handle website field action (uses LLM inference)
async function handleWebsiteAction() {
  if (!payeeName?.trim()) return;
  enhancingField = 'website';

  try {
    const result = await inferMutation.mutateAsync({ name: payeeName });
    if (result.success && result.suggestions?.suggestedWebsite) {
      $formData.website = result.suggestions.suggestedWebsite;
    }
  } finally {
    enhancingField = null;
  }
}

// Handle contact field action (uses web search enrichment)
async function handleContactFieldAction(field: string) {
  if (!payeeName?.trim()) return;
  enhancingField = field;

  try {
    const result = await enrichMutation.mutateAsync({ name: payeeName });
    if (result.success && result.suggestions) {
      const { website, phone, email, address } = result.suggestions;
      // Only update fields that have values from the search
      if (website) $formData.website = website;
      if (phone) $formData.phone = phone;
      if (email) $formData.email = email;
      if (address) $formData.address = address;
    }
  } finally {
    enhancingField = null;
  }
}
</script>

<Card.Root>
  <Card.Header>
    <div class="flex items-center gap-2">
      <Phone class="text-primary h-5 w-5" />
      <Card.Title>Contact Information</Card.Title>
    </div>
    <Card.Description>Contact details for this payee.</Card.Description>
  </Card.Header>
  <Card.Content class="space-y-4">
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <!-- Phone -->
      <Form.Field form={entityForm} name="phone">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>Phone Number</Form.Label>
            <div class="flex gap-2">
              <div
                class="flex-1"
                use:intelligenceInput={{
                  id: 'contact-phone',
                  title: 'Find Phone',
                  modes: ['llm'],
                  order: 10,
                  onTrigger: async () => handleContactFieldAction('phone')
                }}
              >
                <Input {...props} bind:value={$formData.phone} placeholder="+1 (555) 123-4567" />
              </div>
              <IntelligenceModeToggle
                mode={fieldModes.phone}
                onModeChange={(m) => (fieldModes.phone = m)}
                onAction={() => handleContactFieldAction('phone')}
                isPending={isGlobalApplying || enhancingField === 'phone'}
                disabled={!payeeName?.trim()}
                disabledModes={disabledModes}
                variant="icon"
                isEnhanced={isFieldEnhanced('phone')}
                enhancedAt={getEnhancementInfo('phone')?.lastEnhancedAt}
                enhancedConfidence={getEnhancementInfo('phone')?.lastConfidence}
              />
            </div>
            <Form.FieldErrors />
          {/snippet}
        </Form.Control>
      </Form.Field>

      <!-- Email -->
      <Form.Field form={entityForm} name="email">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>Email Address</Form.Label>
            <div class="flex gap-2">
              <div
                class="flex-1"
                use:intelligenceInput={{
                  id: 'contact-email',
                  title: 'Find Email',
                  modes: ['llm'],
                  order: 11,
                  onTrigger: async () => handleContactFieldAction('email')
                }}
              >
                <Input
                  {...props}
                  bind:value={$formData.email}
                  type="email"
                  placeholder="contact@example.com"
                />
              </div>
              <IntelligenceModeToggle
                mode={fieldModes.email}
                onModeChange={(m) => (fieldModes.email = m)}
                onAction={() => handleContactFieldAction('email')}
                isPending={isGlobalApplying || enhancingField === 'email'}
                disabled={!payeeName?.trim()}
                disabledModes={disabledModes}
                variant="icon"
                isEnhanced={isFieldEnhanced('email')}
                enhancedAt={getEnhancementInfo('email')?.lastEnhancedAt}
                enhancedConfidence={getEnhancementInfo('email')?.lastConfidence}
              />
            </div>
            <Form.FieldErrors />
          {/snippet}
        </Form.Control>
      </Form.Field>

      <!-- Website -->
      <Form.Field form={entityForm} name="website">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>Website</Form.Label>
            <div class="flex gap-2">
              <div
                class="flex-1"
                use:intelligenceInput={{
                  id: 'contact-website',
                  title: 'Find Website',
                  modes: ['llm'],
                  order: 12,
                  onTrigger: async () => handleWebsiteAction()
                }}
              >
                <Input
                  {...props}
                  bind:value={$formData.website}
                  placeholder="https://example.com"
                />
              </div>
              <IntelligenceModeToggle
                mode={fieldModes.website}
                onModeChange={(m) => (fieldModes.website = m)}
                onAction={() => handleWebsiteAction()}
                isPending={isGlobalApplying || enhancingField === 'website'}
                disabled={!payeeName?.trim()}
                disabledModes={disabledModes}
                variant="icon"
                isEnhanced={isFieldEnhanced('website')}
                enhancedAt={getEnhancementInfo('website')?.lastEnhancedAt}
                enhancedConfidence={getEnhancementInfo('website')?.lastConfidence}
              />
            </div>
            <Form.FieldErrors />
          {/snippet}
        </Form.Control>
      </Form.Field>

      <!-- Account Number -->
      <Form.Field form={entityForm} name="accountNumber">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>Account Number</Form.Label>
            <Input
              {...props}
              bind:value={$formData.accountNumber}
              placeholder="Account or reference number" />
            <Form.FieldErrors />
          {/snippet}
        </Form.Control>
      </Form.Field>
    </div>

    <!-- Address -->
    <Form.Field form={entityForm} name="address">
      <Form.Control>
        {#snippet children({ props })}
          <Form.Label>Address</Form.Label>
          <div class="flex gap-2">
            <div
              class="flex-1"
              use:intelligenceInput={{
                id: 'contact-address',
                title: 'Find Address',
                modes: ['llm'],
                order: 13,
                onTrigger: async () => handleContactFieldAction('address')
              }}
            >
              <Textarea
                {...props}
                bind:value={$formData.address}
                placeholder="Street address, city, state, postal code"
              />
            </div>
            <IntelligenceModeToggle
              mode={fieldModes.address}
              onModeChange={(m) => (fieldModes.address = m)}
              onAction={() => handleContactFieldAction('address')}
              isPending={isGlobalApplying || enhancingField === 'address'}
              disabled={!payeeName?.trim()}
              disabledModes={disabledModes}
              variant="icon"
              isEnhanced={isFieldEnhanced('address')}
              enhancedAt={getEnhancementInfo('address')?.lastEnhancedAt}
              enhancedConfidence={getEnhancementInfo('address')?.lastConfidence}
            />
          </div>
          <Form.FieldErrors />
        {/snippet}
      </Form.Control>
    </Form.Field>
  </Card.Content>
</Card.Root>
