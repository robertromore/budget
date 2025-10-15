import type {ExpandedState, Updater} from "@tanstack/table-core";

let _expanded = $state<ExpandedState>(true);
export let expanded = () => _expanded;
export function setExpanded(updater: Updater<ExpandedState>) {
  if (updater instanceof Function) {
    _expanded = updater(_expanded);
  } else _expanded = updater;
}
