import type { RequestHandler } from './$types';
import { createContext } from '$lib/trpc/context';
import { createCaller } from '$lib/trpc/router';
import { json, error } from '@sveltejs/kit';
import { queryCache, cacheKeys } from '$lib/utils/cache';

export const POST: RequestHandler = async ({ request, params }) => {
  try {
    const data = await request.json();
    const caller = createCaller(await createContext());
    const result = await caller.transactionRoutes.save(data);
    
    // Invalidate relevant cache entries after successful update
    const accountId = parseInt(params.id);
    if (!isNaN(accountId)) {
      // Clear all transaction caches for this account
      queryCache.delete(cacheKeys.accountSummary(accountId));
      queryCache.delete(cacheKeys.allAccounts());
      
      // Clear transaction caches for different page sizes and pages
      for (let page = 0; page < 10; page++) {
        for (const pageSize of [10, 25, 50, 100]) {
          queryCache.delete(cacheKeys.accountTransactions(accountId, page, pageSize));
        }
      }
      
      // Clear recent transactions cache
      for (const limit of [5, 10, 15, 20]) {
        queryCache.delete(cacheKeys.recentTransactions(accountId, limit));
      }
      
    }
    
    return json({ success: true, transaction: result });
  } catch (err: any) {
    console.error('❌ API route error:', err);
    return json({ success: false, error: err.message }, { status: 400 });
  }
};