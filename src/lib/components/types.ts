import type { Category, Payee } from "$lib/schema";
import type { DateValue } from "@internationalized/date";

export type EditableDateItem = DateValue;
export type EditableEntityItem = {
  id: number;
  name: string;
  [key: string]: unknown;
};
export type EditableNumericItem = {
  value: number | null;
  formatted: string | null;
};
export type SelectableEditableEntity = {
  value: string;
  label: string;
};
export type TransactionsFormat = {
  id: number;
  amount: EditableNumericItem;
  date: DateValue | undefined;
  payeeId: number | null;
  payee: Payee | null;
  notes: string | null;
  category: Category | null;
  categoryId: number | null;
};
