// Base validation interface
export interface ValidationRule {
  field: string;
  validator: (value: any, formData: Record<string, any>) => string | null;
}

export interface StepValidation {
  stepId: string;
  rules: ValidationRule[];
  dependencies?: string[]; // Other step IDs this step depends on
}

// Common validation functions
export const validators = {
  required: (field: string) => (value: any): string | null => {
    if (value === null || value === undefined || value === '') {
      return `${field} is required`;
    }
    return null;
  },

  minLength: (field: string, min: number) => (value: any): string | null => {
    if (typeof value === 'string' && value.length < min) {
      return `${field} must be at least ${min} characters`;
    }
    return null;
  },

  maxLength: (field: string, max: number) => (value: any): string | null => {
    if (typeof value === 'string' && value.length > max) {
      return `${field} must be no more than ${max} characters`;
    }
    return null;
  },

  number: (field: string) => (value: any): string | null => {
    if (isNaN(Number(value))) {
      return `${field} must be a valid number`;
    }
    return null;
  },

  positiveNumber: (field: string) => (value: any): string | null => {
    const num = Number(value);
    if (isNaN(num) || num <= 0) {
      return `${field} must be a positive number`;
    }
    return null;
  },

  email: (field: string) => (value: any): string | null => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof value === 'string' && !emailRegex.test(value)) {
      return `${field} must be a valid email address`;
    }
    return null;
  },

  arrayNotEmpty: (field: string) => (value: any): string | null => {
    if (!Array.isArray(value) || value.length === 0) {
      return `At least one ${field} must be selected`;
    }
    return null;
  },

  oneOf: (field: string, validValues: any[]) => (value: any): string | null => {
    if (!validValues.includes(value)) {
      return `${field} must be one of: ${validValues.join(', ')}`;
    }
    return null;
  },

  custom: (field: string, validator: (value: any, formData: Record<string, any>) => boolean, message: string) =>
    (value: any, formData: Record<string, any>): string | null => {
      if (!validator(value, formData)) {
        return message;
      }
      return null;
    }
};

// Validation executor
export class WizardValidationEngine {
  private validations: Map<string, StepValidation> = new Map();

  addStepValidation(stepValidation: StepValidation) {
    this.validations.set(stepValidation.stepId, stepValidation);
  }

  validateStep(stepId: string, formData: Record<string, any>): { isValid: boolean; errors: string[] } {
    const stepValidation = this.validations.get(stepId);
    if (!stepValidation) {
      return { isValid: true, errors: [] };
    }

    const errors: string[] = [];

    for (const rule of stepValidation.rules) {
      const value = formData[rule.field];
      const error = rule.validator(value, formData);
      if (error) {
        errors.push(error);
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  validateAllSteps(formData: Record<string, any>): { isValid: boolean; stepErrors: Record<string, string[]> } {
    const stepErrors: Record<string, string[]> = {};
    let isValid = true;

    for (const [stepId] of this.validations) {
      const result = this.validateStep(stepId, formData);
      if (!result.isValid) {
        stepErrors[stepId] = result.errors;
        isValid = false;
      }
    }

    return { isValid, stepErrors };
  }

  // Check if step dependencies are satisfied
  canAccessStep(stepId: string, completedSteps: string[]): boolean {
    const stepValidation = this.validations.get(stepId);
    if (!stepValidation?.dependencies) {
      return true; // No dependencies means always accessible
    }

    return stepValidation.dependencies.every(dep => completedSteps.includes(dep));
  }
}

// Entity-specific validation configurations
export const accountValidations: StepValidation[] = [
  {
    stepId: 'account-basics',
    rules: [
      { field: 'name', validator: validators.required('Account name') },
      { field: 'name', validator: validators.minLength('Account name', 2) },
      { field: 'name', validator: validators.maxLength('Account name', 100) }
    ]
  },
  {
    stepId: 'account-details',
    rules: [
      { field: 'notes', validator: validators.maxLength('Notes', 500) }
    ]
  }
];

export const scheduleValidations: StepValidation[] = [
  {
    stepId: 'schedule-type',
    rules: [
      { field: 'recurring', validator: validators.required('Schedule type') }
    ]
  },
  {
    stepId: 'transaction-details',
    rules: [
      { field: 'name', validator: validators.required('Schedule name') },
      { field: 'name', validator: validators.minLength('Schedule name', 2) },
      { field: 'amount', validator: validators.positiveNumber('Amount') }
    ]
  },
  {
    stepId: 'payee-selection',
    rules: [
      { field: 'payeeId', validator: validators.custom('Payee', (value) => value > 0, 'Please select a payee') }
    ]
  },
  {
    stepId: 'account-category',
    rules: [
      { field: 'accountId', validator: validators.custom('Account', (value) => value > 0, 'Please select an account') }
    ],
    dependencies: ['transaction-details']
  },
  {
    stepId: 'frequency-setup',
    rules: [
      { field: 'repeating_date', validator: validators.custom('Frequency',
        (value) => value && value.start_date, 'Please configure the frequency') }
    ],
    dependencies: ['schedule-type']
  }
];

export const budgetValidations: StepValidation[] = [
  {
    stepId: 'budget-type',
    rules: [
      { field: 'type', validator: validators.oneOf('Budget type',
        ['account-monthly', 'category-envelope', 'goal-based', 'scheduled-expense']) },
      { field: 'enforcementLevel', validator: validators.oneOf('Enforcement level',
        ['none', 'warning', 'strict']) }
    ]
  },
  {
    stepId: 'budget-details',
    rules: [
      { field: 'name', validator: validators.required('Budget name') },
      { field: 'name', validator: validators.minLength('Budget name', 2) },
      { field: 'name', validator: validators.maxLength('Budget name', 100) }
    ]
  },
  {
    stepId: 'period-settings',
    rules: [
      { field: 'periodType', validator: validators.custom('Period type',
        (value) => {
          const validTypes = ['weekly', 'monthly', 'quarterly', 'yearly', 'custom'];
          return validTypes.includes(value) || value === undefined; // Allow undefined to use defaults
        }, 'Invalid period type') },
      { field: 'startDay', validator: validators.custom('Start day',
        (value) => {
          if (value === undefined || value === null) return true; // Allow undefined to use defaults
          const num = Number(value);
          return !isNaN(num) && num > 0 && num <= 366; // Valid day range
        }, 'Start day must be a valid positive number') },
      { field: 'allocatedAmount', validator: validators.custom('Amount',
        (value, formData) => {
          const type = formData['type'];
          const requiresAmount = ['account-monthly', 'category-envelope', 'goal-based', 'scheduled-expense'].includes(type);
          if (!requiresAmount) return true;

          const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
          return !isNaN(numValue) && numValue > 0;
        }, 'Please enter a positive budget amount') }
    ],
    dependencies: ['budget-type']
  },
  {
    stepId: 'accounts-categories',
    rules: [
      { field: 'accountIds', validator: validators.custom('Account selection',
        (value, formData) => {
          const type = formData['type'];
          const requiresAccounts = ['account-monthly', 'scheduled-expense'].includes(type);
          return !requiresAccounts || (Array.isArray(value) && value.length > 0);
        }, 'Please select at least one account for this budget type') },
      { field: 'categoryIds', validator: validators.custom('Category selection',
        (value, formData) => {
          const type = formData['type'];
          const requiresCategories = ['category-envelope', 'goal-based'].includes(type);
          return !requiresCategories || (Array.isArray(value) && value.length > 0);
        }, 'Please select at least one category for this budget type') }
    ],
    dependencies: ['budget-type']
  }
];

// Create validation engine instances
export function createAccountValidationEngine(): WizardValidationEngine {
  const engine = new WizardValidationEngine();
  accountValidations.forEach(validation => engine.addStepValidation(validation));
  return engine;
}

export function createScheduleValidationEngine(): WizardValidationEngine {
  const engine = new WizardValidationEngine();
  scheduleValidations.forEach(validation => engine.addStepValidation(validation));
  return engine;
}

export function createBudgetValidationEngine(): WizardValidationEngine {
  const engine = new WizardValidationEngine();
  budgetValidations.forEach(validation => engine.addStepValidation(validation));
  return engine;
}

export const transactionValidations: StepValidation[] = [
  {
    stepId: 'date-amount',
    rules: [
      { field: 'date', validator: validators.required('Date') },
      { field: 'amount', validator: validators.custom('Amount',
        (value) => {
          const num = Number(value);
          return !isNaN(num) && num !== 0;
        }, 'Amount must be a non-zero number') }
    ]
  },
  {
    stepId: 'payee-category',
    rules: [
      // At least one of payee or category should be set (both optional but recommended)
    ]
  },
  {
    stepId: 'notes-status',
    rules: [
      { field: 'notes', validator: validators.maxLength('Notes', 500) }
    ]
  },
  {
    stepId: 'review',
    rules: [],
    dependencies: ['date-amount']
  }
];

export function createTransactionValidationEngine(): WizardValidationEngine {
  const engine = new WizardValidationEngine();
  transactionValidations.forEach(validation => engine.addStepValidation(validation));
  return engine;
}