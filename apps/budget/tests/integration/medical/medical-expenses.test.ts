/**
 * Medical Expenses - Integration Tests
 *
 * Tests medical expense tracking including expense creation,
 * HSA account linking, tax year tracking, and reimbursements.
 */

import {describe, it, expect, beforeEach} from "vitest";
import {setupTestDb} from "../setup/test-db";
import * as schema from "../../../src/lib/schema";
import {eq, and} from "drizzle-orm";
import type {BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";

type TestDb = BunSQLiteDatabase<typeof schema>;

interface TestContext {
  db: TestDb;
  workspaceId: number;
  hsaAccountId: number;
  checkingAccountId: number;
  transactionId: number;
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

  const [hsaAccount] = await db
    .insert(schema.accounts)
    .values({
      workspaceId: workspace.id,
      name: "HSA Account",
      slug: "hsa-account",
      type: "hsa",
    })
    .returning();

  const [checkingAccount] = await db
    .insert(schema.accounts)
    .values({
      workspaceId: workspace.id,
      name: "Checking",
      slug: "checking",
      type: "checking",
    })
    .returning();

  // Create a transaction for the medical expense
  const [transaction] = await db
    .insert(schema.transactions)
    .values({
      workspaceId: workspace.id,
      accountId: checkingAccount.id,
      date: "2024-01-15",
      amount: -150.00,
      status: "cleared",
    })
    .returning();

  return {
    db,
    workspaceId: workspace.id,
    hsaAccountId: hsaAccount.id,
    checkingAccountId: checkingAccount.id,
    transactionId: transaction.id,
  };
}

describe("Medical Expenses", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("expense creation", () => {
    it("should create medical expense", async () => {
      const [expense] = await ctx.db
        .insert(schema.medicalExpenses)
        .values({
          transactionId: ctx.transactionId,
          hsaAccountId: ctx.hsaAccountId,
          expenseType: "doctor_visit",
          isQualified: true,
          provider: "General Hospital",
          patientName: "John Doe",
          amount: 150.00,
          insuranceCovered: 50.00,
          outOfPocket: 100.00,
          serviceDate: "2024-01-10",
          taxYear: 2024,
        })
        .returning();

      expect(expense.expenseType).toBe("doctor_visit");
      expect(expense.isQualified).toBe(true);
      expect(expense.amount).toBe(150.00);
      expect(expense.outOfPocket).toBe(100.00);
    });

    it("should create dental expense", async () => {
      const [expense] = await ctx.db
        .insert(schema.medicalExpenses)
        .values({
          transactionId: ctx.transactionId,
          hsaAccountId: ctx.hsaAccountId,
          expenseType: "dental_filling",
          isQualified: true,
          provider: "Family Dentistry",
          amount: 200.00,
          insuranceCovered: 100.00,
          outOfPocket: 100.00,
          serviceDate: "2024-01-08",
          taxYear: 2024,
        })
        .returning();

      expect(expense.expenseType).toBe("dental_filling");
    });

    it("should create vision expense", async () => {
      const [expense] = await ctx.db
        .insert(schema.medicalExpenses)
        .values({
          transactionId: ctx.transactionId,
          hsaAccountId: ctx.hsaAccountId,
          expenseType: "eyeglasses",
          isQualified: true,
          provider: "Vision Center",
          amount: 300.00,
          insuranceCovered: 150.00,
          outOfPocket: 150.00,
          serviceDate: "2024-01-05",
          taxYear: 2024,
        })
        .returning();

      expect(expense.expenseType).toBe("eyeglasses");
    });

    it("should create prescription expense", async () => {
      const [expense] = await ctx.db
        .insert(schema.medicalExpenses)
        .values({
          transactionId: ctx.transactionId,
          hsaAccountId: ctx.hsaAccountId,
          expenseType: "prescription",
          isQualified: true,
          provider: "CVS Pharmacy",
          amount: 45.00,
          insuranceCovered: 35.00,
          outOfPocket: 10.00,
          serviceDate: "2024-01-12",
          taxYear: 2024,
        })
        .returning();

      expect(expense.expenseType).toBe("prescription");
      expect(expense.outOfPocket).toBe(10.00);
    });
  });

  describe("expense types", () => {
    it("should support all medical service types", async () => {
      const serviceTypes = [
        "doctor_visit",
        "specialist_visit",
        "urgent_care",
        "emergency_room",
        "hospital_stay",
        "surgery",
        "lab_tests",
        "imaging",
      ];

      for (let i = 0; i < serviceTypes.length; i++) {
        const type = serviceTypes[i];
        // Create a new transaction for each expense
        const [tx] = await ctx.db
          .insert(schema.transactions)
          .values({
            workspaceId: ctx.workspaceId,
            accountId: ctx.checkingAccountId,
            date: `2024-01-${String(i + 1).padStart(2, "0")}`,
            amount: -(50 + i * 10),
            status: "cleared",
          })
          .returning();

        const [expense] = await ctx.db
          .insert(schema.medicalExpenses)
          .values({
            transactionId: tx.id,
            hsaAccountId: ctx.hsaAccountId,
            expenseType: type,
            isQualified: true,
            amount: 50 + i * 10,
            insuranceCovered: 0,
            outOfPocket: 50 + i * 10,
            serviceDate: `2024-01-${String(i + 1).padStart(2, "0")}`,
            taxYear: 2024,
          })
          .returning();

        expect(expense.expenseType).toBe(type);
      }
    });

    it("should support therapy types", async () => {
      const [expense] = await ctx.db
        .insert(schema.medicalExpenses)
        .values({
          transactionId: ctx.transactionId,
          hsaAccountId: ctx.hsaAccountId,
          expenseType: "physical_therapy",
          isQualified: true,
          provider: "PT Clinic",
          amount: 100.00,
          insuranceCovered: 80.00,
          outOfPocket: 20.00,
          serviceDate: "2024-01-15",
          taxYear: 2024,
        })
        .returning();

      expect(expense.expenseType).toBe("physical_therapy");
    });

    it("should support non-qualified expenses", async () => {
      const [expense] = await ctx.db
        .insert(schema.medicalExpenses)
        .values({
          transactionId: ctx.transactionId,
          hsaAccountId: ctx.hsaAccountId,
          expenseType: "non_qualified",
          isQualified: false,
          provider: "Spa",
          amount: 200.00,
          insuranceCovered: 0,
          outOfPocket: 200.00,
          serviceDate: "2024-01-20",
          taxYear: 2024,
          notes: "Massage - not HSA qualified",
        })
        .returning();

      expect(expense.isQualified).toBe(false);
      expect(expense.expenseType).toBe("non_qualified");
    });
  });

  describe("tax year tracking", () => {
    it("should track expenses by tax year", async () => {
      // 2023 expense
      const [tx2023] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.checkingAccountId,
          date: "2023-12-15",
          amount: -100.00,
          status: "cleared",
        })
        .returning();

      await ctx.db.insert(schema.medicalExpenses).values({
        transactionId: tx2023.id,
        hsaAccountId: ctx.hsaAccountId,
        expenseType: "doctor_visit",
        isQualified: true,
        amount: 100.00,
        insuranceCovered: 0,
        outOfPocket: 100.00,
        serviceDate: "2023-12-10",
        taxYear: 2023,
      });

      // 2024 expense
      await ctx.db.insert(schema.medicalExpenses).values({
        transactionId: ctx.transactionId,
        hsaAccountId: ctx.hsaAccountId,
        expenseType: "prescription",
        isQualified: true,
        amount: 50.00,
        insuranceCovered: 0,
        outOfPocket: 50.00,
        serviceDate: "2024-01-05",
        taxYear: 2024,
      });

      // Query by tax year
      const expenses2023 = await ctx.db
        .select()
        .from(schema.medicalExpenses)
        .where(eq(schema.medicalExpenses.taxYear, 2023));

      const expenses2024 = await ctx.db
        .select()
        .from(schema.medicalExpenses)
        .where(eq(schema.medicalExpenses.taxYear, 2024));

      expect(expenses2023).toHaveLength(1);
      expect(expenses2024).toHaveLength(1);
    });

    it("should calculate total qualified expenses by tax year", async () => {
      // Create multiple expenses for same tax year
      const [tx1] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.checkingAccountId,
          date: "2024-02-01",
          amount: -200.00,
          status: "cleared",
        })
        .returning();

      const [tx2] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.checkingAccountId,
          date: "2024-03-01",
          amount: -300.00,
          status: "cleared",
        })
        .returning();

      await ctx.db.insert(schema.medicalExpenses).values({
        transactionId: ctx.transactionId,
        hsaAccountId: ctx.hsaAccountId,
        expenseType: "doctor_visit",
        isQualified: true,
        amount: 150.00,
        insuranceCovered: 50.00,
        outOfPocket: 100.00,
        serviceDate: "2024-01-10",
        taxYear: 2024,
      });

      await ctx.db.insert(schema.medicalExpenses).values({
        transactionId: tx1.id,
        hsaAccountId: ctx.hsaAccountId,
        expenseType: "dental_exam",
        isQualified: true,
        amount: 200.00,
        insuranceCovered: 100.00,
        outOfPocket: 100.00,
        serviceDate: "2024-02-01",
        taxYear: 2024,
      });

      await ctx.db.insert(schema.medicalExpenses).values({
        transactionId: tx2.id,
        hsaAccountId: ctx.hsaAccountId,
        expenseType: "eyeglasses",
        isQualified: true,
        amount: 300.00,
        insuranceCovered: 0,
        outOfPocket: 300.00,
        serviceDate: "2024-03-01",
        taxYear: 2024,
      });

      const expenses = await ctx.db
        .select()
        .from(schema.medicalExpenses)
        .where(
          and(eq(schema.medicalExpenses.taxYear, 2024), eq(schema.medicalExpenses.isQualified, true))
        );

      const totalOutOfPocket = expenses.reduce((sum, e) => sum + e.outOfPocket, 0);

      expect(expenses).toHaveLength(3);
      expect(totalOutOfPocket).toBe(500.00); // 100 + 100 + 300
    });
  });

  describe("insurance coverage tracking", () => {
    it("should track insurance vs out-of-pocket", async () => {
      const [expense] = await ctx.db
        .insert(schema.medicalExpenses)
        .values({
          transactionId: ctx.transactionId,
          hsaAccountId: ctx.hsaAccountId,
          expenseType: "surgery",
          isQualified: true,
          provider: "Surgical Center",
          amount: 5000.00,
          insuranceCovered: 4000.00,
          outOfPocket: 1000.00,
          serviceDate: "2024-01-15",
          taxYear: 2024,
        })
        .returning();

      expect(expense.amount).toBe(5000.00);
      expect(expense.insuranceCovered).toBe(4000.00);
      expect(expense.outOfPocket).toBe(1000.00);
    });

    it("should handle fully covered by insurance", async () => {
      const [expense] = await ctx.db
        .insert(schema.medicalExpenses)
        .values({
          transactionId: ctx.transactionId,
          hsaAccountId: ctx.hsaAccountId,
          expenseType: "annual_physical",
          isQualified: true,
          provider: "Primary Care",
          amount: 200.00,
          insuranceCovered: 200.00,
          outOfPocket: 0,
          serviceDate: "2024-01-20",
          taxYear: 2024,
        })
        .returning();

      expect(expense.outOfPocket).toBe(0);
    });

    it("should handle no insurance coverage", async () => {
      const [expense] = await ctx.db
        .insert(schema.medicalExpenses)
        .values({
          transactionId: ctx.transactionId,
          hsaAccountId: ctx.hsaAccountId,
          expenseType: "chiropractor",
          isQualified: true,
          provider: "Chiro Center",
          amount: 75.00,
          insuranceCovered: 0,
          outOfPocket: 75.00,
          serviceDate: "2024-01-22",
          taxYear: 2024,
        })
        .returning();

      expect(expense.insuranceCovered).toBe(0);
      expect(expense.outOfPocket).toBe(expense.amount);
    });
  });

  describe("expense details", () => {
    it("should store provider information", async () => {
      const [expense] = await ctx.db
        .insert(schema.medicalExpenses)
        .values({
          transactionId: ctx.transactionId,
          hsaAccountId: ctx.hsaAccountId,
          expenseType: "specialist_visit",
          isQualified: true,
          provider: "Dr. Smith Cardiology",
          patientName: "Jane Doe",
          diagnosis: "Routine checkup",
          treatmentDescription: "Annual cardiac evaluation",
          amount: 250.00,
          insuranceCovered: 200.00,
          outOfPocket: 50.00,
          serviceDate: "2024-01-15",
          taxYear: 2024,
          notes: "Follow-up recommended in 6 months",
        })
        .returning();

      expect(expense.provider).toBe("Dr. Smith Cardiology");
      expect(expense.patientName).toBe("Jane Doe");
      expect(expense.diagnosis).toBe("Routine checkup");
      expect(expense.treatmentDescription).toBe("Annual cardiac evaluation");
      expect(expense.notes).toBe("Follow-up recommended in 6 months");
    });

    it("should track service date vs paid date", async () => {
      const [expense] = await ctx.db
        .insert(schema.medicalExpenses)
        .values({
          transactionId: ctx.transactionId,
          hsaAccountId: ctx.hsaAccountId,
          expenseType: "hospital_stay",
          isQualified: true,
          amount: 1000.00,
          insuranceCovered: 800.00,
          outOfPocket: 200.00,
          serviceDate: "2024-01-05", // Service happened
          paidDate: "2024-01-15", // Payment made later
          taxYear: 2024, // Based on payment date per IRS rules
        })
        .returning();

      expect(expense.serviceDate).toBe("2024-01-05");
      expect(expense.paidDate).toBe("2024-01-15");
    });
  });

  describe("expense updates", () => {
    it("should update expense details", async () => {
      const [expense] = await ctx.db
        .insert(schema.medicalExpenses)
        .values({
          transactionId: ctx.transactionId,
          hsaAccountId: ctx.hsaAccountId,
          expenseType: "doctor_visit",
          isQualified: true,
          amount: 100.00,
          insuranceCovered: 0,
          outOfPocket: 100.00,
          serviceDate: "2024-01-15",
          taxYear: 2024,
        })
        .returning();

      // Update after insurance processed
      await ctx.db
        .update(schema.medicalExpenses)
        .set({
          insuranceCovered: 80.00,
          outOfPocket: 20.00,
        })
        .where(eq(schema.medicalExpenses.id, expense.id));

      const updated = await ctx.db.query.medicalExpenses.findFirst({
        where: eq(schema.medicalExpenses.id, expense.id),
      });

      expect(updated?.insuranceCovered).toBe(80.00);
      expect(updated?.outOfPocket).toBe(20.00);
    });

    it("should update qualification status", async () => {
      const [expense] = await ctx.db
        .insert(schema.medicalExpenses)
        .values({
          transactionId: ctx.transactionId,
          hsaAccountId: ctx.hsaAccountId,
          expenseType: "other_qualified",
          isQualified: true,
          amount: 50.00,
          insuranceCovered: 0,
          outOfPocket: 50.00,
          serviceDate: "2024-01-15",
          taxYear: 2024,
        })
        .returning();

      // Discovered it's not actually qualified
      await ctx.db
        .update(schema.medicalExpenses)
        .set({
          isQualified: false,
          expenseType: "non_qualified",
          notes: "Reviewed - not HSA qualified",
        })
        .where(eq(schema.medicalExpenses.id, expense.id));

      const updated = await ctx.db.query.medicalExpenses.findFirst({
        where: eq(schema.medicalExpenses.id, expense.id),
      });

      expect(updated?.isQualified).toBe(false);
      expect(updated?.expenseType).toBe("non_qualified");
    });
  });

  describe("expense deletion", () => {
    it("should soft delete expense", async () => {
      const [expense] = await ctx.db
        .insert(schema.medicalExpenses)
        .values({
          transactionId: ctx.transactionId,
          hsaAccountId: ctx.hsaAccountId,
          expenseType: "doctor_visit",
          isQualified: true,
          amount: 100.00,
          insuranceCovered: 0,
          outOfPocket: 100.00,
          serviceDate: "2024-01-15",
          taxYear: 2024,
        })
        .returning();

      const now = new Date().toISOString();
      await ctx.db
        .update(schema.medicalExpenses)
        .set({deletedAt: now})
        .where(eq(schema.medicalExpenses.id, expense.id));

      const deleted = await ctx.db.query.medicalExpenses.findFirst({
        where: eq(schema.medicalExpenses.id, expense.id),
      });

      expect(deleted?.deletedAt).toBe(now);
    });

    it("should hard delete expense", async () => {
      const [expense] = await ctx.db
        .insert(schema.medicalExpenses)
        .values({
          transactionId: ctx.transactionId,
          hsaAccountId: ctx.hsaAccountId,
          expenseType: "doctor_visit",
          isQualified: true,
          amount: 100.00,
          insuranceCovered: 0,
          outOfPocket: 100.00,
          serviceDate: "2024-01-15",
          taxYear: 2024,
        })
        .returning();

      await ctx.db.delete(schema.medicalExpenses).where(eq(schema.medicalExpenses.id, expense.id));

      const deleted = await ctx.db.query.medicalExpenses.findFirst({
        where: eq(schema.medicalExpenses.id, expense.id),
      });

      expect(deleted).toBeUndefined();
    });
  });

  describe("HSA account queries", () => {
    it("should list expenses by HSA account", async () => {
      // Create second HSA account
      const [hsaAccount2] = await ctx.db
        .insert(schema.accounts)
        .values({
          workspaceId: ctx.workspaceId,
          name: "HSA Account 2",
          slug: "hsa-account-2",
          type: "hsa",
        })
        .returning();

      // Create transaction for second HSA
      const [tx2] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.checkingAccountId,
          date: "2024-02-01",
          amount: -75.00,
          status: "cleared",
        })
        .returning();

      // Expense for first HSA
      await ctx.db.insert(schema.medicalExpenses).values({
        transactionId: ctx.transactionId,
        hsaAccountId: ctx.hsaAccountId,
        expenseType: "doctor_visit",
        isQualified: true,
        amount: 100.00,
        insuranceCovered: 0,
        outOfPocket: 100.00,
        serviceDate: "2024-01-15",
        taxYear: 2024,
      });

      // Expense for second HSA
      await ctx.db.insert(schema.medicalExpenses).values({
        transactionId: tx2.id,
        hsaAccountId: hsaAccount2.id,
        expenseType: "prescription",
        isQualified: true,
        amount: 75.00,
        insuranceCovered: 0,
        outOfPocket: 75.00,
        serviceDate: "2024-02-01",
        taxYear: 2024,
      });

      const hsa1Expenses = await ctx.db
        .select()
        .from(schema.medicalExpenses)
        .where(eq(schema.medicalExpenses.hsaAccountId, ctx.hsaAccountId));

      const hsa2Expenses = await ctx.db
        .select()
        .from(schema.medicalExpenses)
        .where(eq(schema.medicalExpenses.hsaAccountId, hsaAccount2.id));

      expect(hsa1Expenses).toHaveLength(1);
      expect(hsa2Expenses).toHaveLength(1);
    });
  });
});
