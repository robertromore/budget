import type { ColumnOrderState, Updater } from "@tanstack/table-core";

let _columnOrder = $state<ColumnOrderState>([]);
export let columnOrder = () => _columnOrder;
export function setColumnOrder(updater: Updater<ColumnOrderState>) {
  if (updater instanceof Function) {
    _columnOrder = updater(_columnOrder);
  } else _columnOrder = updater;
}
