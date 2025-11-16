import type { VisibilityState, Updater } from "@tanstack/table-core";

let _visibility = $state<VisibilityState>({
  diagnosis: false,
  treatmentDescription: false,
  notes: false,
});
export let visibility = () => _visibility;
export function setVisibility(updater: Updater<VisibilityState>) {
  if (updater instanceof Function) {
    _visibility = updater(_visibility);
  } else _visibility = updater;
}
