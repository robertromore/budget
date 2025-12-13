<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as Form from '$lib/components/ui/form';
import { Input } from '$lib/components/ui/input';
import { Textarea } from '$lib/components/ui/textarea';
// Icons
import CircleCheck from '@lucide/svelte/icons/circle-check';
import LoaderCircle from '@lucide/svelte/icons/loader-circle';
import Phone from '@lucide/svelte/icons/phone';

interface Props {
  formData: any; // Store type from superform
  entityForm: any;
  isUpdate: boolean;
  contactValidation: any;
  isLoadingContactValidation: boolean;
  onValidateContact: () => Promise<void>;
}

let {
  formData,
  entityForm,
  isUpdate,
  contactValidation,
  isLoadingContactValidation,
  onValidateContact,
}: Props = $props();
</script>

<Card.Root>
  <Card.Header>
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Phone class="text-primary h-5 w-5" />
        <Card.Title>Contact Information</Card.Title>
      </div>
      {#if isUpdate}
        <Button
          variant="outline"
          size="sm"
          onclick={onValidateContact}
          disabled={isLoadingContactValidation}>
          {#if isLoadingContactValidation}
            <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
          {/if}
          Validate & Enrich
        </Button>
      {/if}
    </div>
    <Card.Description>Contact details and validation status.</Card.Description>
  </Card.Header>
  <Card.Content class="space-y-4">
    {#if contactValidation}
      <div class="bg-muted/50 rounded-lg p-4">
        <h4 class="mb-2 flex items-center gap-2 font-medium">
          <CircleCheck class="h-4 w-4 text-green-500" />
          Validation Results
        </h4>
        <div class="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
          {#if contactValidation.phoneValidation}
            <div class="flex items-center gap-2">
              <Badge
                variant={contactValidation.phoneValidation.isValid ? 'default' : 'destructive'}>
                Phone: {contactValidation.phoneValidation.isValid ? 'Valid' : 'Invalid'}
              </Badge>
            </div>
          {/if}
          {#if contactValidation.emailValidation}
            <div class="flex items-center gap-2">
              <Badge
                variant={contactValidation.emailValidation.isValid ? 'default' : 'destructive'}>
                Email: {contactValidation.emailValidation.isValid ? 'Valid' : 'Invalid'}
              </Badge>
            </div>
          {/if}
          {#if contactValidation.websiteValidation}
            <div class="flex items-center gap-2">
              <Badge
                variant={contactValidation.websiteValidation.isAccessible
                  ? 'default'
                  : 'destructive'}>
                Website: {contactValidation.websiteValidation.isAccessible
                  ? 'Accessible'
                  : 'Inaccessible'}
              </Badge>
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <!-- Phone -->
      <Form.Field form={entityForm} name="phone">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>Phone Number</Form.Label>
            <Input {...props} bind:value={$formData.phone} placeholder="+1 (555) 123-4567" />
            <Form.FieldErrors />
          {/snippet}
        </Form.Control>
      </Form.Field>

      <!-- Email -->
      <Form.Field form={entityForm} name="email">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>Email Address</Form.Label>
            <Input
              {...props}
              bind:value={$formData.email}
              type="email"
              placeholder="contact@example.com" />
            <Form.FieldErrors />
          {/snippet}
        </Form.Control>
      </Form.Field>

      <!-- Website -->
      <Form.Field form={entityForm} name="website">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>Website</Form.Label>
            <Input {...props} bind:value={$formData.website} placeholder="https://example.com" />
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
          <Textarea
            {...props}
            bind:value={$formData.address}
            placeholder="Street address, city, state, postal code" />
          <Form.FieldErrors />
        {/snippet}
      </Form.Control>
    </Form.Field>
  </Card.Content>
</Card.Root>
