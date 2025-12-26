/**
 * Onboarding Types
 *
 * Types for the onboarding wizard that collects user financial profile
 * to generate smart defaults for accounts, categories, and budgets.
 */

// Income & Employment
export type IncomeSource =
  | 'salary'
  | 'freelance'
  | 'multiple'
  | 'investment'
  | 'retirement'
  | 'other';

export type IncomeFrequency =
  | 'weekly'
  | 'biweekly'
  | 'semimonthly'
  | 'monthly'
  | 'irregular';

export type EmploymentStatus =
  | 'employed'
  | 'self-employed'
  | 'retired'
  | 'student'
  | 'unemployed'
  | 'other';

export type HouseholdType =
  | 'single'
  | 'couple'
  | 'family-small'
  | 'family-large';

// Goals & Tracking
export type FinancialGoal =
  | 'emergency-fund'
  | 'pay-debt'
  | 'budget-better'
  | 'save-for-goal'
  | 'invest'
  | 'reduce-spending';

export type AccountToTrack =
  | 'checking'
  | 'savings'
  | 'credit-card'
  | 'investment'
  | 'hsa'
  | 'loan'
  | 'mortgage';

export type SpendingArea =
  | 'housing'
  | 'transportation'
  | 'food-groceries'
  | 'food-dining'
  | 'entertainment'
  | 'healthcare'
  | 'education'
  | 'personal-care'
  | 'pets'
  | 'shopping'
  | 'travel'
  | 'giving'
  | 'business';

export type DebtType =
  | 'credit-card'
  | 'student-loan'
  | 'car-loan'
  | 'mortgage'
  | 'personal-loan'
  | 'medical-debt';

/**
 * Debt item for the onboarding form
 */
export interface DebtItem {
  type: DebtType;
  approximateAmount: number;
  interestRate?: number;
}

/**
 * Complete onboarding form data collected from the wizard
 */
export interface OnboardingFormData {
  // Step 1: Income
  incomeSource: IncomeSource;
  incomeFrequency: IncomeFrequency;
  primaryIncomeAmount?: number;
  employmentStatus: EmploymentStatus;

  // Step 2: Household & Goals
  householdType: HouseholdType;
  financialGoals: FinancialGoal[];

  // Step 3: Accounts
  accountsToTrack: AccountToTrack[];

  // Step 4: Spending Areas
  spendingAreas: SpendingArea[];

  // Step 5: Debt
  hasDebt: boolean;
  debtOverview: DebtItem[];

  // Step 6: Preferences
  currency: string;
  locale: string;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
}

/**
 * Status tracking for onboarding completion
 */
export interface OnboardingStatus {
  wizardCompleted: boolean;
  wizardCompletedAt?: string;
  tourCompleted: boolean;
  tourCompletedAt?: string;
  tourSkipped: boolean;
}

/**
 * Default values for a new onboarding form
 */
export const DEFAULT_ONBOARDING_FORM: OnboardingFormData = {
  incomeSource: 'salary',
  incomeFrequency: 'biweekly',
  primaryIncomeAmount: undefined,
  employmentStatus: 'employed',
  householdType: 'single',
  financialGoals: [],
  accountsToTrack: ['checking'],
  spendingAreas: [],
  hasDebt: false,
  debtOverview: [],
  currency: 'USD',
  locale: 'en-US',
  dateFormat: 'MM/DD/YYYY',
};

/**
 * Default onboarding status for new workspaces
 */
export const DEFAULT_ONBOARDING_STATUS: OnboardingStatus = {
  wizardCompleted: false,
  tourCompleted: false,
  tourSkipped: false,
};

/**
 * Labels for display in the UI
 */
export const INCOME_SOURCE_LABELS: Record<IncomeSource, string> = {
  salary: 'Salary/Wages',
  freelance: 'Freelance/Contract',
  multiple: 'Multiple Sources',
  investment: 'Investments',
  retirement: 'Retirement/Pension',
  other: 'Other',
};

export const INCOME_FREQUENCY_LABELS: Record<IncomeFrequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Every Two Weeks',
  semimonthly: 'Twice a Month',
  monthly: 'Monthly',
  irregular: 'Irregular',
};

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  employed: 'Employed',
  'self-employed': 'Self-Employed',
  retired: 'Retired',
  student: 'Student',
  unemployed: 'Unemployed',
  other: 'Other',
};

export const HOUSEHOLD_TYPE_LABELS: Record<HouseholdType, string> = {
  single: 'Single',
  couple: 'Couple (No Kids)',
  'family-small': 'Family (1-2 Kids)',
  'family-large': 'Family (3+ Kids)',
};

export const FINANCIAL_GOAL_LABELS: Record<FinancialGoal, string> = {
  'emergency-fund': 'Build Emergency Fund',
  'pay-debt': 'Pay Off Debt',
  'budget-better': 'Budget Better',
  'save-for-goal': 'Save for a Goal',
  invest: 'Start Investing',
  'reduce-spending': 'Reduce Spending',
};

export const ACCOUNT_TYPE_LABELS: Record<AccountToTrack, string> = {
  checking: 'Checking Account',
  savings: 'Savings Account',
  'credit-card': 'Credit Card',
  investment: 'Investment Account',
  hsa: 'HSA/FSA',
  loan: 'Loan',
  mortgage: 'Mortgage',
};

export const SPENDING_AREA_LABELS: Record<SpendingArea, string> = {
  housing: 'Housing (Rent/Mortgage)',
  transportation: 'Transportation',
  'food-groceries': 'Groceries',
  'food-dining': 'Dining Out',
  entertainment: 'Entertainment',
  healthcare: 'Healthcare',
  education: 'Education',
  'personal-care': 'Personal Care',
  pets: 'Pets',
  shopping: 'Shopping',
  travel: 'Travel',
  giving: 'Charitable Giving',
  business: 'Business Expenses',
};

export const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  'credit-card': 'Credit Card',
  'student-loan': 'Student Loan',
  'car-loan': 'Auto Loan',
  mortgage: 'Mortgage',
  'personal-loan': 'Personal Loan',
  'medical-debt': 'Medical Debt',
};
