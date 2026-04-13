import type { PaginationState, Updater } from "@tanstack/table-core";

let _pagination = $state<PaginationState>({
  pageIndex: 0,
  pageSize: 25, // Smaller page size for testing
});
export let pagination = () => _pagination;
export function setPagination(updater: Updater<PaginationState>) {
  if (updater instanceof Function) {
    _pagination = updater(_pagination);
  } else _pagination = updater;
}
