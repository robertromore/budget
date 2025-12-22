/**
 * Savings Opportunities Detection Module
 *
 * Identifies potential savings by analyzing:
 * - Subscriptions with no related transactions (unused services)
 * - Price increases on recurring bills
 * - Duplicate subscriptions (multiple streaming services, etc.)
 * - Merchants where spending increased significantly
 */

export { savingsOpportunityRoutes } from "./routes";
export {
  createSavingsOpportunityService, type OpportunityEvidence, type OpportunityPriority, type OpportunityType, type SavingsOpportunity, type SavingsOpportunityConfig, type SavingsOpportunityService, type SavingsOpportunitySummary
} from "./service";
