import type { RowSelectionState, Updater } from "@tanstack/table-core";

let _selection = $state<RowSelectionState>({});
export let selection = () => _selection;
export function setSelection(updater: Updater<RowSelectionState>) {
  if (updater instanceof Function) {
    _selection = updater(_selection);
  } else _selection = updater;
}

// Track the last selected row for shift-click range selection
let _lastSelectedRowId = $state<string | null>(null);
export let lastSelectedRowId = () => _lastSelectedRowId;
export function setLastSelectedRowId(rowId: string | null) {
  _lastSelectedRowId = rowId;
}
