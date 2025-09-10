import { c as createCaller, a as createContext, q as queryCache, b as cacheKeys } from "../../../../../../chunks/router.js";
import { json } from "@sveltejs/kit";
const POST = async ({ request, params }) => {
  try {
    const data = await request.json();
    const caller = createCaller(await createContext());
    const result = await caller.transactionRoutes.save(data);
    const accountId = parseInt(params.id);
    if (!isNaN(accountId)) {
      queryCache.delete(cacheKeys.accountSummary(accountId));
      queryCache.delete(cacheKeys.allAccounts());
      for (let page = 0; page < 10; page++) {
        for (const pageSize of [10, 25, 50, 100]) {
          queryCache.delete(cacheKeys.accountTransactions(accountId, page, pageSize));
        }
      }
      for (const limit of [5, 10, 15, 20]) {
        queryCache.delete(cacheKeys.recentTransactions(accountId, limit));
      }
    }
    return json({ success: true, transaction: result });
  } catch (err) {
    console.error("❌ API route error:", err);
    return json({ success: false, error: err.message }, { status: 400 });
  }
};
export {
  POST
};
