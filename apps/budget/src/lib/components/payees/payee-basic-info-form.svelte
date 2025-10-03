<script lang="ts">
import * as Form from '$lib/components/ui/form';
import * as Card from '$lib/components/ui/card';
import * as Select from '$lib/components/ui/select';
import {Input} from '$lib/components/ui/input';
import {Textarea} from '$lib/components/ui/textarea';
import {Switch} from '$lib/components/ui/switch';
import {Label} from '$lib/components/ui/label';
import {payeeTypes, paymentFrequencies} from '$lib/schema/payees';
import NumericInput from '$lib/components/input/numeric-input.svelte';
import EntityInput from '$lib/components/input/entity-input.svelte';
import ManageCategoryForm from '$lib/components/forms/manage-category-form.svelte';
import {CategoriesState} from '$lib/states/entities/categories.svelte';
import type {EditableEntityItem} from '$lib/types';

// Icons
import User from '@lucide/svelte/icons/user';
import Tag from '@lucide/svelte/icons/tag';

interface Props {
	formData: any; // Store type from superform
	entityForm: any;
	categories: any[];
}

let {formData, entityForm, categories}: Props = $props();

// Category state and handlers
const categoriesState = CategoriesState.get();

// Make categories reactive by deriving from state
const reactiveCategories = $derived(categoriesState.all as EditableEntityItem[]);

let selectedCategory = $derived.by(() => {
	if (!$formData.defaultCategoryId) return undefined;
	return reactiveCategories.find(cat => cat.id === Number($formData.defaultCategoryId)) as EditableEntityItem | undefined;
});

const handleCategorySelect = (category?: EditableEntityItem) => {
	if (category) {
		$formData.defaultCategoryId = category.id.toString();
	} else {
		$formData.defaultCategoryId = '0';
	}
};

const handleCategorySave = (category: EditableEntityItem, isNew: boolean) => {
	if (isNew) {
		categoriesState.addCategory(category as any);
	} else {
		categoriesState.updateCategory(category as any);
	}
	$formData.defaultCategoryId = category.id.toString();
};

const handleCategoryDelete = async (id: number) => {
	await categoriesState.deleteCategory(id);
	if ($formData.defaultCategoryId === id.toString()) {
		$formData.defaultCategoryId = '0';
	}
};

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
</script>

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
							entityLabel="Category"
							entities={reactiveCategories}
							bind:value={selectedCategory}
							handleSubmit={handleCategorySelect}
							buttonClass="w-full"
							icon={Tag}
							management={{
								enable: true,
								component: ManageCategoryForm,
								onSave: handleCategorySave,
								onDelete: handleCategoryDelete
							}}
						/>
						<Form.FieldErrors />
					{/snippet}
				</Form.Control>
			</Form.Field>

			<!-- Average Amount -->
			<Form.Field form={entityForm} name="avgAmount">
				<Form.Control>
					{#snippet children({props})}
						<Form.Label>Average Transaction Amount</Form.Label>
						<NumericInput bind:value={$formData.avgAmount} buttonClass="w-full" />
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
