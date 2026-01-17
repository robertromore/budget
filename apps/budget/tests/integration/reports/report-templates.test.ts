/**
 * Report Templates - Integration Tests
 *
 * Tests report template management including creation,
 * configuration, and template types.
 */

import {describe, it, expect, beforeEach} from "vitest";
import {setupTestDb} from "../setup/test-db";
import * as schema from "../../../src/lib/schema";
import {eq} from "drizzle-orm";
import type {BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import type {ReportConfig} from "../../../src/lib/schema/report-templates";
import {DEFAULT_REPORT_CONFIG, PREDEFINED_TEMPLATES} from "../../../src/lib/schema/report-templates";

type TestDb = BunSQLiteDatabase<typeof schema>;

interface TestContext {
  db: TestDb;
  workspaceId: number;
}

async function setupTestContext(): Promise<TestContext> {
  const db = await setupTestDb();

  const [workspace] = await db
    .insert(schema.workspaces)
    .values({
      displayName: "Test Workspace",
      slug: "test-workspace",
    })
    .returning();

  return {
    db,
    workspaceId: workspace.id,
  };
}

describe("Report Templates", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("template creation", () => {
    it("should create report template with default config", async () => {
      const [template] = await ctx.db
        .insert(schema.reportTemplates)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Monthly Summary",
          templateType: "spending_summary",
          config: DEFAULT_REPORT_CONFIG,
        })
        .returning();

      expect(template.name).toBe("Monthly Summary");
      expect(template.templateType).toBe("spending_summary");
      expect(template.config).toEqual(DEFAULT_REPORT_CONFIG);
    });

    it("should create template with custom config", async () => {
      const customConfig: ReportConfig = {
        dateRange: {type: "custom", startDate: "2024-01-01", endDate: "2024-12-31"},
        accountIds: [1, 2, 3],
        sections: {
          summaryStats: true,
          categoryBreakdown: true,
          monthlyTrend: false,
          transactionDetails: true,
          budgetComparison: false,
          annotations: true,
        },
        charts: {
          pieChart: true,
          barChart: true,
          lineChart: false,
        },
        display: {
          showCurrency: true,
          showPercentages: true,
          groupByCategory: true,
          sortBy: "category",
        },
        branding: {
          title: "Annual Report",
          subtitle: "Financial Year 2024",
          notes: "Prepared by Finance Team",
        },
        exportFormat: "pdf",
      };

      const [template] = await ctx.db
        .insert(schema.reportTemplates)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Custom Report",
          description: "Customized annual report",
          templateType: "custom",
          config: customConfig,
        })
        .returning();

      expect(template.config.dateRange.type).toBe("custom");
      expect(template.config.accountIds).toEqual([1, 2, 3]);
      expect(template.config.branding?.title).toBe("Annual Report");
    });

    it("should create template with predefined type config", async () => {
      const taxPrepConfig: ReportConfig = {
        ...DEFAULT_REPORT_CONFIG,
        ...PREDEFINED_TEMPLATES.tax_prep.config,
      };

      const [template] = await ctx.db
        .insert(schema.reportTemplates)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Tax Preparation Report",
          description: PREDEFINED_TEMPLATES.tax_prep.description,
          templateType: "tax_prep",
          config: taxPrepConfig,
        })
        .returning();

      expect(template.templateType).toBe("tax_prep");
      expect(template.config.sections.transactionDetails).toBe(true);
      expect(template.config.charts.pieChart).toBe(false);
    });
  });

  describe("template types", () => {
    it("should support all predefined template types", async () => {
      const templateTypes = [
        "spending_summary",
        "category_breakdown",
        "budget_vs_actual",
        "income_expense",
        "year_end",
        "tax_prep",
        "custom",
      ];

      for (const type of templateTypes) {
        const [template] = await ctx.db
          .insert(schema.reportTemplates)
          .values({
            workspaceId: ctx.workspaceId,
            name: `${type} Template`,
            templateType: type as schema.ReportTemplateType,
            config: DEFAULT_REPORT_CONFIG,
          })
          .returning();

        expect(template.templateType).toBe(type);
      }

      const templates = await ctx.db
        .select()
        .from(schema.reportTemplates)
        .where(eq(schema.reportTemplates.workspaceId, ctx.workspaceId));

      expect(templates).toHaveLength(templateTypes.length);
    });
  });

  describe("date range configuration", () => {
    it("should handle selected period date range", async () => {
      const config: ReportConfig = {
        ...DEFAULT_REPORT_CONFIG,
        dateRange: {type: "selected"},
      };

      const [template] = await ctx.db
        .insert(schema.reportTemplates)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Selected Period",
          templateType: "spending_summary",
          config,
        })
        .returning();

      expect(template.config.dateRange.type).toBe("selected");
    });

    it("should handle YTD date range", async () => {
      const config: ReportConfig = {
        ...DEFAULT_REPORT_CONFIG,
        dateRange: {type: "ytd"},
      };

      const [template] = await ctx.db
        .insert(schema.reportTemplates)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Year to Date",
          templateType: "spending_summary",
          config,
        })
        .returning();

      expect(template.config.dateRange.type).toBe("ytd");
    });

    it("should handle last year date range", async () => {
      const config: ReportConfig = {
        ...DEFAULT_REPORT_CONFIG,
        dateRange: {type: "last_year"},
      };

      const [template] = await ctx.db
        .insert(schema.reportTemplates)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Last Year Summary",
          templateType: "year_end",
          config,
        })
        .returning();

      expect(template.config.dateRange.type).toBe("last_year");
    });

    it("should handle custom date range with specific dates", async () => {
      const config: ReportConfig = {
        ...DEFAULT_REPORT_CONFIG,
        dateRange: {
          type: "custom",
          startDate: "2024-06-01",
          endDate: "2024-08-31",
        },
      };

      const [template] = await ctx.db
        .insert(schema.reportTemplates)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Summer Quarter",
          templateType: "custom",
          config,
        })
        .returning();

      expect(template.config.dateRange.startDate).toBe("2024-06-01");
      expect(template.config.dateRange.endDate).toBe("2024-08-31");
    });
  });

  describe("template updates", () => {
    it("should update template configuration", async () => {
      const [template] = await ctx.db
        .insert(schema.reportTemplates)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Original",
          templateType: "spending_summary",
          config: DEFAULT_REPORT_CONFIG,
        })
        .returning();

      const updatedConfig: ReportConfig = {
        ...template.config,
        charts: {
          pieChart: false,
          barChart: true,
          lineChart: true,
        },
      };

      await ctx.db
        .update(schema.reportTemplates)
        .set({
          name: "Updated",
          config: updatedConfig,
        })
        .where(eq(schema.reportTemplates.id, template.id));

      const updated = await ctx.db.query.reportTemplates.findFirst({
        where: eq(schema.reportTemplates.id, template.id),
      });

      expect(updated?.name).toBe("Updated");
      expect(updated?.config.charts.pieChart).toBe(false);
      expect(updated?.config.charts.barChart).toBe(true);
    });

    it("should track usage statistics", async () => {
      const [template] = await ctx.db
        .insert(schema.reportTemplates)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Tracked Template",
          templateType: "spending_summary",
          config: DEFAULT_REPORT_CONFIG,
          useCount: 0,
        })
        .returning();

      const now = new Date().toISOString();
      await ctx.db
        .update(schema.reportTemplates)
        .set({
          useCount: (template.useCount ?? 0) + 1,
          lastUsedAt: now,
        })
        .where(eq(schema.reportTemplates.id, template.id));

      const updated = await ctx.db.query.reportTemplates.findFirst({
        where: eq(schema.reportTemplates.id, template.id),
      });

      expect(updated?.useCount).toBe(1);
      expect(updated?.lastUsedAt).toBe(now);
    });

    it("should set template as default", async () => {
      const [template1] = await ctx.db
        .insert(schema.reportTemplates)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Template 1",
          templateType: "spending_summary",
          config: DEFAULT_REPORT_CONFIG,
          isDefault: true,
        })
        .returning();

      const [template2] = await ctx.db
        .insert(schema.reportTemplates)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Template 2",
          templateType: "spending_summary",
          config: DEFAULT_REPORT_CONFIG,
          isDefault: false,
        })
        .returning();

      // Change default to template 2
      await ctx.db
        .update(schema.reportTemplates)
        .set({isDefault: false})
        .where(eq(schema.reportTemplates.id, template1.id));

      await ctx.db
        .update(schema.reportTemplates)
        .set({isDefault: true})
        .where(eq(schema.reportTemplates.id, template2.id));

      const t1 = await ctx.db.query.reportTemplates.findFirst({
        where: eq(schema.reportTemplates.id, template1.id),
      });
      const t2 = await ctx.db.query.reportTemplates.findFirst({
        where: eq(schema.reportTemplates.id, template2.id),
      });

      expect(t1?.isDefault).toBe(false);
      expect(t2?.isDefault).toBe(true);
    });
  });

  describe("export format options", () => {
    it("should support PDF export format", async () => {
      const config: ReportConfig = {
        ...DEFAULT_REPORT_CONFIG,
        exportFormat: "pdf",
      };

      const [template] = await ctx.db
        .insert(schema.reportTemplates)
        .values({
          workspaceId: ctx.workspaceId,
          name: "PDF Report",
          templateType: "spending_summary",
          config,
        })
        .returning();

      expect(template.config.exportFormat).toBe("pdf");
    });

    it("should support HTML export format", async () => {
      const config: ReportConfig = {
        ...DEFAULT_REPORT_CONFIG,
        exportFormat: "html",
      };

      const [template] = await ctx.db
        .insert(schema.reportTemplates)
        .values({
          workspaceId: ctx.workspaceId,
          name: "HTML Report",
          templateType: "spending_summary",
          config,
        })
        .returning();

      expect(template.config.exportFormat).toBe("html");
    });

    it("should support Markdown export format", async () => {
      const config: ReportConfig = {
        ...DEFAULT_REPORT_CONFIG,
        exportFormat: "markdown",
      };

      const [template] = await ctx.db
        .insert(schema.reportTemplates)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Markdown Report",
          templateType: "spending_summary",
          config,
        })
        .returning();

      expect(template.config.exportFormat).toBe("markdown");
    });
  });

  describe("template deletion", () => {
    it("should delete template", async () => {
      const [template] = await ctx.db
        .insert(schema.reportTemplates)
        .values({
          workspaceId: ctx.workspaceId,
          name: "To Delete",
          templateType: "spending_summary",
          config: DEFAULT_REPORT_CONFIG,
        })
        .returning();

      await ctx.db.delete(schema.reportTemplates).where(eq(schema.reportTemplates.id, template.id));

      const deleted = await ctx.db.query.reportTemplates.findFirst({
        where: eq(schema.reportTemplates.id, template.id),
      });

      expect(deleted).toBeUndefined();
    });

    it("should delete templates when workspace is deleted (manual cleanup)", async () => {
      const [workspace2] = await ctx.db
        .insert(schema.workspaces)
        .values({
          displayName: "Workspace to Delete",
          slug: "workspace-to-delete",
        })
        .returning();

      const [template] = await ctx.db
        .insert(schema.reportTemplates)
        .values({
          workspaceId: workspace2.id,
          name: "Template in Deleted Workspace",
          templateType: "spending_summary",
          config: DEFAULT_REPORT_CONFIG,
        })
        .returning();

      // Manual cleanup since SQLite FK cascade may not work in test DB
      await ctx.db
        .delete(schema.reportTemplates)
        .where(eq(schema.reportTemplates.workspaceId, workspace2.id));

      await ctx.db.delete(schema.workspaces).where(eq(schema.workspaces.id, workspace2.id));

      const deletedTemplate = await ctx.db.query.reportTemplates.findFirst({
        where: eq(schema.reportTemplates.id, template.id),
      });

      expect(deletedTemplate).toBeUndefined();
    });
  });

  describe("workspace isolation", () => {
    it("should isolate templates by workspace", async () => {
      const [workspace2] = await ctx.db
        .insert(schema.workspaces)
        .values({
          displayName: "Second Workspace",
          slug: "second-workspace",
        })
        .returning();

      await ctx.db.insert(schema.reportTemplates).values({
        workspaceId: ctx.workspaceId,
        name: "Workspace 1 Template",
        templateType: "spending_summary",
        config: DEFAULT_REPORT_CONFIG,
      });

      await ctx.db.insert(schema.reportTemplates).values({
        workspaceId: workspace2.id,
        name: "Workspace 2 Template",
        templateType: "category_breakdown",
        config: DEFAULT_REPORT_CONFIG,
      });

      const ws1Templates = await ctx.db
        .select()
        .from(schema.reportTemplates)
        .where(eq(schema.reportTemplates.workspaceId, ctx.workspaceId));

      const ws2Templates = await ctx.db
        .select()
        .from(schema.reportTemplates)
        .where(eq(schema.reportTemplates.workspaceId, workspace2.id));

      expect(ws1Templates).toHaveLength(1);
      expect(ws1Templates[0].name).toBe("Workspace 1 Template");

      expect(ws2Templates).toHaveLength(1);
      expect(ws2Templates[0].name).toBe("Workspace 2 Template");
    });
  });
});
