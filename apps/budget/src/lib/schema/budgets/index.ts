// Export all budget-related schemas and types
export * from './budgets';
export * from './budget-groups';
export * from './budget-periods';
export * from './budget-associations';

// Export specific types that might be commonly used
export type {
  Budget,
  NewBudget,
  UpdateBudget,
  BudgetGroup,
  NewBudgetGroup,
  UpdateBudgetGroup,
  BudgetPeriodTemplate,
  NewBudgetPeriodTemplate,
  BudgetPeriodInstance,
  NewBudgetPeriodInstance,
  BudgetAccount,
  BudgetCategory,
  BudgetTransaction
} from './budgets';

// Type for budget with all its related data
export interface BudgetWithRelations {
  budget: Budget;
  groups?: BudgetGroup[];
  accounts?: BudgetAccount[];
  categories?: BudgetCategory[];
  periodTemplate?: BudgetPeriodTemplate;
  currentPeriod?: BudgetPeriodInstance;
  transactions?: BudgetTransaction[];
}

// Budget summary type for dashboard/list views
export interface BudgetSummary {
  id: number;
  name: string;
  type: string;
  scope: string;
  status: string;
  enforcementLevel: string;
  totalAllocated: number;
  totalSpent: number;
  remaining: number;
  percentUsed: number;
  isOverBudget: boolean;
  currentPeriod?: {
    name: string;
    startDate: string;
    endDate: string;
  };
}