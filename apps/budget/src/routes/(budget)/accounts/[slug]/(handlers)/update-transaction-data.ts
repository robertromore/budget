import type { Category, Payee, Transaction } from "$core/schema";
import { arePayeesSimilar } from "$lib/utils/payee-matching";

export interface PayeeBulkDialogConfig {
  transactionId: number;
  payeeId: number | null;
  payeeName: string | null;
  originalPayeeName: string;
  matchCount: number;
  newPayeeDefaultCategoryId: number | null;
  newPayeeDefaultCategoryName: string | null;
}

export interface CategoryBulkDialogConfig {
  transactionId: number;
  categoryId: number | null;
  categoryName: string | null;
  originalPayeeName: string;
  matchCountByPayee: number;
  matchCountByCategory: number;
  previousCategoryId: number | null;
}

export interface UpdateTransactionDataDeps {
  /** Snapshot accessor: latest transactions for the table. */
  getTransactions: () => Transaction[];
  /** Snapshot accessor: latest payees lookup. */
  getPayees: () => Payee[];
  /** Snapshot accessor: latest categories lookup. */
  getCategories: () => Category[];
  /** Persist the partial update; mutation handles cache invalidation on success. */
  mutate: (input: { id: number; data: Record<string, unknown> }) => Promise<unknown>;
  /** Open the payee bulk-update dialog after a payee change with similar matches. */
  openPayeeBulkDialog: (config: PayeeBulkDialogConfig) => void;
  /** Open the category bulk-update dialog after a category change with matches. */
  openCategoryBulkDialog: (config: CategoryBulkDialogConfig) => void;
}

const FIELD_MAP: Record<string, string> = {
  payee: "payeeId",
  category: "categoryId",
  date: "date",
  amount: "amount",
  notes: "notes",
  status: "status",
};

/**
 * Inline-edit handler for the per-account transactions table. Wraps the
 * update mutation with bulk-update detection: when the user changes a
 * payee or category on a row that has near-duplicates, persist the
 * single-row change first, then surface a dialog offering to apply the
 * same change to the matched siblings.
 */
export function createUpdateTransactionDataHandler(deps: UpdateTransactionDataDeps) {
  return async function updateTransactionData(
    id: number,
    columnId: string,
    newValue?: unknown
  ): Promise<void> {
    try {
      const transaction = deps.getTransactions().find((t) => t.id === id);
      if (!transaction) return;

      const actualField = FIELD_MAP[columnId] ?? columnId;
      const updateData: Record<string, unknown> = {};

      if (actualField === "payeeId" || actualField === "categoryId") {
        updateData[actualField] = newValue ? Number(newValue) : null;
      } else if (actualField === "amount") {
        updateData[actualField] = Number(newValue);
      } else {
        updateData[actualField] = newValue;
      }

      const originalPayeeName = transaction.payee?.name;
      if (actualField === "payeeId" && originalPayeeName) {
        const transactions = deps.getTransactions();
        const newPayeeId = updateData.payeeId as number | null;
        const newPayee = deps.getPayees().find((p) => p.id === newPayeeId);

        const similarTransactions = transactions.filter((t) => {
          if (t.id === id || !t.payee?.name) return false;
          return arePayeesSimilar(t.payee.name, originalPayeeName);
        });

        if (similarTransactions.length > 0) {
          await deps.mutate({ id, data: updateData });

          const newPayeeDefaultCategoryId = newPayee?.defaultCategoryId ?? null;
          const newPayeeDefaultCategory = newPayeeDefaultCategoryId
            ? deps.getCategories().find((c) => c.id === newPayeeDefaultCategoryId)
            : null;

          deps.openPayeeBulkDialog({
            transactionId: id,
            payeeId: newPayeeId,
            payeeName: newPayee?.name || null,
            originalPayeeName,
            matchCount: similarTransactions.length,
            newPayeeDefaultCategoryId,
            newPayeeDefaultCategoryName: newPayeeDefaultCategory?.name ?? null,
          });
          return;
        }
      }

      if (actualField === "categoryId") {
        const transactions = deps.getTransactions();
        const originalCategory = transaction.category;
        const newCategoryId = updateData.categoryId as number | null;
        const newCategory = deps.getCategories().find((c) => c.id === newCategoryId);
        const payeeName = transaction.payee?.name;

        const matchesByPayee = payeeName
          ? transactions.filter((t) => {
              if (t.id === id || !t.payee?.name) return false;
              return arePayeesSimilar(t.payee.name, payeeName);
            })
          : [];

        const matchesByCategory = originalCategory
          ? transactions.filter((t) => t.id !== id && t.category?.id === originalCategory.id)
          : [];

        if (matchesByPayee.length > 0 || matchesByCategory.length > 0) {
          await deps.mutate({ id, data: updateData });

          deps.openCategoryBulkDialog({
            transactionId: id,
            categoryId: newCategoryId,
            categoryName: newCategory?.name || null,
            originalPayeeName: payeeName || "",
            matchCountByPayee: matchesByPayee.length,
            matchCountByCategory: matchesByCategory.length,
            previousCategoryId: originalCategory?.id ?? null,
          });
          return;
        }
      }

      await deps.mutate({ id, data: updateData });
    } catch {
      // Surface via the mutation's error toast.
    }
  };
}
