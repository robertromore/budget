/**
 * Income vs Expense Breakdown Module
 *
 * Provides enhanced income/expense analysis including:
 * - Separate forecasts for income and expenses
 * - Trend indicators (increasing, decreasing, stable)
 * - Period-over-period comparisons
 * - Net savings calculations
 * - Income-to-expense ratio tracking
 */

export { incomeExpenseRoutes } from "./routes";
export {
  createIncomeExpenseService, type IncomeExpenseBreakdown, type IncomeExpenseForecast, type IncomeExpenseHistory, type IncomeExpenseService, type PeriodComparison, type TrendDirection, type TrendIndicator
} from "./service";
