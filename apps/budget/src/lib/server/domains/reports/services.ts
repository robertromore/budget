import type {
  NewReportTemplate,
  ReportConfig,
  ReportTemplate,
  ReportTemplateType,
} from "$lib/schema/report-templates";
import { DEFAULT_REPORT_CONFIG, PREDEFINED_TEMPLATES } from "$lib/schema/report-templates";
import { ReportTemplateRepository, type UpdateReportTemplateData } from "./repository";

/**
 * Service for report template operations
 */
export class ReportTemplateService {
  constructor(private readonly repository: ReportTemplateRepository) {}

  /**
   * Create a new report template
   */
  async create(
    data: {
      name: string;
      description?: string | null;
      icon?: string | null;
      templateType: ReportTemplateType;
      config: ReportConfig;
      isDefault?: boolean;
    },
    workspaceId: number
  ): Promise<ReportTemplate> {
    // Merge with defaults
    const config = this.mergeWithDefaults(data.config);

    return await this.repository.create(
      {
        name: data.name,
        description: data.description ?? null,
        icon: data.icon ?? null,
        templateType: data.templateType,
        config,
        isDefault: data.isDefault ?? false,
        workspaceId,
      },
      workspaceId
    );
  }

  /**
   * Get a template by ID
   */
  async getById(id: number, workspaceId: number): Promise<ReportTemplate | null> {
    return await this.repository.findById(id, workspaceId);
  }

  /**
   * List all templates for a workspace
   */
  async listAll(workspaceId: number): Promise<ReportTemplate[]> {
    return await this.repository.findAllByWorkspace(workspaceId);
  }

  /**
   * List templates by type
   */
  async listByType(
    templateType: ReportTemplateType,
    workspaceId: number
  ): Promise<ReportTemplate[]> {
    return await this.repository.findByType(templateType, workspaceId);
  }

  /**
   * Update a template
   */
  async update(
    id: number,
    data: UpdateReportTemplateData,
    workspaceId: number
  ): Promise<ReportTemplate> {
    // If config is being updated, merge with defaults
    if (data.config) {
      data.config = this.mergeWithDefaults(data.config);
    }

    return await this.repository.update(id, data, workspaceId);
  }

  /**
   * Delete a template
   */
  async delete(id: number, workspaceId: number): Promise<void> {
    await this.repository.delete(id, workspaceId);
  }

  /**
   * Set a template as default
   */
  async setDefault(id: number, workspaceId: number): Promise<ReportTemplate> {
    return await this.repository.setDefault(id, workspaceId);
  }

  /**
   * Record usage of a template
   */
  async recordUsage(id: number, workspaceId: number): Promise<void> {
    await this.repository.recordUsage(id, workspaceId);
  }

  /**
   * Get config for a predefined template type
   */
  getPredefinedConfig(templateType: Exclude<ReportTemplateType, "custom">): ReportConfig {
    const predefined = PREDEFINED_TEMPLATES[templateType];
    return this.mergeWithDefaults(predefined.config);
  }

  /**
   * Get all predefined template options
   */
  getPredefinedTemplates(): Array<{
    type: Exclude<ReportTemplateType, "custom">;
    name: string;
    description: string;
  }> {
    return Object.entries(PREDEFINED_TEMPLATES).map(([type, config]) => ({
      type: type as Exclude<ReportTemplateType, "custom">,
      name: config.name,
      description: config.description,
    }));
  }

  /**
   * Merge partial config with defaults
   */
  private mergeWithDefaults(partial: Partial<ReportConfig>): ReportConfig {
    return {
      dateRange: partial.dateRange ?? DEFAULT_REPORT_CONFIG.dateRange,
      accountIds: partial.accountIds,
      categoryIds: partial.categoryIds,
      sections: {
        ...DEFAULT_REPORT_CONFIG.sections,
        ...partial.sections,
      },
      charts: {
        ...DEFAULT_REPORT_CONFIG.charts,
        ...partial.charts,
      },
      display: {
        ...DEFAULT_REPORT_CONFIG.display,
        ...partial.display,
      },
      branding: partial.branding,
      exportFormat: partial.exportFormat ?? DEFAULT_REPORT_CONFIG.exportFormat,
    };
  }
}

/**
 * Report data calculation utilities
 */
export interface TransactionForReport {
  id: number;
  date: string;
  amount: number;
  payee?: { name: string } | null;
  category?: { id: number; name: string } | null;
}

export interface ReportStatistics {
  totalAmount: number;
  totalIncome: number;
  totalExpenses: number;
  netChange: number;
  transactionCount: number;
  averageTransaction: number;
  monthCount: number;
  averageMonthly: number;
}

export interface CategoryBreakdown {
  categoryId: number | null;
  categoryName: string;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
}

export interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  net: number;
  transactionCount: number;
}

/**
 * Calculate summary statistics from transactions
 */
export function calculateStatistics(transactions: TransactionForReport[]): ReportStatistics {
  if (transactions.length === 0) {
    return {
      totalAmount: 0,
      totalIncome: 0,
      totalExpenses: 0,
      netChange: 0,
      transactionCount: 0,
      averageTransaction: 0,
      monthCount: 0,
      averageMonthly: 0,
    };
  }

  let totalIncome = 0;
  let totalExpenses = 0;
  const months = new Set<string>();

  for (const tx of transactions) {
    const month = tx.date.slice(0, 7);
    months.add(month);

    if (tx.amount > 0) {
      totalIncome += tx.amount;
    } else {
      totalExpenses += Math.abs(tx.amount);
    }
  }

  const netChange = totalIncome - totalExpenses;
  const totalAmount = totalIncome + totalExpenses;
  const monthCount = months.size;

  return {
    totalAmount,
    totalIncome,
    totalExpenses,
    netChange,
    transactionCount: transactions.length,
    averageTransaction: totalAmount / transactions.length,
    monthCount,
    averageMonthly: monthCount > 0 ? totalExpenses / monthCount : 0,
  };
}

/**
 * Calculate category breakdown from transactions
 */
export function calculateCategoryBreakdown(
  transactions: TransactionForReport[]
): CategoryBreakdown[] {
  const categoryMap = new Map<
    number | null,
    { name: string; amount: number; count: number }
  >();

  let totalExpenses = 0;

  for (const tx of transactions) {
    // Only count expenses for breakdown
    if (tx.amount >= 0) continue;

    const amount = Math.abs(tx.amount);
    totalExpenses += amount;

    const categoryId = tx.category?.id ?? null;
    const categoryName = tx.category?.name ?? "Uncategorized";

    const existing = categoryMap.get(categoryId);
    if (existing) {
      existing.amount += amount;
      existing.count += 1;
    } else {
      categoryMap.set(categoryId, { name: categoryName, amount, count: 1 });
    }
  }

  const breakdown: CategoryBreakdown[] = [];
  for (const [categoryId, data] of categoryMap) {
    breakdown.push({
      categoryId,
      categoryName: data.name,
      totalAmount: data.amount,
      transactionCount: data.count,
      percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
    });
  }

  // Sort by amount descending
  breakdown.sort((a, b) => b.totalAmount - a.totalAmount);

  return breakdown;
}

/**
 * Calculate monthly trend data from transactions
 */
export function calculateMonthlyTrend(transactions: TransactionForReport[]): MonthlyData[] {
  const monthMap = new Map<
    string,
    { income: number; expenses: number; count: number }
  >();

  for (const tx of transactions) {
    const month = tx.date.slice(0, 7);

    const existing = monthMap.get(month);
    if (existing) {
      if (tx.amount > 0) {
        existing.income += tx.amount;
      } else {
        existing.expenses += Math.abs(tx.amount);
      }
      existing.count += 1;
    } else {
      monthMap.set(month, {
        income: tx.amount > 0 ? tx.amount : 0,
        expenses: tx.amount < 0 ? Math.abs(tx.amount) : 0,
        count: 1,
      });
    }
  }

  const trend: MonthlyData[] = [];
  for (const [month, data] of monthMap) {
    trend.push({
      month,
      income: data.income,
      expenses: data.expenses,
      net: data.income - data.expenses,
      transactionCount: data.count,
    });
  }

  // Sort by month ascending
  trend.sort((a, b) => a.month.localeCompare(b.month));

  return trend;
}
