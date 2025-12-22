/**
 * Help Content Registry
 *
 * Maps help IDs to their documentation content.
 * Content is loaded dynamically when needed.
 */

// Import all markdown content
import sidebar from "./sidebar.md?raw";
import themeToggle from "./theme-toggle.md?raw";
import helpButton from "./help-button.md?raw";
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

// Content registry mapping help IDs to markdown content
export const helpContent: Record<string, string> = {
  sidebar,
  "theme-toggle": themeToggle,
  "help-button": helpButton,
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
