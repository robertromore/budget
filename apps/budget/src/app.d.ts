import type {RenderComponentConfig} from "$lib/components/ui/data-table/render-helpers";
import type {FilterInputOption} from "$lib/types";
import type {Component} from "svelte";
import type {Column, RowData} from "@tanstack/table-core";

declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      /** Set by the desktop auto-login hook when DESKTOP_MODE=true */
      preAuth?: { userId: string; sessionToken: string };
      /** The signed-in user object from desktop auto-login */
      desktopUser?: any;
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

declare module "@tanstack/table-core" {
  interface ColumnMeta<TData extends RowData, TValue> {
    label?: string;
    facetedFilter?: (column: Column<TData, TValue>) => FilterInputOption;
    availableFilters?: AvailableFilters;
    headerClass?: string;
    cellClass?: string;
    hiddenByDefault?: boolean;
  }
}

export {};
