import {db} from "$lib/server/db";
import {budgetTemplates, type BudgetTemplate, type NewBudgetTemplate} from "$lib/schema/budgets";
import {InputSanitizer} from "$lib/server/shared/validation";
import {DatabaseError, NotFoundError, ValidationError} from "$lib/server/shared/types/errors";
import {eq, desc} from "drizzle-orm";

export interface CreateBudgetTemplateRequest {
  name: string;
  description?: string | null;
  type: BudgetTemplate["type"];
  scope: BudgetTemplate["scope"];
  icon?: string;
  suggestedAmount?: number;
  enforcementLevel?: BudgetTemplate["enforcementLevel"];
  metadata?: Record<string, unknown>;
}

export interface UpdateBudgetTemplateRequest {
  name?: string;
  description?: string | null;
  icon?: string;
  suggestedAmount?: number;
  enforcementLevel?: BudgetTemplate["enforcementLevel"];
  metadata?: Record<string, unknown>;
}

export class BudgetTemplateService {
  async listTemplates(includeSystem: boolean = true): Promise<BudgetTemplate[]> {
    if (includeSystem) {
      return await db.select().from(budgetTemplates).orderBy(desc(budgetTemplates.createdAt));
    }
    return await db
      .select()
      .from(budgetTemplates)
      .where(eq(budgetTemplates.isSystem, false))
      .orderBy(desc(budgetTemplates.createdAt));
  }

  async getTemplate(id: number): Promise<BudgetTemplate> {
    const template = await db.query.budgetTemplates.findFirst({
      where: eq(budgetTemplates.id, id),
    });

    if (!template) {
      throw new NotFoundError("Budget template", id);
    }

    return template;
  }

  async createTemplate(input: CreateBudgetTemplateRequest): Promise<BudgetTemplate> {
    const name = InputSanitizer.sanitizeText(input.name, {
      required: true,
      minLength: 2,
      maxLength: 80,
      fieldName: "Template name",
    });

    const description = input.description
      ? InputSanitizer.sanitizeDescription(input.description, 500)
      : null;

    const newTemplate: NewBudgetTemplate = {
      name,
      description,
      type: input.type,
      scope: input.scope,
      icon: input.icon ?? "📊",
      suggestedAmount: input.suggestedAmount ?? null,
      enforcementLevel: input.enforcementLevel ?? "warning",
      metadata: input.metadata ?? null,
      isSystem: false,
    };

    const [created] = await db.insert(budgetTemplates).values(newTemplate).returning();

    if (!created) {
      throw new DatabaseError("Failed to create budget template", "createTemplate");
    }

    return created;
  }

  async updateTemplate(id: number, input: UpdateBudgetTemplateRequest): Promise<BudgetTemplate> {
    const existing = await this.getTemplate(id);

    if (existing.isSystem) {
      throw new ValidationError("Cannot modify system templates", "isSystem");
    }

    const updates: Partial<NewBudgetTemplate> = {};

    if (input.name !== undefined) {
      updates.name = InputSanitizer.sanitizeText(input.name, {
        required: true,
        minLength: 2,
        maxLength: 80,
        fieldName: "Template name",
      });
    }

    if (input.description !== undefined) {
      updates.description = input.description
        ? InputSanitizer.sanitizeDescription(input.description, 500)
        : null;
    }

    if (input.icon !== undefined) {
      updates.icon = input.icon;
    }

    if (input.suggestedAmount !== undefined) {
      updates.suggestedAmount = input.suggestedAmount;
    }

    if (input.enforcementLevel !== undefined) {
      updates.enforcementLevel = input.enforcementLevel;
    }

    if (input.metadata !== undefined) {
      updates.metadata = input.metadata;
    }

    if (Object.keys(updates).length === 0) {
      throw new ValidationError("No updates provided", "template");
    }

    const [updated] = await db
      .update(budgetTemplates)
      .set(updates)
      .where(eq(budgetTemplates.id, id))
      .returning();

    if (!updated) {
      throw new DatabaseError("Failed to update budget template", "updateTemplate");
    }

    return updated;
  }

  async deleteTemplate(id: number): Promise<void> {
    const existing = await this.getTemplate(id);

    if (existing.isSystem) {
      throw new ValidationError("Cannot delete system templates", "isSystem");
    }

    await db.delete(budgetTemplates).where(eq(budgetTemplates.id, id));
  }

  async duplicateTemplate(id: number, newName?: string): Promise<BudgetTemplate> {
    const original = await this.getTemplate(id);

    const duplicatedName = newName || `${original.name} (Copy)`;

    const request: CreateBudgetTemplateRequest = {
      name: duplicatedName,
      description: original.description,
      type: original.type,
      scope: original.scope,
      enforcementLevel: original.enforcementLevel,
    };

    if (original.icon !== null) {
      request.icon = original.icon;
    }

    if (original.suggestedAmount !== null) {
      request.suggestedAmount = original.suggestedAmount;
    }

    if (original.metadata !== null && original.metadata !== undefined) {
      request.metadata = original.metadata as Record<string, unknown>;
    }

    return await this.createTemplate(request);
  }

  async seedSystemTemplates(): Promise<void> {
    const systemTemplates: Omit<NewBudgetTemplate, "createdAt" | "updatedAt">[] = [
      {
        name: "Monthly Checking Account Budget",
        description: "Track total spending in your checking account each month",
        type: "account-monthly",
        scope: "account",
        icon: "💰",
        suggestedAmount: null,
        enforcementLevel: "warning",
        metadata: {
          defaultPeriod: {type: "monthly", startDay: 1},
        },
        isSystem: true,
      },
      {
        name: "Monthly Savings Goal",
        description: "Set aside a specific amount each month for savings",
        type: "goal-based",
        scope: "account",
        icon: "🎯",
        suggestedAmount: null,
        enforcementLevel: "none",
        metadata: {
          goal: {contributionFrequency: "monthly"},
        },
        isSystem: true,
      },
      {
        name: "Groceries Budget",
        description: "Envelope-style budget for grocery spending",
        type: "category-envelope",
        scope: "category",
        icon: "🛒",
        suggestedAmount: 500,
        enforcementLevel: "warning",
        metadata: {
          rolloverType: "indefinite",
        },
        isSystem: true,
      },
      {
        name: "Dining Out Budget",
        description: "Envelope-style budget for restaurants and takeout",
        type: "category-envelope",
        scope: "category",
        icon: "🍽️",
        suggestedAmount: 300,
        enforcementLevel: "warning",
        metadata: {
          rolloverType: "indefinite",
        },
        isSystem: true,
      },
      {
        name: "Transportation Budget",
        description: "Envelope-style budget for gas, parking, and transit",
        type: "category-envelope",
        scope: "category",
        icon: "🚗",
        suggestedAmount: 200,
        enforcementLevel: "warning",
        metadata: {
          rolloverType: "indefinite",
        },
        isSystem: true,
      },
      {
        name: "Entertainment Budget",
        description: "Envelope-style budget for fun and leisure",
        type: "category-envelope",
        scope: "category",
        icon: "🎬",
        suggestedAmount: 150,
        enforcementLevel: "none",
        metadata: {
          rolloverType: "indefinite",
        },
        isSystem: true,
      },
      {
        name: "Utilities Budget",
        description: "Envelope-style budget for electric, water, gas, internet",
        type: "category-envelope",
        scope: "category",
        icon: "⚡",
        suggestedAmount: 250,
        enforcementLevel: "warning",
        metadata: {
          rolloverType: "indefinite",
        },
        isSystem: true,
      },
      {
        name: "Healthcare Budget",
        description: "Envelope-style budget for medical expenses",
        type: "category-envelope",
        scope: "category",
        icon: "🏥",
        suggestedAmount: 200,
        enforcementLevel: "warning",
        metadata: {
          rolloverType: "indefinite",
        },
        isSystem: true,
      },
      {
        name: "Rent/Mortgage Payment",
        description: "Scheduled expense budget for housing costs",
        type: "scheduled-expense",
        scope: "category",
        icon: "🏠",
        suggestedAmount: null,
        enforcementLevel: "strict",
        metadata: {
          defaultPeriod: {type: "monthly"},
        },
        isSystem: true,
      },
      {
        name: "Emergency Fund",
        description: "Build an emergency fund with automatic contributions",
        type: "goal-based",
        scope: "account",
        icon: "🆘",
        suggestedAmount: null,
        enforcementLevel: "none",
        metadata: {
          goal: {contributionFrequency: "monthly", autoContribute: true},
        },
        isSystem: true,
      },
    ];

    for (const template of systemTemplates) {
      const existing = await db.query.budgetTemplates.findFirst({
        where: (t, {and, eq}) => and(eq(t.name, template.name), eq(t.isSystem, true)),
      });

      if (!existing) {
        await db.insert(budgetTemplates).values(template);
      }
    }
  }
}
