export * from "./accounts";
export * from "./categories";
export * from "./budgets";
// export * from './category_groups';
export * from "./payees";
export * from "./payee-category-corrections";
export * from "./schedules";
export * from "./schedule-dates";
export * from "./transactions";
export * from "./views";
export * from "./detected-patterns";

// PERFORMANCE: HSA schemas NOT exported from barrel to prevent eager loading.
// Import directly from specific files when needed:
// - import { ... } from "$lib/schema/medical-expenses"
// - import { ... } from "$lib/schema/expense-receipts"
// - import { ... } from "$lib/schema/hsa-claims"
// - HSA relations available in "$lib/schema/hsa-relations"
