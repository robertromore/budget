import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Snippet } from "svelte";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types needed by shadcn-svelte components
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & {
  ref?: U | null;
};

// Utility types for component props
export type WithChild<T = Record<string, never>> = T & {
  children?: Snippet;
};

export type WithoutChild<T> = Omit<T, "children">;

export type WithoutChildren<T> = Omit<T, "children">;

export type WithoutChildrenOrChild<T> = Omit<T, "children" | "child">;