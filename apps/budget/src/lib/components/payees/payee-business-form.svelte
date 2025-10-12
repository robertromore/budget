<script lang="ts">
import * as Form from '$lib/components/ui/form';
import * as Card from '$lib/components/ui/card';
import {Input} from '$lib/components/ui/input';
import {Button} from '$lib/components/ui/button';
import {Badge} from '$lib/components/ui/badge';

// Icons
import Building from '@lucide/svelte/icons/building';
import Calendar from '@lucide/svelte/icons/calendar';
import LoaderCircle from '@lucide/svelte/icons/loader-circle';

interface Props {
	formData: any; // Store type from superform
	entityForm: any;
	isUpdate: boolean;
	subscriptionInfo: any;
	isLoadingSubscriptionDetection: boolean;
	onDetectSubscription: () => Promise<void>;
}

let {
	formData,
	entityForm,
	isUpdate,
	subscriptionInfo,
	isLoadingSubscriptionDetection,
	onDetectSubscription
}: Props = $props();
</script>

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
						<Button variant="outline" size="sm" onclick={onDetectSubscription} disabled={isLoadingSubscriptionDetection}>
							{#if isLoadingSubscriptionDetection}
								<LoaderCircle class="h-4 w-4 animate-spin mr-2" />
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