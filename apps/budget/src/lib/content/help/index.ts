/**
 * Help Content Registry
 *
 * Maps help IDs to their documentation content.
 * Content is loaded dynamically when needed.
 */

// Import all markdown content
import sidebar from "./sidebar.md?raw";
import workspaceSwitcher from "./workspace-switcher.md?raw";
import sidebarTrigger from "./sidebar-trigger.md?raw";
import themeToggle from "./theme-toggle.md?raw";
import fontSizeToggle from "./font-size-toggle.md?raw";
import themeButton from "./theme-button.md?raw";
import aiAssistant from "./ai-assistant.md?raw";
import intelligenceInputButton from "./intelligence-input-button.md?raw";
import helpButton from "./help-button.md?raw";
import settingsButton from "./settings-button.md?raw";
import headerPageActions from "./header-page-actions.md?raw";
import headerPageTabs from "./header-page-tabs.md?raw";
import quickAddTransaction from "./quick-add-transaction.md?raw";
import accountsList from "./accounts-list.md?raw";
import budgetsList from "./budgets-list.md?raw";
import payeesList from "./payees-list.md?raw";
import transactionTable from "./transaction-table.md?raw";
import accountTabs from "./account-tabs.md?raw";
import intelligenceTab from "./intelligence-tab.md?raw";
// Dashboard help content
import dashboardStats from "./dashboard-stats.md?raw";
import quickActions from "./quick-actions.md?raw";
import financialOverview from "./financial-overview.md?raw";
import payeeIntelligenceSummary from "./payee-intelligence-summary.md?raw";
// Accounts page help content
import accountsPageHeader from "./accounts-page-header.md?raw";
import addAccountButton from "./add-account-button.md?raw";
import accountsGrid from "./accounts-grid.md?raw";
// Budgets page help content
import budgetsPageHeader from "./budgets-page-header.md?raw";
import budgetSummary from "./budget-summary.md?raw";
import budgetTabs from "./budget-tabs.md?raw";
// Payees page help content
import payeesPageHeader from "./payees-page-header.md?raw";
import payeesTable from "./payees-table.md?raw";
// Categories page help content
import categoriesPageHeader from "./categories-page-header.md?raw";
import categoriesList from "./categories-list.md?raw";
// Schedules page help content
import schedulesPageHeader from "./schedules-page-header.md?raw";
import schedulesTable from "./schedules-table.md?raw";
// Import page help content
import importPage from "./import-page.md?raw";
// Intelligence page help content
import intelligencePageHeader from "./intelligence-page-header.md?raw";
import mlInsights from "./ml-insights.md?raw";
// Settings page help content
import settingsAppearance from "./settings-appearance.md?raw";
import settingsDisplay from "./settings-display.md?raw";
import settingsMl from "./settings-ml.md?raw";
import settingsLlm from "./settings-llm.md?raw";
import settingsImportProfiles from "./settings-import-profiles.md?raw";
import settingsAdvanced from "./settings-advanced.md?raw";
// Display settings fields
import displayDateFormat from "./display-date-format.md?raw";
import displayCurrencySymbol from "./display-currency-symbol.md?raw";
import displayNumberFormat from "./display-number-format.md?raw";
import displayDecimalPlaces from "./display-decimal-places.md?raw";
import displayHeaderActions from "./display-header-actions.md?raw";
import displayHeaderActionsDisplay from "./display-header-actions-display.md?raw";
import displayHeaderTabs from "./display-header-tabs.md?raw";
import displayHeaderTabsDisplay from "./display-header-tabs-display.md?raw";
import displayTableOptions from "./display-table-options.md?raw";
// ML settings fields
import mlMasterToggle from "./ml-master-toggle.md?raw";
import mlFeatures from "./ml-features.md?raw";
import mlAnomalySensitivity from "./ml-anomaly-sensitivity.md?raw";
import mlForecastHorizon from "./ml-forecast-horizon.md?raw";
import mlSimilarityThreshold from "./ml-similarity-threshold.md?raw";
import mlWebSearch from "./ml-web-search.md?raw";
import mlWebSearchProvider from "./ml-web-search-provider.md?raw";
import mlIntelligenceInput from "./ml-intelligence-input.md?raw";
import mlIntelligenceInputMode from "./ml-intelligence-input-mode.md?raw";
// LLM settings fields
import llmMasterToggle from "./llm-master-toggle.md?raw";
import llmProviders from "./llm-providers.md?raw";
import llmFeatureModes from "./llm-feature-modes.md?raw";
// Import profile fields
import importProfileName from "./import-profile-name.md?raw";
import importProfileFilenamePattern from "./import-profile-filename-pattern.md?raw";
import importProfileAccount from "./import-profile-account.md?raw";
import importProfileMappings from "./import-profile-mappings.md?raw";
// Advanced settings fields
import advancedDeleteData from "./advanced-delete-data.md?raw";
// Budget Template Picker help content
import budgetTemplatePicker from "./budget-template-picker.md?raw";
import templateSearch from "./template-search.md?raw";
import templateCategoryTabs from "./template-category-tabs.md?raw";
import templateGrid from "./template-grid.md?raw";
import templatesButton from "./templates-button.md?raw";
import createCustomBudget from "./create-custom-budget.md?raw";
// Individual account page help content
import accountPageHeader from "./account-page-header.md?raw";
import addTransactionButton from "./add-transaction-button.md?raw";
import addTransactionDialog from "./add-transaction-dialog.md?raw";
import transactionAmountField from "./transaction-amount-field.md?raw";
import transactionDateField from "./transaction-date-field.md?raw";
import transactionPayeeField from "./transaction-payee-field.md?raw";
import transactionCategoryField from "./transaction-category-field.md?raw";
import transactionBudgetField from "./transaction-budget-field.md?raw";
import transactionNotesField from "./transaction-notes-field.md?raw";
import transactionEntryTabs from "./transaction-entry-tabs.md?raw";
import transactionWizard from "./transaction-wizard.md?raw";
import transactionTransferForm from "./transaction-transfer-form.md?raw";
import analyticsTab from "./analytics-tab.md?raw";
import schedulesTab from "./schedules-tab.md?raw";
import budgetsTab from "./budgets-tab.md?raw";
import accountSettingsTab from "./account-settings-tab.md?raw";
import transactionToolbar from "./transaction-toolbar.md?raw";
import transactionFilters from "./transaction-filters.md?raw";
import transactionViewOptions from "./transaction-view-options.md?raw";
import addExpenseButton from "./add-expense-button.md?raw";
// Transaction table columns
import transactionDateColumn from "./transaction-date-column.md?raw";
import transactionPayeeColumn from "./transaction-payee-column.md?raw";
import transactionCategoryColumn from "./transaction-category-column.md?raw";
import transactionAmountColumn from "./transaction-amount-column.md?raw";
import transactionBalanceColumn from "./transaction-balance-column.md?raw";
import transactionNotesColumn from "./transaction-notes-column.md?raw";
import transactionStatusColumn from "./transaction-status-column.md?raw";
import transactionBudgetColumn from "./transaction-budget-column.md?raw";
// Transaction table rows and actions
import transactionSelection from "./transaction-selection.md?raw";
import transactionRowActions from "./transaction-row-actions.md?raw";
import transactionBulkActions from "./transaction-bulk-actions.md?raw";
import transactionRowExpand from "./transaction-row-expand.md?raw";
// Individual account page tabs
import accountTabTransactions from "./account-tab-transactions.md?raw";
import accountTabAnalytics from "./account-tab-analytics.md?raw";
import accountTabIntelligence from "./account-tab-intelligence.md?raw";
import accountTabSchedules from "./account-tab-schedules.md?raw";
import accountTabBudgets from "./account-tab-budgets.md?raw";
import accountTabImport from "./account-tab-import.md?raw";
import accountTabSettings from "./account-tab-settings.md?raw";
import accountTabHsaExpenses from "./account-tab-hsa-expenses.md?raw";
import accountTabHsaDashboard from "./account-tab-hsa-dashboard.md?raw";
// Transaction dialog tabs
import transactionTabManual from "./transaction-tab-manual.md?raw";
import transactionTabTransfer from "./transaction-tab-transfer.md?raw";
import transactionTabGuided from "./transaction-tab-guided.md?raw";
// Budget form fields
import budgetNameField from "./budget-name-field.md?raw";
import budgetTypeField from "./budget-type-field.md?raw";
import budgetAmountField from "./budget-amount-field.md?raw";
import budgetPeriodField from "./budget-period-field.md?raw";
import budgetAccountField from "./budget-account-field.md?raw";
import budgetCategoryField from "./budget-category-field.md?raw";
import budgetGoalTargetField from "./budget-goal-target-field.md?raw";
import budgetGoalDateField from "./budget-goal-date-field.md?raw";
import budgetEnforcementField from "./budget-enforcement-field.md?raw";

// Content registry mapping help IDs to markdown content
export const helpContent: Record<string, string> = {
  sidebar,
  "workspace-switcher": workspaceSwitcher,
  "sidebar-trigger": sidebarTrigger,
  "theme-toggle": themeToggle,
  "font-size-toggle": fontSizeToggle,
  "theme-button": themeButton,
  "ai-assistant": aiAssistant,
  "intelligence-input-button": intelligenceInputButton,
  "help-button": helpButton,
  "settings-button": settingsButton,
  "header-page-actions": headerPageActions,
  "header-page-tabs": headerPageTabs,
  "quick-add-transaction": quickAddTransaction,
  "accounts-list": accountsList,
  "budgets-list": budgetsList,
  "payees-list": payeesList,
  "transaction-table": transactionTable,
  "account-tabs": accountTabs,
  "intelligence-tab": intelligenceTab,
  // Dashboard
  "dashboard-stats": dashboardStats,
  "quick-actions": quickActions,
  "financial-overview": financialOverview,
  "payee-intelligence-summary": payeeIntelligenceSummary,
  // Accounts page
  "accounts-page-header": accountsPageHeader,
  "add-account-button": addAccountButton,
  "accounts-grid": accountsGrid,
  // Budgets page
  "budgets-page-header": budgetsPageHeader,
  "budget-summary": budgetSummary,
  "budget-tabs": budgetTabs,
  // Payees page
  "payees-page-header": payeesPageHeader,
  "payees-table": payeesTable,
  // Categories page
  "categories-page-header": categoriesPageHeader,
  "categories-list": categoriesList,
  // Schedules page
  "schedules-page-header": schedulesPageHeader,
  "schedules-table": schedulesTable,
  // Import page
  "import-page": importPage,
  // Intelligence page
  "intelligence-page-header": intelligencePageHeader,
  "ml-insights": mlInsights,
  // Settings page
  "settings-appearance": settingsAppearance,
  "settings-display": settingsDisplay,
  "settings-ml": settingsMl,
  "settings-llm": settingsLlm,
  "settings-import-profiles": settingsImportProfiles,
  "settings-advanced": settingsAdvanced,
  // Display settings fields
  "display-date-format": displayDateFormat,
  "display-currency-symbol": displayCurrencySymbol,
  "display-number-format": displayNumberFormat,
  "display-decimal-places": displayDecimalPlaces,
  "display-header-actions": displayHeaderActions,
  "display-header-actions-display": displayHeaderActionsDisplay,
  "display-header-tabs": displayHeaderTabs,
  "display-header-tabs-display": displayHeaderTabsDisplay,
  "display-table-options": displayTableOptions,
  // ML settings fields
  "ml-master-toggle": mlMasterToggle,
  "ml-features": mlFeatures,
  "ml-anomaly-sensitivity": mlAnomalySensitivity,
  "ml-forecast-horizon": mlForecastHorizon,
  "ml-similarity-threshold": mlSimilarityThreshold,
  "ml-web-search": mlWebSearch,
  "ml-web-search-provider": mlWebSearchProvider,
  "ml-intelligence-input": mlIntelligenceInput,
  "ml-intelligence-input-mode": mlIntelligenceInputMode,
  // LLM settings fields
  "llm-master-toggle": llmMasterToggle,
  "llm-providers": llmProviders,
  "llm-feature-modes": llmFeatureModes,
  // Import profile fields
  "import-profile-name": importProfileName,
  "import-profile-filename-pattern": importProfileFilenamePattern,
  "import-profile-account": importProfileAccount,
  "import-profile-mappings": importProfileMappings,
  // Advanced settings fields
  "advanced-delete-data": advancedDeleteData,
  // Budget Template Picker
  "budget-template-picker": budgetTemplatePicker,
  "template-search": templateSearch,
  "template-category-tabs": templateCategoryTabs,
  "template-grid": templateGrid,
  "templates-button": templatesButton,
  "create-custom-budget": createCustomBudget,
  // Individual account page
  "account-page-header": accountPageHeader,
  "add-transaction-button": addTransactionButton,
  "add-transaction-dialog": addTransactionDialog,
  "transaction-amount-field": transactionAmountField,
  "transaction-date-field": transactionDateField,
  "transaction-payee-field": transactionPayeeField,
  "transaction-category-field": transactionCategoryField,
  "transaction-budget-field": transactionBudgetField,
  "transaction-notes-field": transactionNotesField,
  "transaction-entry-tabs": transactionEntryTabs,
  "transaction-wizard": transactionWizard,
  "transaction-transfer-form": transactionTransferForm,
  "analytics-tab": analyticsTab,
  "schedules-tab": schedulesTab,
  "budgets-tab": budgetsTab,
  "account-settings-tab": accountSettingsTab,
  "transaction-toolbar": transactionToolbar,
  "transaction-filters": transactionFilters,
  "transaction-view-options": transactionViewOptions,
  "add-expense-button": addExpenseButton,
  // Transaction table columns
  "transaction-date-column": transactionDateColumn,
  "transaction-payee-column": transactionPayeeColumn,
  "transaction-category-column": transactionCategoryColumn,
  "transaction-amount-column": transactionAmountColumn,
  "transaction-balance-column": transactionBalanceColumn,
  "transaction-notes-column": transactionNotesColumn,
  "transaction-status-column": transactionStatusColumn,
  "transaction-budget-column": transactionBudgetColumn,
  // Transaction table rows and actions
  "transaction-selection": transactionSelection,
  "transaction-row-actions": transactionRowActions,
  "transaction-bulk-actions": transactionBulkActions,
  "transaction-row-expand": transactionRowExpand,
  // Individual account page tabs
  "account-tab-transactions": accountTabTransactions,
  "account-tab-analytics": accountTabAnalytics,
  "account-tab-intelligence": accountTabIntelligence,
  "account-tab-schedules": accountTabSchedules,
  "account-tab-budgets": accountTabBudgets,
  "account-tab-import": accountTabImport,
  "account-tab-settings": accountTabSettings,
  "account-tab-hsa-expenses": accountTabHsaExpenses,
  "account-tab-hsa-dashboard": accountTabHsaDashboard,
  // Transaction dialog tabs
  "transaction-tab-manual": transactionTabManual,
  "transaction-tab-transfer": transactionTabTransfer,
  "transaction-tab-guided": transactionTabGuided,
  // Budget form fields
  "budget-name-field": budgetNameField,
  "budget-type-field": budgetTypeField,
  "budget-amount-field": budgetAmountField,
  "budget-period-field": budgetPeriodField,
  "budget-account-field": budgetAccountField,
  "budget-category-field": budgetCategoryField,
  "budget-goal-target-field": budgetGoalTargetField,
  "budget-goal-date-field": budgetGoalDateField,
  "budget-enforcement-field": budgetEnforcementField,
};

/**
 * Get help content for a given help ID
 */
export function getHelpContent(helpId: string): string | null {
  return helpContent[helpId] ?? null;
}

/**
 * Check if help content exists for a given help ID
 */
export function hasHelpContent(helpId: string): boolean {
  return helpId in helpContent;
}

/**
 * Get all available help IDs
 */
export function getAvailableHelpIds(): string[] {
  return Object.keys(helpContent);
}
