// Note: Most category components have been moved to:
// - /routes/categories/(components)/search/
// - /routes/categories/(components)/tree/
//
// These components are only used within the categories route.
// If you need to reuse a component globally, move it back here.

export {default as ParentCategorySelector} from "./parent-category-selector.svelte";
export type {CategoryTreeNode} from "$lib/types/categories";
