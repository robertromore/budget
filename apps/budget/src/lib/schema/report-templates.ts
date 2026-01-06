import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { workspaces } from "./workspaces";

/**
 * Report template types
 */
export const REPORT_TEMPLATE_TYPES = [
  "spending_summary",
  "category_breakdown",
  "budget_vs_actual",
  "income_expense",
  "year_end",
  "tax_prep",
  "custom",
] as const;

export type ReportTemplateType = (typeof REPORT_TEMPLATE_TYPES)[number];

/**
 * Report configuration stored as JSON
 */
export interface ReportConfig {
  // Data selection
  dateRange: {
    type: "selected" | "custom" | "ytd" | "last_year";
    startDate?: string;
    endDate?: string;
  };
  accountIds?: number[];
  categoryIds?: number[];

  // Sections to include
  sections: {
    summaryStats: boolean;
    categoryBreakdown: boolean;
    monthlyTrend: boolean;
    transactionDetails: boolean;
    budgetComparison: boolean;
    annotations: boolean;
  };

  // Visualization options
  charts: {
    pieChart: boolean;
    barChart: boolean;
    lineChart: boolean;
  };

  // Display options
  display: {
    showCurrency: boolean;
    showPercentages: boolean;
    groupByCategory: boolean;
    sortBy: "amount" | "date" | "category";
  };

  // Branding (optional)
  branding?: {
    title?: string;
    subtitle?: string;
    notes?: string;
  };

  // Export preferences
  exportFormat: "pdf" | "html" | "markdown";
}

/**
 * Default report configuration
 */
export const DEFAULT_REPORT_CONFIG: ReportConfig = {
  dateRange: { type: "selected" },
  sections: {
    summaryStats: true,
    categoryBreakdown: true,
    monthlyTrend: true,
    transactionDetails: false,
    budgetComparison: false,
    annotations: false,
  },
  charts: {
    pieChart: true,
    barChart: false,
    lineChart: true,
  },
  display: {
    showCurrency: true,
    showPercentages: true,
    groupByCategory: true,
    sortBy: "amount",
  },
  exportFormat: "pdf",
};

/**
 * Predefined template configurations
 */
export const PREDEFINED_TEMPLATES: Record<
  Exclude<ReportTemplateType, "custom">,
  { name: string; description: string; config: Partial<ReportConfig> }
> = {
  spending_summary: {
    name: "Spending Summary",
    description: "Overview of spending with categories and trends",
    config: {
      sections: {
        summaryStats: true,
        categoryBreakdown: true,
        monthlyTrend: true,
        transactionDetails: false,
        budgetComparison: false,
        annotations: false,
      },
      charts: { pieChart: true, barChart: false, lineChart: true },
    },
  },
  category_breakdown: {
    name: "Category Breakdown",
    description: "Detailed analysis by spending category",
    config: {
      sections: {
        summaryStats: true,
        categoryBreakdown: true,
        monthlyTrend: false,
        transactionDetails: false,
        budgetComparison: false,
        annotations: false,
      },
      charts: { pieChart: true, barChart: true, lineChart: false },
      display: { showCurrency: true, showPercentages: true, groupByCategory: true, sortBy: "amount" },
    },
  },
  budget_vs_actual: {
    name: "Budget vs Actual",
    description: "Compare actual spending to budget targets",
    config: {
      sections: {
        summaryStats: true,
        categoryBreakdown: true,
        monthlyTrend: true,
        transactionDetails: false,
        budgetComparison: true,
        annotations: false,
      },
      charts: { pieChart: false, barChart: true, lineChart: true },
    },
  },
  income_expense: {
    name: "Income & Expense",
    description: "Cash flow analysis showing income vs expenses",
    config: {
      sections: {
        summaryStats: true,
        categoryBreakdown: true,
        monthlyTrend: true,
        transactionDetails: false,
        budgetComparison: false,
        annotations: false,
      },
      charts: { pieChart: false, barChart: true, lineChart: true },
    },
  },
  year_end: {
    name: "Year-End Summary",
    description: "Comprehensive annual financial review",
    config: {
      dateRange: { type: "last_year" },
      sections: {
        summaryStats: true,
        categoryBreakdown: true,
        monthlyTrend: true,
        transactionDetails: false,
        budgetComparison: true,
        annotations: true,
      },
      charts: { pieChart: true, barChart: true, lineChart: true },
    },
  },
  tax_prep: {
    name: "Tax Preparation",
    description: "Detailed report for tax filing purposes",
    config: {
      sections: {
        summaryStats: true,
        categoryBreakdown: true,
        monthlyTrend: false,
        transactionDetails: true,
        budgetComparison: false,
        annotations: true,
      },
      charts: { pieChart: false, barChart: false, lineChart: false },
      display: { showCurrency: true, showPercentages: false, groupByCategory: true, sortBy: "category" },
    },
  },
};

/**
 * Report templates table - stores user-saved report configurations
 */
export const reportTemplates = sqliteTable(
  "report_templates",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),

    // Template metadata
    name: text("name").notNull(),
    description: text("description"),
    icon: text("icon"),
    isDefault: integer("is_default", { mode: "boolean" }).default(false),

    // Template type
    templateType: text("template_type").notNull().$type<ReportTemplateType>(),

    // Configuration (JSON)
    config: text("config", { mode: "json" }).$type<ReportConfig>().notNull(),

    // Usage tracking
    lastUsedAt: text("last_used_at"),
    useCount: integer("use_count").default(0),

    // Timestamps
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("report_templates_workspace_idx").on(table.workspaceId),
    index("report_templates_type_idx").on(table.templateType),
  ]
);

// Type exports
export type ReportTemplate = typeof reportTemplates.$inferSelect;
export type NewReportTemplate = typeof reportTemplates.$inferInsert;
