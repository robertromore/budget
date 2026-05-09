// Account Components Barrel Export
export { default as AddTransactionDialog } from "./add-transaction-dialog.svelte";

// Transaction-table primitives (moved to shared lib)
export {
  DataTable,
  DataTableActions,
  DataTableCheckbox,
  DataTableColumnHeader,
  DataTableFacetedFilter,
  DataTableFacetedFilterDateWithOperators,
  DataTablePagination,
  DataTableToolbar,
  DataTableViewOptions,
  TransactionTableContainer,
} from "$lib/components/transactions-table";

// HSA Components Barrel Export
export { default as HsaDashboard } from "./hsa-dashboard.svelte";
export { default as MedicalExpenseForm } from "./medical-expense-form.svelte";
export { default as ReceiptUploadWidget } from "./receipt-upload-widget.svelte";
export { default as ExpenseList } from "./expense-list.svelte";
export { default as ExpenseTableContainer } from "./expense-table-container.svelte";
export { default as ExpenseWizard } from "./expense-wizard.svelte";
export { default as ExpenseDataTable } from "./expense-data-table.svelte";

// Settings Tab
export { default as SettingsTab } from "./settings-tab.svelte";

// Import Tab
export { default as ImportTab } from "./import-tab.svelte";

// Intelligence Tab
export { default as IntelligenceTab } from "./intelligence-tab.svelte";

// Automation Tab
export { default as AutomationTab } from "./automation-tab.svelte";

// Subscriptions Tab
export { default as SubscriptionsTab } from "./subscriptions-tab.svelte";

// Documents Tab
export { default as DocumentsTab } from "./documents-tab.svelte";
