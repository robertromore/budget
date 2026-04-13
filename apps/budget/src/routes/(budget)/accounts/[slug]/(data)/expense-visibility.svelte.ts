import type { Updater, VisibilityState } from "@tanstack/table-core";

// Initialize with certain columns hidden by default for expense table
let _visibility = $state<VisibilityState>({
  id: false,
  provider: false,
  patientName: false,
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
