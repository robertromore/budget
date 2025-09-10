// $lib/types/base.ts
import type {DateValue} from "@internationalized/date";

/**
 * Generic “label/value” pair.
 */
export type Option<T> = {value: T; label: string};

/**
 * Editable item wrappers – used by the UI to represent
 * editable cells of different types.
 */
export type EditableBooleanItem = {value: boolean};
export type EditableDateItem = DateValue;
export type EditableEntityItem = {
  id: number;
  name: string | null;
  [key: string]: unknown;
};
export type EditableNumericItem = {value: number | null; formatted: string | null};
export type SelectableEditableEntity = {value: string; label: string};
