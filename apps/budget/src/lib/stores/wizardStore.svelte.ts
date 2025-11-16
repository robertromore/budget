export interface WizardStep {
  id: string;
  title: string;
  description: string;
  isOptional?: boolean;
  isValid?: boolean;
  isVisited?: boolean;
}

export interface WizardState {
  currentStepIndex: number;
  steps: WizardStep[];
  formData: Record<string, any>;
  validationErrors: Record<string, string[]>;
  isCompleting: boolean;
}

export class WizardStore {
  private state = $state<WizardState>({
    currentStepIndex: 0,
    steps: [],
    formData: {},
    validationErrors: {},
    isCompleting: false,
  });

  // Getters
  get currentStepIndex() {
    return this.state.currentStepIndex;
  }
  get steps() {
    return this.state.steps;
  }
  get formData() {
    return this.state.formData;
  }
  get validationErrors() {
    return this.state.validationErrors;
  }
  get isCompleting() {
    return this.state.isCompleting;
  }

  get currentStep() {
    return this.state.steps[this.state.currentStepIndex];
  }

  get canGoNext() {
    const current = this.currentStep;
    return current && (current.isValid || current.isOptional);
  }

  get canGoPrevious() {
    return this.state.currentStepIndex > 0;
  }

  get isLastStep() {
    return this.state.currentStepIndex === this.state.steps.length - 1;
  }

  get isFirstStep() {
    return this.state.currentStepIndex === 0;
  }

  get progress() {
    const total = this.state.steps.length;
    const completed = this.state.steps.filter((step) => step.isValid).length;
    return total > 0 ? (completed / total) * 100 : 0;
  }

  // Actions
  initialize(steps: WizardStep[], initialData: Record<string, any> = {}) {
    this.state.steps = steps.map((step, index) => ({
      ...step,
      isValid: false,
      isVisited: index === 0,
    }));
    this.state.formData = {...initialData};
    this.state.currentStepIndex = 0;
    this.state.validationErrors = {};
    this.state.isCompleting = false;
  }

  updateFormData(field: string, value: any) {
    this.state.formData[field] = value;
    this.validateCurrentStep();
  }

  updateMultipleFields(fields: Record<string, any>) {
    Object.assign(this.state.formData, fields);
    this.validateCurrentStep();
  }

  goToStep(stepIndex: number) {
    if (stepIndex >= 0 && stepIndex < this.state.steps.length) {
      this.state.currentStepIndex = stepIndex;
      this.state.steps[stepIndex].isVisited = true;
    }
  }

  nextStep() {
    if (this.canGoNext && !this.isLastStep) {
      const nextIndex = this.state.currentStepIndex + 1;
      this.goToStep(nextIndex);
    }
  }

  previousStep() {
    if (this.canGoPrevious) {
      const prevIndex = this.state.currentStepIndex - 1;
      this.goToStep(prevIndex);
    }
  }

  skipStep() {
    if (this.currentStep?.isOptional) {
      this.nextStep();
    }
  }

  validateCurrentStep() {
    const currentStep = this.currentStep;
    if (!currentStep) return;

    // Override this method in specific implementations
    currentStep.isValid = this.validateStep(currentStep.id, this.state.formData);
  }

  validateStep(stepId: string, formData: Record<string, any>): boolean {
    // Default validation - override in implementations
    return true;
  }

  setStepValidation(stepId: string, isValid: boolean, errors: string[] = []) {
    const step = this.state.steps.find((s) => s.id === stepId);
    if (step) {
      step.isValid = isValid;
      if (errors.length > 0) {
        this.state.validationErrors[stepId] = errors;
      } else {
        delete this.state.validationErrors[stepId];
      }
    }
  }

  startCompleting() {
    this.state.isCompleting = true;
  }

  stopCompleting() {
    this.state.isCompleting = false;
  }

  reset() {
    this.state.currentStepIndex = 0;
    this.state.formData = {};
    this.state.validationErrors = {};
    this.state.isCompleting = false;
    this.state.steps.forEach((step) => {
      step.isValid = false;
      step.isVisited = false;
    });
    if (this.state.steps[0]) {
      this.state.steps[0].isVisited = true;
    }
  }

  // Persistence
  saveToLocalStorage(key: string) {
    try {
      const data = {
        currentStepIndex: this.state.currentStepIndex,
        formData: this.state.formData,
        steps: this.state.steps.map((step) => ({
          id: step.id,
          isValid: step.isValid,
          isVisited: step.isVisited,
        })),
      };
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn("Failed to save wizard state to localStorage:", error);
    }
  }

  loadFromLocalStorage(key: string): boolean {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const data = JSON.parse(saved);
        this.state.currentStepIndex = data.currentStepIndex || 0;
        this.state.formData = data.formData || {};

        // Restore step state
        if (data.steps) {
          data.steps.forEach((savedStep: any) => {
            const step = this.state.steps.find((s) => s.id === savedStep.id);
            if (step) {
              step.isValid = savedStep.isValid || false;
              step.isVisited = savedStep.isVisited || false;
            }
          });
        }

        return true;
      }
    } catch (error) {
      console.warn("Failed to load wizard state from localStorage:", error);
    }
    return false;
  }

  clearFromLocalStorage(key: string) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn("Failed to clear wizard state from localStorage:", error);
    }
  }
}

// Create wizard store instances for each entity type
export const accountWizardStore = new WizardStore();
export const scheduleWizardStore = new WizardStore();
export const budgetWizardStore = new WizardStore();
export const transactionWizardStore = new WizardStore();
