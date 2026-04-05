import type { Account } from "$core/schema";

export type AccountSortField = "name" | "balance" | "dateOpened" | "status" | "createdAt";
export type SortDirection = "asc" | "desc";

export function sortAccounts(
  accounts: Account[],
  field: AccountSortField,
  direction: SortDirection
): Account[] {
  return [...accounts].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (field) {
      case "name":
        aValue = a.name?.toLowerCase() || "";
        bValue = b.name?.toLowerCase() || "";
        break;
      case "balance":
        aValue = a.balance || 0;
        bValue = b.balance || 0;
        break;
      case "dateOpened":
        aValue = a.dateOpened ? new Date(a.dateOpened).getTime() : 0;
        bValue = b.dateOpened ? new Date(b.dateOpened).getTime() : 0;
        break;
      case "status":
        aValue = a.closed ? 1 : 0;
        bValue = b.closed ? 1 : 0;
        break;
      case "createdAt":
        aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        break;
      default:
        aValue = a.name?.toLowerCase() || "";
        bValue = b.name?.toLowerCase() || "";
        break;
    }

    if (aValue < bValue) return direction === "asc" ? -1 : 1;
    if (aValue > bValue) return direction === "asc" ? 1 : -1;
    return 0;
  });
}
