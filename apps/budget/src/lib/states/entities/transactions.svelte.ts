import type {Transaction} from "$lib/schema/transactions";
import {getContext, setContext} from "svelte";
import {
  createAccountTransactionsQuery,
  createTransactionsListQuery,
  createAccountSummaryQuery,
  createTransactionMutation,
  createUpdateTransactionMutation,
  createDeleteTransactionMutation,
  createBulkDeleteTransactionsMutation,
} from "$lib/queries/transactions";
import type {
  CreateTransactionData,
  UpdateTransactionData,
  TransactionFilters,
  PaginationParams,
} from "$lib/server/domains/transactions";

const KEY = Symbol("transactions");

export class TransactionsState {
  // Reactive state
  private accountId = $state<number | null>(null);
  private filters = $state<TransactionFilters>({});
  private pagination = $state<PaginationParams>({page: 0, pageSize: 50});

  // Queries
  private accountTransactionsQuery = $state<ReturnType<typeof createAccountTransactionsQuery> | null>(null);
  private listQuery = $state<ReturnType<typeof createTransactionsListQuery> | null>(null);
  private summaryQuery = $state<ReturnType<typeof createAccountSummaryQuery> | null>(null);

  // Mutations
  readonly createMutation = createTransactionMutation();
  readonly updateMutation = createUpdateTransactionMutation();
  readonly deleteMutation = createDeleteTransactionMutation();
  readonly bulkDeleteMutation = createBulkDeleteTransactionsMutation();

  constructor(accountId?: number) {
    if (accountId) {
      this.setAccountId(accountId);
    }
  }

  // Context management
  static get() {
    return getContext<TransactionsState>(KEY);
  }

  static set(accountId?: number) {
    return setContext(KEY, new TransactionsState(accountId));
  }

  // Account management
  setAccountId(accountId: number) {
    this.accountId = accountId;
    this.accountTransactionsQuery = createAccountTransactionsQuery(accountId);
    this.summaryQuery = createAccountSummaryQuery(accountId);
  }

  // Filter management
  setFilters(filters: TransactionFilters) {
    this.filters = filters;
    this.refreshList();
  }

  updateFilter<K extends keyof TransactionFilters>(
    key: K,
    value: TransactionFilters[K]
  ) {
    this.filters = {...this.filters, [key]: value};
    this.refreshList();
  }

  clearFilters() {
    this.filters = {};
    this.refreshList();
  }

  // Pagination management
  setPagination(pagination: PaginationParams) {
    this.pagination = pagination;
    this.refreshList();
  }

  nextPage() {
    const currentPage = this.pagination.page || 0;
    this.setPagination({...this.pagination, page: currentPage + 1});
  }

  previousPage() {
    const currentPage = this.pagination.page || 0;
    if (currentPage > 0) {
      this.setPagination({...this.pagination, page: currentPage - 1});
    }
  }

  setPageSize(pageSize: number) {
    this.setPagination({...this.pagination, pageSize, page: 0});
  }

  // Data refresh
  private refreshList() {
    this.listQuery = createTransactionsListQuery(this.filters, this.pagination);
  }

  refreshAll() {
    if (this.accountId) {
      this.accountTransactionsQuery = createAccountTransactionsQuery(this.accountId);
      this.summaryQuery = createAccountSummaryQuery(this.accountId);
    }
    this.refreshList();
  }

  // Computed getters with proper $derived
  transactions = $derived.by(() => {
    if (this.accountId && this.accountTransactionsQuery) {
      return this.accountTransactionsQuery.data || [];
    }
    return this.listQuery?.data?.data || [];
  });

  isLoading = $derived.by(() => {
    if (this.accountTransactionsQuery) {
      return this.accountTransactionsQuery.isPending;
    }
    return this.listQuery?.isPending || false;
  });

  error = $derived.by(() => {
    if (this.accountTransactionsQuery?.error) {
      return this.accountTransactionsQuery.error;
    }
    return this.listQuery?.error || null;
  });

  summary = $derived.by(() => {
    return this.summaryQuery?.data || null;
  });

  paginationInfo = $derived.by(() => {
    return this.listQuery?.data?.pagination || null;
  });

  // Transaction operations
  async createTransaction(data: CreateTransactionData) {
    return await this.createMutation.mutateAsync(data);
  }

  async updateTransaction(id: number, data: UpdateTransactionData) {
    return await this.updateMutation.mutateAsync({id, data});
  }

  async deleteTransaction(id: number) {
    return await this.deleteMutation.mutateAsync(id);
  }

  async deleteTransactions(ids: number[]) {
    return await this.bulkDeleteMutation.mutateAsync(ids);
  }

  // Helper methods
  getTransactionById(id: number): Transaction | undefined {
    return this.transactions.find((t) => t.id === id);
  }

  filterByStatus(status: "cleared" | "pending" | "scheduled"): Transaction[] {
    return this.transactions.filter((t) => t.status === status);
  }

  filterByCategory(categoryId: number): Transaction[] {
    return this.transactions.filter((t) => t.categoryId === categoryId);
  }

  filterByPayee(payeeId: number): Transaction[] {
    return this.transactions.filter((t) => t.payeeId === payeeId);
  }

  getTotalAmount(): number {
    return this.transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  }

  getClearedBalance(): number {
    return this.transactions
      .filter((t) => t.status === "cleared")
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }

  getPendingBalance(): number {
    return this.transactions
      .filter((t) => t.status === "pending")
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }

  // Search functionality
  searchTransactions(query: string): Transaction[] {
    const searchLower = query.toLowerCase();
    return this.transactions.filter((t) => {
      const notes = t.notes?.toLowerCase() || "";
      const payee = t.payee?.name?.toLowerCase() || "";
      const category = t.category?.name?.toLowerCase() || "";
      return (
        notes.includes(searchLower) ||
        payee.includes(searchLower) ||
        category.includes(searchLower)
      );
    });
  }
}