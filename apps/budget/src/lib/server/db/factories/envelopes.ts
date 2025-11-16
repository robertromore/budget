import {db} from "..";
import {
  envelopeAllocations,
  type EnvelopeAllocation,
  type EnvelopeStatus,
  type RolloverMode,
  type EnvelopeMetadata,
} from "$lib/schema/budgets/envelope-allocations";
import {faker} from "@faker-js/faker";

export interface EnvelopeFactoryOptions {
  allocatedAmount?: number;
  spentAmount?: number;
  rolloverMode?: RolloverMode;
  status?: EnvelopeStatus;
  isEmergencyFund?: boolean;
  priority?: number;
}

/**
 * Creates envelope allocation(s) for budget periods
 *
 * Envelope allocations track spending within budget categories for specific periods
 * Supports various spending scenarios (surplus, deficit, on-track)
 *
 * @param budgetId - The budget ID (REQUIRED)
 * @param categoryId - The category ID (REQUIRED)
 * @param periodInstanceId - The period instance ID (REQUIRED)
 * @param options - Configuration options
 * @returns Promise<EnvelopeAllocation> - Created envelope allocation
 *
 * @example
 * ```typescript
 * // Create envelope with surplus
 * const envelope = await envelopeFactory(budgetId, categoryId, periodId, {
 *   allocatedAmount: 500,
 *   spentAmount: 350,
 *   rolloverMode: 'unlimited'
 * });
 *
 * // Create overspent envelope
 * const envelope = await envelopeFactory(budgetId, categoryId, periodId, {
 *   allocatedAmount: 200,
 *   spentAmount: 250,
 *   status: 'overspent'
 * });
 *
 * // Create emergency fund envelope
 * const envelope = await envelopeFactory(budgetId, categoryId, periodId, {
 *   isEmergencyFund: true,
 *   rolloverMode: 'unlimited',
 *   priority: 1
 * });
 * ```
 */
export const envelopeFactory = async (
  budgetId: number,
  categoryId: number,
  periodInstanceId: number,
  options: EnvelopeFactoryOptions = {}
): Promise<EnvelopeAllocation> => {
  // Generate realistic amounts
  const allocatedAmount =
    options.allocatedAmount ?? faker.number.float({min: 50, max: 1000, fractionDigits: 2});

  // Generate spending scenarios
  let spentAmount: number;
  let status: EnvelopeStatus;

  if (options.spentAmount !== undefined) {
    spentAmount = options.spentAmount;
  } else {
    // Generate realistic spending patterns
    const scenario = faker.helpers.arrayElement([
      "under", // 40% - under budget
      "on-track", // 40% - on track
      "over", // 20% - over budget
    ]);

    switch (scenario) {
      case "under":
        spentAmount = faker.number.float({
          min: allocatedAmount * 0.3,
          max: allocatedAmount * 0.8,
          fractionDigits: 2,
        });
        break;
      case "on-track":
        spentAmount = faker.number.float({
          min: allocatedAmount * 0.8,
          max: allocatedAmount,
          fractionDigits: 2,
        });
        break;
      case "over":
        spentAmount = faker.number.float({
          min: allocatedAmount,
          max: allocatedAmount * 1.5,
          fractionDigits: 2,
        });
        break;
    }
  }

  // Calculate derived amounts
  const availableAmount = Math.max(0, allocatedAmount - spentAmount);
  const deficitAmount = Math.max(0, spentAmount - allocatedAmount);

  // Determine status
  if (options.status) {
    status = options.status;
  } else if (deficitAmount > 0) {
    status = "overspent";
  } else if (availableAmount === 0) {
    status = "depleted";
  } else {
    status = "active";
  }

  // Rollover mode
  const rolloverMode =
    options.rolloverMode ?? faker.helpers.arrayElement(["unlimited", "reset", "limited"] as const);

  // Generate metadata
  const metadata: EnvelopeMetadata = {
    priority: options.priority ?? faker.number.int({min: 1, max: 10}),
    isEmergencyFund: options.isEmergencyFund ?? false,
    autoRefill: faker.datatype.boolean({probability: 0.3}),
  };

  if (rolloverMode === "limited") {
    metadata.maxRolloverMonths = faker.number.int({min: 1, max: 6});
  }

  if (metadata.isEmergencyFund) {
    metadata.target = allocatedAmount * faker.number.int({min: 3, max: 12});
  }

  const [envelope] = await db
    .insert(envelopeAllocations)
    .values({
      budgetId,
      categoryId,
      periodInstanceId,
      allocatedAmount,
      spentAmount,
      rolloverAmount: 0, // Will be calculated during rollover process
      availableAmount,
      deficitAmount,
      status,
      rolloverMode,
      metadata,
      lastCalculated: new Date().toISOString(),
    })
    .returning();

  if (!envelope) {
    throw new Error(
      `Failed to create envelope for budget ${budgetId}, category ${categoryId}, period ${periodInstanceId}`
    );
  }

  return envelope;
};

/**
 * Creates multiple envelope allocations with varied spending scenarios
 *
 * Useful for testing rollover logic and budget analysis
 *
 * @param budgetId - The budget ID
 * @param periodInstanceId - The period instance ID
 * @param categoryIds - Array of category IDs
 * @returns Promise<EnvelopeAllocation[]> - Array of created envelopes
 *
 * @example
 * ```typescript
 * const envelopes = await createEnvelopeSet(budgetId, periodId, [1, 2, 3, 4]);
 * // Creates varied scenarios: surplus, on-track, deficit
 * ```
 */
export const createEnvelopeSet = async (
  budgetId: number,
  periodInstanceId: number,
  categoryIds: number[]
): Promise<EnvelopeAllocation[]> => {
  const envelopes: EnvelopeAllocation[] = [];

  for (let i = 0; i < categoryIds.length; i++) {
    // Create variety of scenarios
    const scenario = i % 3;
    let options: EnvelopeFactoryOptions;

    switch (scenario) {
      case 0: // Surplus
        options = {
          allocatedAmount: 500,
          spentAmount: 350,
          rolloverMode: "unlimited",
        };
        break;
      case 1: // On track
        options = {
          allocatedAmount: 300,
          spentAmount: 290,
          rolloverMode: "limited",
        };
        break;
      case 2: // Deficit
        options = {
          allocatedAmount: 200,
          spentAmount: 250,
          status: "overspent",
          rolloverMode: "reset",
        };
        break;
      default:
        options = {};
    }

    const envelope = await envelopeFactory(budgetId, categoryIds[i]!, periodInstanceId, options);
    envelopes.push(envelope);
  }

  return envelopes;
};
