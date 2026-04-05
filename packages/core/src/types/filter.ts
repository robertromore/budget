/**
 * The raw filter applied to a column.
 */
export type ViewFilter = {
  column: string;
  filter: string;
  value: unknown[];
};

/**
 * View-state that can be serialized / restored.
 */
export type ViewDisplayState = {
  [key: string]: any;
};
