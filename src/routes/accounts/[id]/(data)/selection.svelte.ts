import type { RowSelectionState, Updater } from '@tanstack/table-core';

let _selection = $state<RowSelectionState>({});
export let selection = () => _selection;
export function setSelection(updater: Updater<RowSelectionState>) {
  if (updater instanceof Function) {
    _selection = updater(_selection);
  } else _selection = updater;
}
