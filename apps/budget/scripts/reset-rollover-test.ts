#!/usr/bin/env bun

/**
 * Reset the October period envelopes to remove rollover amounts
 * This allows us to test the rollover transition again
 */

import {db} from '../src/lib/server/db';
import {envelopeAllocations} from '../src/lib/schema/budgets/envelope-allocations';
import {budgetPeriodInstances} from '../src/lib/schema/budgets';
import {eq} from 'drizzle-orm';

console.log('🔄 Resetting rollover test data...\n');

async function resetRolloverTest() {
  try {
    // Find the October period (period 2)
    const octoberPeriod = await db.query.budgetPeriodInstances.findFirst({
      where: eq(budgetPeriodInstances.id, 2),
    });

    if (!octoberPeriod) {
      console.log('❌ October period not found');
      return;
    }

    console.log(`📅 Found October period: ${octoberPeriod.startDate} to ${octoberPeriod.endDate}`);

    // Reset all envelope allocations for October to remove rollover amounts
    const envelopes = await db.query.envelopeAllocations.findMany({
      where: eq(envelopeAllocations.periodInstanceId, 2),
      with: {
        category: true,
      },
    });

    console.log(`\n📮 Resetting ${envelopes.length} envelopes...\n`);

    for (const envelope of envelopes) {
      // Reset to just the allocated amount (remove rollover)
      await db
        .update(envelopeAllocations)
        .set({
          availableAmount: envelope.allocatedAmount,
          rolloverAmount: 0,
          spentAmount: 0,
          deficitAmount: 0,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(envelopeAllocations.id, envelope.id));

      console.log(`  ✓ Reset ${envelope.category.name}: $${envelope.allocatedAmount} available (was $${envelope.availableAmount})`);
    }

    // Reset the period's rollover amount
    await db
      .update(budgetPeriodInstances)
      .set({
        rolloverAmount: 0,
      })
      .where(eq(budgetPeriodInstances.id, 2));

    console.log('\n✅ Reset complete! October period is ready for rollover testing.\n');
    console.log('🎯 Now you can:');
    console.log('   1. Go to /budgets/rollover-test-budget');
    console.log('   2. Open the Rollover Manager tab');
    console.log('   3. Click "Manual Transition"');
    console.log('   4. Watch the rollover happen and see the notification!\n');
  } catch (error) {
    console.error('❌ Error resetting test data:', error);
    throw error;
  }
}

resetRolloverTest();
