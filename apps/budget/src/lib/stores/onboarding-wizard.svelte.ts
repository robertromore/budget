/**
 * Onboarding Wizard Store
 *
 * Extends the base WizardStore with onboarding-specific validation
 * and form data management.
 */

import { WizardStore, type WizardStep } from "./wizardStore.svelte";
import {
  DEFAULT_ONBOARDING_FORM,
  type OnboardingFormData,
  type AccountToTrack,
  type DebtItem,
  type DebtType,
  type EmploymentStatus,
  type FinancialGoal,
  type HouseholdType,
  type IncomeFrequency,
  type IncomeSource,
  type SpendingArea,
} from "$lib/types/onboarding";

/**
 * Onboarding wizard steps
 */
export const ONBOARDING_STEPS: WizardStep[] = [
  {
    id: "income",
    title: "Income",
    description: "Tell us about your income sources",
    isOptional: false,
  },
  {
    id: "household",
    title: "Household & Goals",
    description: "Your household type and financial goals",
    isOptional: false,
  },
  {
    id: "accounts",
    title: "Accounts",
    description: "Types of accounts you want to track",
    isOptional: false,
  },
  {
    id: "spending",
    title: "Spending Areas",
    description: "Categories you typically spend on",
    isOptional: false,
  },
  {
    id: "debt",
    title: "Debt",
    description: "Optional debt information",
    isOptional: true,
  },
  {
    id: "preferences",
    title: "Preferences",
    description: "Currency and format preferences",
    isOptional: false,
  },
  {
    id: "review",
    title: "Review",
    description: "Review and confirm your setup",
    isOptional: false,
  },
];

const STORAGE_KEY = "onboarding-wizard-state";

/**
 * Onboarding Wizard Store
 *
 * Extends WizardStore with onboarding-specific form data and validation.
 */
export class OnboardingWizardStore extends WizardStore {
  /**
   * Get typed form data
   */
  get typedFormData(): Partial<OnboardingFormData> {
    return this.formData as Partial<OnboardingFormData>;
  }

  /**
   * Get complete form data with defaults
   */
  getCompleteFormData(): OnboardingFormData {
    return {
      ...DEFAULT_ONBOARDING_FORM,
      ...this.typedFormData,
    };
  }

  /**
   * Initialize with onboarding steps and default data
   */
  initializeOnboarding() {
    this.initialize(ONBOARDING_STEPS, { ...DEFAULT_ONBOARDING_FORM });

    // Try to restore from localStorage
    this.loadFromLocalStorage(STORAGE_KEY);

    // Validate restored state
    this.validateAllSteps();
  }

  /**
   * Validate all steps
   */
  private validateAllSteps() {
    for (const step of this.steps) {
      const isValid = this.validateStep(step.id, this.formData);
      this.setStepValidation(step.id, isValid);
    }
  }

  /**
   * Override validation logic for each step
   */
  override validateStep(stepId: string, formData: Record<string, any>): boolean {
    switch (stepId) {
      case "income":
        return this.validateIncomeStep(formData);
      case "household":
        return this.validateHouseholdStep(formData);
      case "accounts":
        return this.validateAccountsStep(formData);
      case "spending":
        return this.validateSpendingStep(formData);
      case "debt":
        // Debt is optional - always valid
        return true;
      case "preferences":
        return this.validatePreferencesStep(formData);
      case "review":
        // Review is valid if all required steps are valid
        return this.validateReviewStep();
      default:
        return true;
    }
  }

  private validateIncomeStep(formData: Record<string, any>): boolean {
    const incomeSource = formData.incomeSource as IncomeSource | undefined;
    const incomeFrequency = formData.incomeFrequency as IncomeFrequency | undefined;
    const employmentStatus = formData.employmentStatus as EmploymentStatus | undefined;

    return !!incomeSource && !!incomeFrequency && !!employmentStatus;
  }

  private validateHouseholdStep(formData: Record<string, any>): boolean {
    const householdType = formData.householdType as HouseholdType | undefined;
    const financialGoals = formData.financialGoals as FinancialGoal[] | undefined;

    return !!householdType && Array.isArray(financialGoals) && financialGoals.length > 0;
  }

  private validateAccountsStep(formData: Record<string, any>): boolean {
    const accountsToTrack = formData.accountsToTrack as AccountToTrack[] | undefined;

    return Array.isArray(accountsToTrack) && accountsToTrack.length > 0;
  }

  private validateSpendingStep(formData: Record<string, any>): boolean {
    const spendingAreas = formData.spendingAreas as SpendingArea[] | undefined;

    return Array.isArray(spendingAreas) && spendingAreas.length > 0;
  }

  private validatePreferencesStep(formData: Record<string, any>): boolean {
    const currency = formData.currency as string | undefined;
    const locale = formData.locale as string | undefined;
    const dateFormat = formData.dateFormat as string | undefined;

    return !!currency && !!locale && !!dateFormat;
  }

  private validateReviewStep(): boolean {
    // Check all required steps
    const requiredStepIds = ["income", "household", "accounts", "spending", "preferences"];

    return requiredStepIds.every((stepId) => {
      const step = this.steps.find((s) => s.id === stepId);
      return step?.isValid;
    });
  }

  // ==================== Income Step Helpers ====================

  setIncomeSource(source: IncomeSource) {
    this.updateFormData("incomeSource", source);
    this.saveProgress();
  }

  setIncomeFrequency(frequency: IncomeFrequency) {
    this.updateFormData("incomeFrequency", frequency);
    this.saveProgress();
  }

  setPrimaryIncomeAmount(amount: number | undefined) {
    this.updateFormData("primaryIncomeAmount", amount);
    this.saveProgress();
  }

  setEmploymentStatus(status: EmploymentStatus) {
    this.updateFormData("employmentStatus", status);
    this.saveProgress();
  }

  // ==================== Household Step Helpers ====================

  setHouseholdType(type: HouseholdType) {
    this.updateFormData("householdType", type);
    this.saveProgress();
  }

  toggleFinancialGoal(goal: FinancialGoal) {
    const current = (this.typedFormData.financialGoals || []) as FinancialGoal[];
    const index = current.indexOf(goal);

    if (index === -1) {
      this.updateFormData("financialGoals", [...current, goal]);
    } else {
      this.updateFormData(
        "financialGoals",
        current.filter((g) => g !== goal)
      );
    }
    this.saveProgress();
  }

  // ==================== Accounts Step Helpers ====================

  toggleAccountType(account: AccountToTrack) {
    const current = (this.typedFormData.accountsToTrack || []) as AccountToTrack[];
    const index = current.indexOf(account);

    if (index === -1) {
      this.updateFormData("accountsToTrack", [...current, account]);
    } else {
      this.updateFormData(
        "accountsToTrack",
        current.filter((a) => a !== account)
      );
    }
    this.saveProgress();
  }

  // ==================== Spending Step Helpers ====================

  toggleSpendingArea(area: SpendingArea) {
    const current = (this.typedFormData.spendingAreas || []) as SpendingArea[];
    const index = current.indexOf(area);

    if (index === -1) {
      this.updateFormData("spendingAreas", [...current, area]);
    } else {
      this.updateFormData(
        "spendingAreas",
        current.filter((a) => a !== area)
      );
    }
    this.saveProgress();
  }

  // ==================== Debt Step Helpers ====================

  setHasDebt(hasDebt: boolean) {
    this.updateFormData("hasDebt", hasDebt);
    if (!hasDebt) {
      this.updateFormData("debtOverview", []);
    }
    this.saveProgress();
  }

  addDebtItem(item: DebtItem) {
    const current = (this.typedFormData.debtOverview || []) as DebtItem[];
    this.updateFormData("debtOverview", [...current, item]);
    this.saveProgress();
  }

  removeDebtItem(index: number) {
    const current = (this.typedFormData.debtOverview || []) as DebtItem[];
    this.updateFormData(
      "debtOverview",
      current.filter((_, i) => i !== index)
    );
    this.saveProgress();
  }

  updateDebtItem(index: number, item: DebtItem) {
    const current = (this.typedFormData.debtOverview || []) as DebtItem[];
    const updated = [...current];
    updated[index] = item;
    this.updateFormData("debtOverview", updated);
    this.saveProgress();
  }

  // ==================== Preferences Step Helpers ====================

  setCurrency(currency: string) {
    this.updateFormData("currency", currency);
    this.saveProgress();
  }

  setLocale(locale: string) {
    this.updateFormData("locale", locale);
    this.saveProgress();
  }

  setDateFormat(format: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD") {
    this.updateFormData("dateFormat", format);
    this.saveProgress();
  }

  // ==================== Persistence ====================

  saveProgress() {
    this.saveToLocalStorage(STORAGE_KEY);
  }

  clearSavedProgress() {
    this.clearFromLocalStorage(STORAGE_KEY);
  }

  // ==================== Navigation Overrides ====================

  override nextStep() {
    super.nextStep();
    this.saveProgress();
  }

  override previousStep() {
    super.previousStep();
    this.saveProgress();
  }

  override goToStep(stepIndex: number) {
    super.goToStep(stepIndex);
    this.saveProgress();
  }

  override reset() {
    super.reset();
    this.clearSavedProgress();
  }
}

// Singleton instance
export const onboardingWizardStore = new OnboardingWizardStore();
