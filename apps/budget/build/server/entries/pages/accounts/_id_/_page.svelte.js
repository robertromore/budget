import { p as push, e as copy_payload, f as assign_payload, h as pop, i as push_element, o as escape_html, k as pop_element, l as prevent_snippet_stringification, F as FILENAME } from "../../../../chunks/vendor-misc.js";
import "clsx";
import { B as Button, t as Tabs, u as Tabs_list, v as Tabs_trigger, w as Tabs_content } from "../../../../chunks/ui-components.js";
import { l as CategoriesState, P as PayeesState } from "../../../../chunks/app-state.js";
import { T as Transaction_table_container, e as Add_transaction_dialog, f as Delete_transaction_dialog, g as columns, h as Analytics_dashboard } from "../../../../chunks/data-table.js";
import "@layerstack/utils";
import "@layerstack/tailwind";
import "d3-interpolate-path";
import "@dagrejs/dagre";
import "@layerstack/utils/object";
import "d3-tile";
import "d3-sankey";
import { e as $fae977aafc393c5c$export$6b862160d295c8e } from "../../../../chunks/vendor-date.js";
import "trpc-sveltekit";
import "ts-deepmerge";
import "memoize-weak";
import "zod-to-json-schema";
import "../../../../chunks/vendor-forms.js";
import "@sveltejs/kit";
import { P as Plus } from "../../../../chunks/vendor-ui.js";
_page[FILENAME] = "src/routes/accounts/[id]/+page.svelte";
function _page($$payload, $$props) {
  push(_page);
  let { data } = $$props;
  const accountId = data.accountId;
  let activeTab = "dashboard";
  const CLIENT_SIDE_THRESHOLD = 5e3;
  const CACHE_DURATION = 30 * 1e3;
  const responseCache = /* @__PURE__ */ new Map();
  const getCacheKey = (url, params) => params ? `${url}?${JSON.stringify(params)}` : url;
  const getCachedResponse = (key) => {
    const cached = responseCache.get(key);
    return cached && Date.now() - cached.timestamp < CACHE_DURATION ? cached.data : null;
  };
  const setCachedResponse = (key, data2) => {
    responseCache.set(key, { data: data2, timestamp: Date.now() });
    if (responseCache.size > 50) {
      const oldestKey = responseCache.keys().next().value;
      if (oldestKey) responseCache.delete(oldestKey);
    }
  };
  let account = void 0;
  let transactions = [];
  let isLoading = false;
  let error = void 0;
  let summary = void 0;
  let useClientSideTable = true;
  let table = void 0;
  let serverAccountState = void 0;
  let pagination = { page: 0, pageSize: 50, totalCount: 0, totalPages: 0 };
  let filters = {
    searchQuery: "",
    sortBy: "date",
    sortOrder: "desc",
    dateFrom: void 0,
    dateTo: void 0
  };
  const categoriesState = CategoriesState.get();
  const payeesState = PayeesState.get();
  const categories = categoriesState?.all || [];
  const payees = payeesState?.all || [];
  let addTransactionDialogOpen = false;
  let bulkDeleteDialogOpen = false;
  let selectedTransactionIds = [];
  const formattedTransactions = (() => {
    if (!transactions?.length) return [];
    return transactions.map((t) => {
      const dateStr = typeof t.date === "string" ? t.date : t.date.toString();
      const datePart = dateStr.split("T")[0];
      return {
        id: t.id ?? "",
        date: $fae977aafc393c5c$export$6b862160d295c8e(datePart),
        amount: t.amount,
        notes: t.notes,
        status: t.status,
        accountId,
        payeeId: t.payee?.id || null,
        payee: t.payee || null,
        categoryId: t.category?.id || null,
        category: t.category || null,
        parentId: null,
        balance: t.balance || null
      };
    });
  })();
  const simpleFormatted = () => {
    if (!transactions?.length) return [];
    return transactions.map((t) => ({
      id: t.id,
      date: typeof t.date === "string" ? t.date : t.date.toString(),
      amount: t.amount,
      notes: t.notes || "",
      status: t.status,
      payee: t.payee,
      category: t.category
    }));
  };
  async function loadData() {
    if (typeof window === "undefined") return;
    try {
      isLoading = true;
      const numericAccountId = Number(accountId);
      if (isNaN(numericAccountId)) throw new Error(`Invalid account ID: ${accountId}`);
      const summaryCacheKey = getCacheKey("serverAccountsRoutes.loadSummary", { id: numericAccountId });
      let summaryData = getCachedResponse(summaryCacheKey);
      if (!summaryData) {
        const summaryResponse = await fetch(`/trpc/serverAccountsRoutes.loadSummary?input=${encodeURIComponent(JSON.stringify({ id: numericAccountId }))}`);
        if (!summaryResponse.ok) throw new Error(`Failed to load summary: HTTP ${summaryResponse.status}`);
        const summaryText = await summaryResponse.text();
        if (!summaryText.trim()) throw new Error("Empty response from server");
        const summaryResult = JSON.parse(summaryText);
        summaryData = summaryResult.result?.data || summaryResult;
        setCachedResponse(summaryCacheKey, summaryData);
      }
      summary = {
        balance: summaryData?.balance || 0,
        transactionCount: summaryData?.transactionCount || 0
      };
      useClientSideTable = (summaryData?.transactionCount || 0) <= CLIENT_SIDE_THRESHOLD;
      const accountResponse = await fetch(`/trpc/accountRoutes.load?input=${encodeURIComponent(JSON.stringify({ id: numericAccountId }))}`);
      if (!accountResponse.ok) throw new Error(`Failed to load account: HTTP ${accountResponse.status}`);
      const accountText = await accountResponse.text();
      if (!accountText.trim()) throw new Error("Empty account response");
      const accountResult = JSON.parse(accountText);
      const accountData = accountResult.result?.data || accountResult;
      account = { id: accountData.id, name: accountData.name };
      const transactionParams = {
        accountId: numericAccountId,
        page: useClientSideTable ? 0 : pagination.page,
        pageSize: useClientSideTable ? 100 : pagination.pageSize,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      };
      if (filters.searchQuery) transactionParams.searchQuery = filters.searchQuery;
      if (filters.dateFrom) transactionParams.dateFrom = filters.dateFrom;
      if (filters.dateTo) transactionParams.dateTo = filters.dateTo;
      const transactionResponse = await fetch(`/trpc/serverAccountsRoutes.loadTransactions?input=${encodeURIComponent(JSON.stringify(transactionParams))}`);
      if (!transactionResponse.ok) throw new Error(`Failed to load transactions: HTTP ${transactionResponse.status}`);
      const transactionText = await transactionResponse.text();
      if (!transactionText.trim()) throw new Error("Empty transactions response");
      const transactionResult = JSON.parse(transactionText);
      const transactionData = transactionResult.result?.data || transactionResult;
      transactions = transactionData?.transactions || [];
      const paginationData = transactionData?.pagination;
      pagination.totalCount = paginationData?.totalCount || 0;
      pagination.totalPages = paginationData?.totalPages || Math.ceil(pagination.totalCount / pagination.pageSize);
      error = void 0;
    } catch (err) {
      console.error("❌ Failed to load account data:", err);
      console.error("Error details:", err?.message, err?.stack);
      error = err?.message || "Failed to load account data";
      transactions = [];
      account = void 0;
    } finally {
      isLoading = false;
    }
  }
  const submitTransaction = async (formData) => {
    if (!account?.id) return;
    try {
      const transactionResponse = await fetch("/trpc/transactionRoutes.save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "0": {
            json: {
              accountId: Number(account.id),
              amount: formData.amount,
              date: formData.date,
              notes: formData.notes || null,
              payeeId: formData.payeeId,
              categoryId: formData.categoryId,
              status: formData.status
            }
          }
        })
      });
      if (!transactionResponse.ok) throw new Error(`Failed to create transaction: HTTP ${transactionResponse.status}`);
      const transactionText = await transactionResponse.text();
      if (!transactionText.trim()) throw new Error("Empty response when creating transaction");
      const transactionResult = JSON.parse(transactionText);
      const newTransaction = transactionResult[0]?.result?.data || transactionResult[0]?.result;
      if (newTransaction) {
        const formattedTransaction = {
          ...newTransaction,
          date: typeof newTransaction.date === "string" ? $fae977aafc393c5c$export$6b862160d295c8e(newTransaction.date) : newTransaction.date,
          balance: null
        };
        transactions = [formattedTransaction, ...transactions];
        if (summary) {
          summary.balance += newTransaction.amount;
          summary.transactionCount += 1;
        }
        responseCache.clear();
      }
    } catch (err) {
      console.error("❌ Failed to create transaction:", err);
      throw err;
    }
  };
  const searchTransactions = (query) => {
    filters.searchQuery = query;
    pagination.page = 0;
    loadData();
  };
  const updateTransactionData = async (id, columnId, newValue) => {
    try {
      const transaction = transactions.find((t) => t.id === id);
      if (!transaction) return;
      const fieldMap = {
        "payee": "payeeId",
        "category": "categoryId",
        "date": "date",
        "amount": "amount",
        "notes": "notes",
        "status": "status"
      };
      const actualField = fieldMap[columnId] || columnId;
      const updateData = {
        id,
        accountId: Number(transaction.accountId || accountId),
        amount: Number(transaction.amount),
        date: transaction.date,
        notes: transaction.notes || null,
        payeeId: transaction.payee?.id ? Number(transaction.payee.id) : null,
        categoryId: transaction.category?.id ? Number(transaction.category.id) : null,
        status: transaction.status || "pending"
      };
      if (actualField === "payeeId" || actualField === "categoryId" || actualField === "accountId") {
        updateData[actualField] = newValue ? Number(newValue) : null;
      } else if (actualField === "amount") {
        updateData[actualField] = Number(newValue);
      } else {
        updateData[actualField] = newValue;
      }
      const updateResponse = await fetch(`/accounts/${accountId}/api/update-transaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData)
      });
      if (!updateResponse.ok) throw new Error(`Failed to update transaction: HTTP ${updateResponse.status}`);
      const updateResult = await updateResponse.json();
      if (!updateResult.success) throw new Error(updateResult.error || "Failed to update transaction");
      responseCache.clear();
      await loadData();
    } catch (err) {
      console.error("❌ Failed to update transaction:", err);
      error = err?.message || "Failed to update transaction";
    }
  };
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<div class="space-y-6">`);
    push_element($$payload2, "div", 318, 0);
    $$payload2.out.push(`<div class="flex items-center justify-between">`);
    push_element($$payload2, "div", 320, 2);
    $$payload2.out.push(`<div>`);
    push_element($$payload2, "div", 321, 4);
    $$payload2.out.push(`<div class="flex items-center gap-2">`);
    push_element($$payload2, "div", 322, 6);
    $$payload2.out.push(`<h1 class="text-2xl font-bold tracking-tight">`);
    push_element($$payload2, "h1", 323, 8);
    $$payload2.out.push(`${escape_html(account?.name || `Account ${accountId}`)}</h1>`);
    pop_element();
    $$payload2.out.push(` <div class="w-3 h-3 bg-green-500 rounded-full" title="Active account">`);
    push_element($$payload2, "div", 326, 8);
    $$payload2.out.push(`</div>`);
    pop_element();
    $$payload2.out.push(`</div>`);
    pop_element();
    $$payload2.out.push(`</div>`);
    pop_element();
    $$payload2.out.push(` <div class="flex items-center space-x-2">`);
    push_element($$payload2, "div", 331, 4);
    if (table && Object.keys(table.getSelectedRowModel().rowsById).length > 0) {
      $$payload2.out.push("<!--[-->");
      $$payload2.out.push(`<div class="flex items-center space-x-2 mr-4 px-3 py-1 bg-blue-50 border border-blue-200 rounded-md">`);
      push_element($$payload2, "div", 334, 8);
      $$payload2.out.push(`<span class="text-sm text-blue-700">`);
      push_element($$payload2, "span", 335, 10);
      $$payload2.out.push(`${escape_html(Object.keys(table.getSelectedRowModel().rowsById).length)} selected</span>`);
      pop_element();
      $$payload2.out.push(` `);
      Button($$payload2, {
        size: "sm",
        variant: "destructive",
        onclick: () => {
          if (!table) return;
          const selectedRows = Object.keys(table.getSelectedRowModel().rowsById);
          selectedTransactionIds = selectedRows.map((id) => parseInt(id));
          bulkDeleteDialogOpen = true;
        },
        children: prevent_snippet_stringification(($$payload3) => {
          $$payload3.out.push(`<!---->Delete Selected`);
        }),
        $$slots: { default: true }
      });
      $$payload2.out.push(`<!----> `);
      Button($$payload2, {
        size: "sm",
        variant: "outline",
        onclick: () => table?.resetRowSelection(),
        children: prevent_snippet_stringification(($$payload3) => {
          $$payload3.out.push(`<!---->Clear Selection`);
        }),
        $$slots: { default: true }
      });
      $$payload2.out.push(`<!----></div>`);
      pop_element();
    } else {
      $$payload2.out.push("<!--[!-->");
    }
    $$payload2.out.push(`<!--]--> `);
    Button($$payload2, {
      onclick: () => addTransactionDialogOpen = true,
      children: prevent_snippet_stringification(($$payload3) => {
        Plus($$payload3, { class: "h-4 w-4 mr-2" });
        $$payload3.out.push(`<!----> Add Transaction`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----></div>`);
    pop_element();
    $$payload2.out.push(`</div>`);
    pop_element();
    $$payload2.out.push(` `);
    if (error) {
      $$payload2.out.push("<!--[-->");
      $$payload2.out.push(`<div class="rounded-lg border border-red-200 bg-red-50 p-4">`);
      push_element($$payload2, "div", 369, 4);
      $$payload2.out.push(`<div class="flex items-center space-x-2">`);
      push_element($$payload2, "div", 370, 6);
      $$payload2.out.push(`<div class="text-red-600">`);
      push_element($$payload2, "div", 371, 8);
      $$payload2.out.push(`⚠️</div>`);
      pop_element();
      $$payload2.out.push(` <div class="text-red-800 font-medium">`);
      push_element($$payload2, "div", 372, 8);
      $$payload2.out.push(`Error loading account data</div>`);
      pop_element();
      $$payload2.out.push(`</div>`);
      pop_element();
      $$payload2.out.push(` <p class="mt-2 text-red-700">`);
      push_element($$payload2, "p", 374, 6);
      $$payload2.out.push(`${escape_html(error)}</p>`);
      pop_element();
      $$payload2.out.push(`</div>`);
      pop_element();
    } else {
      $$payload2.out.push("<!--[!-->");
    }
    $$payload2.out.push(`<!--]--> <!---->`);
    Tabs($$payload2, {
      class: "w-full mb-1",
      get value() {
        return activeTab;
      },
      set value($$value) {
        activeTab = $$value;
        $$settled = false;
      },
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->`);
        Tabs_list($$payload3, {
          class: "inline-flex h-11",
          children: prevent_snippet_stringification(($$payload4) => {
            $$payload4.out.push(`<!---->`);
            Tabs_trigger($$payload4, {
              value: "dashboard",
              class: "px-6 font-medium",
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->Dashboard`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----> <!---->`);
            Tabs_trigger($$payload4, {
              value: "transactions",
              class: "px-6 font-medium",
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->Transactions`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----> <!---->`);
            Tabs_trigger($$payload4, {
              value: "analytics",
              class: "px-6 font-medium",
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->Analytics`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!---->`);
          }),
          $$slots: { default: true }
        });
        $$payload3.out.push(`<!----> <!---->`);
        Tabs_content($$payload3, {
          value: "dashboard",
          class: "space-y-4",
          children: prevent_snippet_stringification(($$payload4) => {
            $$payload4.out.push(`<div class="rounded-lg border border-blue-200 bg-blue-50 p-6">`);
            push_element($$payload4, "div", 388, 6);
            $$payload4.out.push(`<div class="flex items-center gap-3 mb-4">`);
            push_element($$payload4, "div", 389, 8);
            $$payload4.out.push(`<div class="w-4 h-4 bg-blue-500 rounded-full">`);
            push_element($$payload4, "div", 390, 10);
            $$payload4.out.push(`</div>`);
            pop_element();
            $$payload4.out.push(` <h2 class="text-lg font-semibold text-blue-900">`);
            push_element($$payload4, "h2", 391, 10);
            $$payload4.out.push(`Dashboard Temporarily Disabled</h2>`);
            pop_element();
            $$payload4.out.push(`</div>`);
            pop_element();
            $$payload4.out.push(` <p class="text-blue-800 mb-3">`);
            push_element($$payload4, "p", 393, 8);
            $$payload4.out.push(`Widget dashboard is currently disabled for focused testing of the monthly spending trends chart.</p>`);
            pop_element();
            $$payload4.out.push(` <p class="text-blue-700 text-sm">`);
            push_element($$payload4, "p", 396, 8);
            $$payload4.out.push(`Switch to the <strong>`);
            push_element($$payload4, "strong", 397, 24);
            $$payload4.out.push(`Analytics</strong>`);
            pop_element();
            $$payload4.out.push(` tab to test the isolated monthly spending chart functionality.</p>`);
            pop_element();
            $$payload4.out.push(`</div>`);
            pop_element();
          }),
          $$slots: { default: true }
        });
        $$payload3.out.push(`<!----> <!---->`);
        Tabs_content($$payload3, {
          value: "transactions",
          class: "space-y-4",
          children: prevent_snippet_stringification(($$payload4) => {
            Transaction_table_container($$payload4, {
              isLoading,
              useClientSideTable,
              transactions,
              filters,
              pagination,
              serverAccountState,
              accountId,
              categoriesState,
              payeesState,
              views: data.views,
              columns,
              formattedTransactions,
              simpleFormatted,
              updateTransactionData,
              searchTransactions,
              loadData,
              get table() {
                return table;
              },
              set table($$value) {
                table = $$value;
                $$settled = false;
              }
            });
            $$payload4.out.push(`<!----> `);
            Add_transaction_dialog($$payload4, {
              account,
              payees,
              categories,
              onSubmit: submitTransaction,
              get open() {
                return addTransactionDialogOpen;
              },
              set open($$value) {
                addTransactionDialogOpen = $$value;
                $$settled = false;
              }
            });
            $$payload4.out.push(`<!---->`);
          }),
          $$slots: { default: true }
        });
        $$payload3.out.push(`<!----> <!---->`);
        Tabs_content($$payload3, {
          value: "analytics",
          class: "space-y-4",
          children: prevent_snippet_stringification(($$payload4) => {
            if (transactions && !isLoading && activeTab === "analytics") {
              $$payload4.out.push("<!--[-->");
              Analytics_dashboard($$payload4, { transactions: formattedTransactions, accountId });
            } else {
              $$payload4.out.push("<!--[!-->");
              if (isLoading) {
                $$payload4.out.push("<!--[-->");
                $$payload4.out.push(`<div class="space-y-4">`);
                push_element($$payload4, "div", 440, 8);
                $$payload4.out.push(`<div class="flex items-center justify-between">`);
                push_element($$payload4, "div", 441, 10);
                $$payload4.out.push(`<div class="h-8 w-48 bg-muted animate-pulse rounded">`);
                push_element($$payload4, "div", 442, 12);
                $$payload4.out.push(`</div>`);
                pop_element();
                $$payload4.out.push(` <div class="h-10 w-64 bg-muted animate-pulse rounded">`);
                push_element($$payload4, "div", 443, 12);
                $$payload4.out.push(`</div>`);
                pop_element();
                $$payload4.out.push(`</div>`);
                pop_element();
                $$payload4.out.push(` <div class="h-[400px] bg-muted animate-pulse rounded-lg">`);
                push_element($$payload4, "div", 445, 10);
                $$payload4.out.push(`</div>`);
                pop_element();
                $$payload4.out.push(`</div>`);
                pop_element();
              } else {
                $$payload4.out.push("<!--[!-->");
              }
              $$payload4.out.push(`<!--]-->`);
            }
            $$payload4.out.push(`<!--]-->`);
          }),
          $$slots: { default: true }
        });
        $$payload3.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----> `);
    Delete_transaction_dialog($$payload2, {
      transactions: selectedTransactionIds,
      onDelete: () => {
        table?.resetRowSelection();
        loadData();
      },
      get dialogOpen() {
        return bulkDeleteDialogOpen;
      },
      set dialogOpen($$value) {
        bulkDeleteDialogOpen = $$value;
        $$settled = false;
      }
    });
    $$payload2.out.push(`<!----></div>`);
    pop_element();
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  pop();
}
_page.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
export {
  _page as default
};
