import {db} from "..";
import {views, type View} from "$lib/schema/views";
import type {ViewFilter, ViewDisplayState} from "$lib/types";
import {faker} from "@faker-js/faker";

export interface ViewFactoryOptions {
  withFilters?: boolean;
  presetType?: "date-range" | "category" | "amount" | "custom";
}

/**
 * Creates saved view(s) for a specific workspace
 *
 * Views store filter configurations and display states for transaction lists
 * Can generate realistic preset filters or custom configurations
 *
 * @param workspaceId - The workspace ID (REQUIRED)
 * @param count - Number of views to create (default: random 1-5)
 * @param options - Configuration options
 * @returns Promise<View[]> - Array of created views
 *
 * @example
 * ```typescript
 * // Create views with date range filters
 * const views = await viewFactory(workspaceId, 3, {
 *   withFilters: true,
 *   presetType: 'date-range'
 * });
 *
 * // Create simple views without filters
 * const views = await viewFactory(workspaceId, 2);
 * ```
 */
export const viewFactory = async (
  workspaceId: number,
  count: number = faker.number.int({min: 1, max: 5}),
  options: ViewFactoryOptions = {}
): Promise<View[]> => {
  const views_collection: View[] = [];

  for (let i = 0; i < count; i++) {
    // Generate realistic view names
    const viewNames = [
      "Last 30 Days",
      "Last 90 Days",
      "This Month",
      "Last Month",
      "Current Year",
      "Expense Tracking",
      "Income Only",
      "Uncategorized",
      "Large Transactions",
      "Recent Activity",
      "Monthly Review",
      "Budget Analysis",
    ];

    const name = faker.helpers.arrayElement(viewNames);
    const description = faker.lorem.sentence();
    const icon = faker.helpers.arrayElement([
      "📊",
      "📈",
      "💰",
      "🔍",
      "📅",
      "💳",
      "🏦",
      "📋",
      null,
    ]);

    // Generate filters if requested
    const filters = options.withFilters
      ? generateFilters(options.presetType ?? "date-range")
      : null;

    // Generate display state
    const display = generateDisplayState();

    const [view] = await db
      .insert(views)
      .values({
        workspaceId,
        name,
        description,
        icon,
        filters: filters as any,
        display: display as any,
        dirty: false,
      })
      .returning();

    if (!view) {
      throw new Error(`Failed to create view: ${name}`);
    }

    views_collection.push(view);
  }

  return views_collection;
};

/**
 * Generate realistic filter configurations based on preset type
 */
function generateFilters(presetType: string): ViewFilter[] {
  switch (presetType) {
    case "date-range":
      return [
        {
          column: "date",
          filter: "inDateRange",
          value: [
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            new Date().toISOString().split("T")[0],
          ],
        },
      ];

    case "category":
      return [
        {
          column: "categoryId",
          filter: "equals",
          value: [faker.number.int({min: 1, max: 10})],
        },
      ];

    case "amount":
      return [
        {
          column: "amount",
          filter: "greaterThan",
          value: [100],
        },
      ];

    case "custom":
      // Multiple filters
      return [
        {
          column: "date",
          filter: "inDateRange",
          value: [
            new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            new Date().toISOString().split("T")[0],
          ],
        },
        {
          column: "amount",
          filter: "between",
          value: [50, 500],
        },
      ];

    default:
      return [];
  }
}

/**
 * Generate realistic display state
 */
function generateDisplayState(): ViewDisplayState {
  const state: ViewDisplayState = {
    sort: [
      {
        id: "date",
        desc: true,
      },
    ],
    expanded: true,
    visibility: {
      date: true,
      amount: true,
      payee: true,
      category: true,
      account: true,
      notes: true,
    },
  };

  // Only add grouping if enabled (avoid undefined assignment)
  if (faker.datatype.boolean({probability: 0.3})) {
    state.grouping = ["date"];
  }

  return state;
}
