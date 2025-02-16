import type { GroupingState, Updater } from '@tanstack/table-core';

let _grouping = $state<GroupingState>([]);
export let grouping = () => _grouping;
export function setGrouping(updater: Updater<GroupingState> | string[]) {
  if (updater instanceof Function) {
    _grouping = updater(_grouping);
  } else _grouping = updater;
}
