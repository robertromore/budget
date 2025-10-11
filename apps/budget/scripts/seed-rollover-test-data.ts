#!/usr/bin/env bun

/**
 * Seed script to create test data for rollover system testing
 * Run with: bun run apps/budget/scripts/seed-rollover-test-data.ts
 */

import {db} from '../src/lib/server/db';
import {budgets, budgetPeriodTemplates, budgetPeriodInstances, budgetAccounts} from '../src/lib/schema/budgets';
import {envelopeAllocations} from '../src/lib/schema/budgets/envelope-allocations';
import {categories} from '../src/lib/schema/categories';
import {accounts} from '../src/lib/schema/accounts';
import {transactions} from '../src/lib/schema/transactions';
import {eq, and} from 'drizzle-orm';

console.log('🌱 Seeding rollover test data...\n');

async function seedRolloverTestData() {
  try {
    // 1. Create or get a test account
    console.log('📊 Creating test account...');

    // Try to find existing account first
    let account = await db.query.accounts.findFirst({
      where: eq(accounts.name, 'Test Checking Account'),
    });

    if (!account) {
      [account] = await db
        .insert(accounts)
        .values({
          name: 'Test Checking Account',
          slug: 'test-checking-account',
          accountType: 'checking',
          initialBalance: 10000,
          onBudget: true,
        })
        .returning();
    }
    console.log(`✓ Account ready: ${account.name} (ID: ${account.id})\n`);

    // 2. Create test categories
    console.log('📁 Creating test categories...');
    const categoryData = [
      {name: 'Groceries', slug: 'groceries', type: 'expense' as const, color: '#10b981'},
      {name: 'Gas', slug: 'gas', type: 'expense' as const, color: '#3b82f6'},
      {name: 'Entertainment', slug: 'entertainment', type: 'expense' as const, color: '#8b5cf6'},
      {name: 'Utilities', slug: 'utilities', type: 'expense' as const, color: '#f59e0b'},
      {name: 'Savings', slug: 'savings', type: 'expense' as const, color: '#06b6d4'},
    ];

    const testCategories = [];
    for (const cat of categoryData) {
      let category = await db.query.categories.findFirst({
        where: eq(categories.name, cat.name),
      });

      if (!category) {
        [category] = await db.insert(categories).values(cat).returning();
      }
      testCategories.push(category);
      console.log(`  ✓ ${category.name} (ID: ${category.id})`);
    }
    console.log();

    // 3. Create a test budget
    console.log('💰 Creating test budget...');
    let budget = await db.query.budgets.findFirst({
      where: eq(budgets.name, 'Rollover Test Budget'),
    });

    if (!budget) {
      [budget] = await db
        .insert(budgets)
        .values({
          name: 'Rollover Test Budget',
          slug: 'rollover-test-budget',
          type: 'envelope',
          scope: 'account',
          metadata: {
            rolloverSettings: {
              enabled: true,
              maxRolloverPercentage: 100,
              rolloverLimitMonths: 6,
              deficitRecoveryMode: 'gradual',
              autoTransition: false,
              notificationEnabled: true,
            },
          },
        })
        .returning();
    }
    console.log(`✓ Budget ready: ${budget.name} (ID: ${budget.id})`);

    // Link budget to account
    const existingBudgetAccount = await db.query.budgetAccounts.findFirst({
      where: and(
        eq(budgetAccounts.budgetId, budget.id),
        eq(budgetAccounts.accountId, account.id)
      ),
    });

    if (!existingBudgetAccount) {
      await db.insert(budgetAccounts).values({
        budgetId: budget.id,
        accountId: account.id,
      });
      console.log(`✓ Budget linked to account\n`);
    } else {
      console.log(`✓ Budget already linked to account\n`);
    }

    // 4. Create period template
    console.log('📅 Creating period template...');
    let template = await db.query.budgetPeriodTemplates.findFirst({
      where: eq(budgetPeriodTemplates.budgetId, budget.id),
    });

    if (!template) {
      [template] = await db
        .insert(budgetPeriodTemplates)
        .values({
          budgetId: budget.id,
          type: 'monthly',
          intervalCount: 1,
          startDayOfMonth: 1,
        })
        .returning();
    }
    console.log(`✓ Template ready (ID: ${template.id})\n`);

    // 5. Create two period instances (previous and current)
    console.log('📆 Creating period instances...');
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Previous period
    const previousPeriodName = `${lastMonth.toLocaleString('default', {month: 'long'})} ${lastMonth.getFullYear()}`;
    let previousPeriod = await db.query.budgetPeriodInstances.findFirst({
      where: and(
        eq(budgetPeriodInstances.templateId, template.id),
        eq(budgetPeriodInstances.startDate, lastMonth.toISOString().split('T')[0])
      ),
    });

    if (!previousPeriod) {
      [previousPeriod] = await db
        .insert(budgetPeriodInstances)
        .values({
          templateId: template.id,
          startDate: lastMonth.toISOString().split('T')[0],
          endDate: lastMonthEnd.toISOString().split('T')[0],
          allocatedAmount: 1750, // Total allocated for all categories
          rolloverAmount: 0,
          actualAmount: 1305, // Total spent in previous period
        })
        .returning();
    }

    // Current period
    const currentPeriodName = `${thisMonth.toLocaleString('default', {month: 'long'})} ${thisMonth.getFullYear()}`;
    let currentPeriod = await db.query.budgetPeriodInstances.findFirst({
      where: and(
        eq(budgetPeriodInstances.templateId, template.id),
        eq(budgetPeriodInstances.startDate, thisMonth.toISOString().split('T')[0])
      ),
    });

    if (!currentPeriod) {
      [currentPeriod] = await db
        .insert(budgetPeriodInstances)
        .values({
          templateId: template.id,
          startDate: thisMonth.toISOString().split('T')[0],
          endDate: thisMonthEnd.toISOString().split('T')[0],
          allocatedAmount: 1750, // Same as previous period
          rolloverAmount: 0, // Will be filled by rollover process
          actualAmount: 0,
        })
        .returning();
    }

    console.log(`✓ Previous period: ${previousPeriodName} (ID: ${previousPeriod.id})`);
    console.log(`✓ Current period: ${currentPeriodName} (ID: ${currentPeriod.id})\n`);

    // 6. Create envelope allocations for previous period
    console.log('📮 Creating envelope allocations for previous period...');
    const envelopeData = [
      {
        category: testCategories[0], // Groceries
        allocated: 600,
        spent: 450, // $150 surplus
        rolloverMode: 'unlimited' as const,
        priority: 1,
      },
      {
        category: testCategories[1], // Gas
        allocated: 200,
        spent: 180, // $20 surplus
        rolloverMode: 'limited' as const,
        priority: 2,
        maxRolloverMonths: 3,
      },
      {
        category: testCategories[2], // Entertainment
        allocated: 150,
        spent: 175, // $25 deficit
        rolloverMode: 'unlimited' as const,
        priority: 3,
      },
      {
        category: testCategories[3], // Utilities
        allocated: 300,
        spent: 300, // $0
        rolloverMode: 'reset' as const,
        priority: 4,
      },
      {
        category: testCategories[4], // Savings
        allocated: 500,
        spent: 100, // $400 surplus
        rolloverMode: 'unlimited' as const,
        priority: 5,
        isEmergencyFund: true,
      },
    ];

    for (const data of envelopeData) {
      const availableAmount = data.allocated - data.spent;
      const deficitAmount = Math.max(0, data.spent - data.allocated);

      let envelope = await db.query.envelopeAllocations.findFirst({
        where: and(
          eq(envelopeAllocations.budgetId, budget.id),
          eq(envelopeAllocations.categoryId, data.category.id),
          eq(envelopeAllocations.periodInstanceId, previousPeriod.id)
        ),
      });

      if (!envelope) {
        [envelope] = await db
          .insert(envelopeAllocations)
          .values({
            budgetId: budget.id,
            categoryId: data.category.id,
            periodInstanceId: previousPeriod.id,
            allocatedAmount: data.allocated,
            spentAmount: data.spent,
            rolloverAmount: 0,
            availableAmount: Math.max(0, availableAmount),
            deficitAmount,
            status: deficitAmount > 0 ? 'overspent' : 'active',
            rolloverMode: data.rolloverMode,
            metadata: {
              priority: data.priority,
              isEmergencyFund: data.isEmergencyFund,
              maxRolloverMonths: data.maxRolloverMonths,
            },
          })
          .returning();
      }

      console.log(
        `  ✓ ${data.category.name}: $${data.allocated} allocated, $${data.spent} spent, ${availableAmount >= 0 ? `$${availableAmount} surplus` : `$${Math.abs(availableAmount)} deficit`}`
      );

      // Create some transactions for this envelope
      if (data.spent > 0) {
        const transactionCount = Math.floor(Math.random() * 3) + 2; // 2-4 transactions
        const amountPerTransaction = data.spent / transactionCount;

        for (let i = 0; i < transactionCount; i++) {
          const transactionDate = new Date(lastMonth);
          transactionDate.setDate(Math.floor(Math.random() * 28) + 1);

          await db.insert(transactions).values({
            accountId: account.id,
            categoryId: data.category.id,
            amount: -amountPerTransaction,
            date: transactionDate.toISOString().split('T')[0],
            description: `Test ${data.category.name} purchase ${i + 1}`,
            type: 'debit',
            status: 'cleared',
            metadata: {},
          });
        }
      }
    }
    console.log();

    // 7. Create empty envelopes for current period
    console.log('📮 Creating envelope allocations for current period...');
    for (const data of envelopeData) {
      let currentEnvelope = await db.query.envelopeAllocations.findFirst({
        where: and(
          eq(envelopeAllocations.budgetId, budget.id),
          eq(envelopeAllocations.categoryId, data.category.id),
          eq(envelopeAllocations.periodInstanceId, currentPeriod.id)
        ),
      });

      if (!currentEnvelope) {
        await db
          .insert(envelopeAllocations)
          .values({
            budgetId: budget.id,
            categoryId: data.category.id,
            periodInstanceId: currentPeriod.id,
            allocatedAmount: data.allocated,
            spentAmount: 0,
            rolloverAmount: 0,
            availableAmount: data.allocated,
            deficitAmount: 0,
            status: 'active',
            rolloverMode: data.rolloverMode,
            metadata: {
              priority: data.priority,
              isEmergencyFund: data.isEmergencyFund,
              maxRolloverMonths: data.maxRolloverMonths,
            },
          });
      }

      console.log(`  ✓ ${data.category.name}: $${data.allocated} allocated (ready for rollover)`);
    }
    console.log();

    console.log('✅ Test data seeded successfully!\n');
    console.log('📝 Summary:');
    console.log(`   - Budget: "${budget.name}" (ID: ${budget.id})`);
    console.log(`   - Previous Period: "${previousPeriod.name}" (ID: ${previousPeriod.id})`);
    console.log(`   - Current Period: "${currentPeriod.name}" (ID: ${currentPeriod.id})`);
    console.log(`   - Envelopes: ${envelopeData.length} per period`);
    console.log(`   - Expected rollover: ~$545 surplus, $25 deficit\n`);
    console.log('🎯 To test rollover:');
    console.log(`   1. Navigate to /budgets/${budget.id}`);
    console.log('   2. Go to Rollover Manager tab');
    console.log('   3. Click "Manual Transition"');
    console.log('   4. Observe the detailed notification!\n');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  }
}

// Run the seed function
seedRolloverTestData()
  .then(() => {
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
