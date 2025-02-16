import type { SortingState, Updater } from '@tanstack/table-core';

let _sorting = $state<SortingState>([
  {
    id: 'id',
    desc: true
  }
]);
export let sorting = () => _sorting;
export function setSorting(updater: Updater<SortingState>) {
  if (updater instanceof Function) {
    _sorting = updater(_sorting);
  } else _sorting = updater;
}
