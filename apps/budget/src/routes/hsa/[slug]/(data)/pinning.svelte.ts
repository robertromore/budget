import type { ColumnPinningState, Updater } from "@tanstack/table-core";

let _pinning = $state<ColumnPinningState>({
  left: ["select-col", "expand-contract-col"],
  right: [],
});
export let pinning = () => _pinning;
export function setPinning(updater: Updater<ColumnPinningState>) {
  if (updater instanceof Function) {
    _pinning = updater(_pinning);
  } else _pinning = updater;
}
