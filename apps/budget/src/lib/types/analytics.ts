import type {Component} from "svelte";

/**
 * Data structure for top spending categories analytics
 */
export type TopCategoryData = {
  /** Category ID */
  id: number;
  /** Category name */
  name: string;
  /** Total amount spent in this category */
  amount: number;
  /** Number of transactions in this category */
  count: number;
  /** Percentage of total spending */
  percentage: number;
  /** Icon component for the category */
  icon?: Component;
  /** Color for the category */
  color?: string;
};

/**
 * Enum for table entity types that support views
 */
export type TableEntityType = "transactions" | "top_categories";
