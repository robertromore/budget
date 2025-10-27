import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, isNull } from 'drizzle-orm';
import { schedules } from '$lib/schema';

export const load: PageServerLoad = async ({ params }) => {
  // Load schedule by slug with all related data
  const schedule = await db.query.schedules.findFirst({
    where: eq(schedules.slug, params.slug),
    with: {
      account: true,
      payee: true,
      scheduleDate: true,
      transactions: {
        where: (transactions, { isNull }) => isNull(transactions.deletedAt),
        with: {
          payee: true,
          category: true,
        },
        orderBy: (transactions, { desc }) => [desc(transactions.date)],
        limit: 50 // Get recent transactions for history
      },
    },
  });

  if (!schedule) {
    throw error(404, 'Schedule not found');
  }

  // Calculate statistics
  const totalTransactions = schedule.transactions.length;
  const totalAmount = schedule.transactions.reduce((sum, t) => sum + t.amount, 0);
  const averageAmount = totalTransactions > 0 ? totalAmount / totalTransactions : 0;
  const lastExecuted = schedule.transactions.length > 0 ? schedule.transactions[0].date : null;

  const statistics = {
    totalTransactions,
    totalAmount,
    averageAmount,
    lastExecuted
  };

  return {
    schedule,
    statistics
  };
};