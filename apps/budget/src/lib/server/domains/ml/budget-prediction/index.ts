/**
 * Budget Overspend Prediction Module
 *
 * Predicts budget overruns before month-end by analyzing:
 * - Current spending rate vs. budget allocation
 * - Known upcoming recurring transactions
 * - Historical end-of-month spending patterns
 * - Day-of-month spending velocity
 */

export { budgetPredictionRoutes } from "./routes";
export {
  createBudgetPredictionService, type BudgetOverspendPrediction, type BudgetPredictionConfig, type BudgetPredictionService, type OverspendRisk, type PredictionFactor, type WorkspaceBudgetSummary
} from "./service";
