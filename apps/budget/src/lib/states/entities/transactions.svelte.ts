import { rpc } from "$lib/query";
import type { Transaction } from "$lib/schema/transactions";
import type {
  CreateTransactionData,
  PaginationParams,
  TransactionFilters,
  UpdateTransactionData,
} from "$lib/server/domains/transactions";
import { getContext, setContext } from "svelte";

const KEY = Symbol("transactions");

export class TransactionsState {
  // Reactive state
  private accountId = $state<number | null>(null);
  private filters = $state<TransactionFilters>({});
  private pagination = $state<PaginationParams>({ page: 0, pageSize: 50 });

  // Queries - using ReturnType of factory .options() method
  private accountTransactionsQuery = $state<ReturnType<
    ReturnType<typeof rpc.transactions.getAccountTransactions>["options"]
  > | null>(null);
  private listQuery = $state<ReturnType<
    ReturnType<typeof rpc.transactions.getTransactionsList>["options"]
  > | null>(null);
  private summaryQuery = $state<ReturnType<
    ReturnType<typeof rpc.transactions.getAccountSummary>["options"]
  > | null>(null);

  // Mutations
  readonly createMutation = rpc.transactions.createTransaction.options();
  readonly updateMutation = rpc.transactions.updateTransaction.options();
  readonly deleteMutation = rpc.transactions.deleteTransaction.options();
  readonly bulkDeleteMutation = rpc.transactions.bulkDeleteTransactions.options();

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
    this.accountTransactionsQuery = rpc.transactions.getAccountTransactions(accountId).options();
    this.summaryQuery = rpc.transactions.getAccountSummary(accountId).options();
  }

  // Filter management
  setFilters(filters: TransactionFilters) {
    this.filters = filters;
    this.refreshList();
  }

  updateFilter<K extends keyof TransactionFilters>(key: K, value: TransactionFilters[K]) {
    this.filters = { ...this.filters, [key]: value };
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
    this.setPagination({ ...this.pagination, page: currentPage + 1 });
  }

  previousPage() {
    const currentPage = this.pagination.page || 0;
    if (currentPage > 0) {
      this.setPagination({ ...this.pagination, page: currentPage - 1 });
    }
  }

  setPageSize(pageSize: number) {
    this.setPagination({ ...this.pagination, pageSize, page: 0 });
  }

  // Data refresh
  private refreshList() {
    this.listQuery = rpc.transactions.getTransactionsList(this.filters, this.pagination).options();
  }

  refreshAll() {
    if (this.accountId) {
      this.accountTransactionsQuery = rpc.transactions.getAccountTransactions(this.accountId).options();
      this.summaryQuery = rpc.transactions.getAccountSummary(this.accountId).options();
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
    return await this.updateMutation.mutateAsync({ id, data });
  }

  async deleteTransaction(id: number) {
    return await this.deleteMutation.mutateAsync(id);
  }

  async deleteTransactions(ids: number[]) {
    return await this.bulkDeleteMutation.mutateAsync(ids);
  }

  // Helper methods
  getTransactionById(id: number): Transaction | undefined {
    return this.transactions.find((t: Transaction) => t.id === id);
  }

  filterByStatus(status: "cleared" | "pending" | "scheduled"): Transaction[] {
    return this.transactions.filter((t: Transaction) => t.status === status);
  }

  filterByCategory(categoryId: number): Transaction[] {
    return this.transactions.filter((t: Transaction) => t.categoryId === categoryId);
  }

  filterByPayee(payeeId: number): Transaction[] {
    return this.transactions.filter((t: Transaction) => t.payeeId === payeeId);
  }

  getTotalAmount(): number {
    return this.transactions.reduce((sum: number, t: Transaction) => sum + (t.amount || 0), 0);
  }

  getClearedBalance(): number {
    return this.transactions
      .filter((t: Transaction) => t.status === "cleared")
      .reduce((sum: number, t: Transaction) => sum + (t.amount || 0), 0);
  }

  getPendingBalance(): number {
    return this.transactions
      .filter((t: Transaction) => t.status === "pending")
      .reduce((sum: number, t: Transaction) => sum + (t.amount || 0), 0);
  }

  // Search functionality
  searchTransactions(query: string): Transaction[] {
    const searchLower = query.toLowerCase();
    return this.transactions.filter((t: Transaction) => {
      const notes = t.notes?.toLowerCase() || "";
      const payee = (t as any).payee?.name?.toLowerCase() || "";
      const category = (t as any).category?.name?.toLowerCase() || "";
      return (
        notes.includes(searchLower) || payee.includes(searchLower) || category.includes(searchLower)
      );
    });
  }
}
