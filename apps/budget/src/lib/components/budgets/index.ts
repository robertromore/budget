// Globally used components (used across multiple routes)
export { default as BudgetSelector } from "./budget-selector.svelte";
export { default as BudgetProgress } from "./budget-progress.svelte";

// Form/Period management components (potentially reusable)
export { default as BudgetPeriodTemplateForm } from "./budget-period-template-form.svelte";
export { default as BudgetPeriodInstanceManager } from "./budget-period-instance-manager.svelte";
export { default as BudgetImpactPreview } from "./budget-impact-preview.svelte";

// Envelope components (reusable)
export { default as EnvelopeAllocationCard } from "./envelope-allocation-card.svelte";
export { default as EnvelopeCreateSheet } from "./envelope-create-sheet.svelte";
export { default as EnvelopeSettingsSheet } from "./envelope-settings-sheet.svelte";
export { default as EnvelopeDeficitRecoveryDialog } from "./envelope-deficit-recovery-dialog.svelte";

// Note: Route-specific components have been moved to:
// - /routes/budgets/(components)/analytics/
// - /routes/budgets/(components)/dialogs/
// - /routes/budgets/(components)/search/
// - /routes/budgets/(components)/managers/
// - /routes/budgets/(components)/forecast/
