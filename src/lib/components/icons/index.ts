// Centralized icon management for better tree-shaking and performance
// Import only used icons to reduce bundle size

// Navigation icons
export { default as Plus } from "@lucide/svelte/icons/plus";
export { default as Import } from "@lucide/svelte/icons/import"; 
export { default as ChevronDown } from "@lucide/svelte/icons/chevron-down";
export { default as ChevronRight } from "@lucide/svelte/icons/chevron-right";
export { default as ChevronLeft } from "@lucide/svelte/icons/chevron-left";
export { default as ChevronsRight } from "@lucide/svelte/icons/chevrons-right";
export { default as ChevronsLeft } from "@lucide/svelte/icons/chevrons-left";

// Actions icons
export { default as MoreHorizontal } from "@lucide/svelte/icons/more-horizontal";
export { default as CirclePlus } from "@lucide/svelte/icons/circle-plus";
export { default as EyeOff } from "@lucide/svelte/icons/eye-off";
export { default as SlidersHorizontal } from "@lucide/svelte/icons/sliders-horizontal";

// Sorting icons
export { default as ArrowDown } from "@lucide/svelte/icons/arrow-down";
export { default as ArrowUp } from "@lucide/svelte/icons/arrow-up";
export { default as ArrowUpDown } from "@lucide/svelte/icons/arrow-up-down";

// Data icons
export { default as CalendarDays } from "@lucide/svelte/icons/calendar-days";
export { default as HandCoins } from "@lucide/svelte/icons/hand-coins";
export { default as SquareMousePointer } from "@lucide/svelte/icons/square-mouse-pointer";
export { default as SquareCheck } from "@lucide/svelte/icons/square-check";

// Common icons for forms and UI
export { default as X } from "@lucide/svelte/icons/x";
export { default as Check } from "@lucide/svelte/icons/check";
export { default as AlertCircle } from "@lucide/svelte/icons/alert-circle";
export { default as Info } from "@lucide/svelte/icons/info";
export { default as Search } from "@lucide/svelte/icons/search";
export { default as Settings } from "@lucide/svelte/icons/settings";
export { default as Trash2 } from "@lucide/svelte/icons/trash-2";
export { default as Edit } from "@lucide/svelte/icons/edit";
export { default as Save } from "@lucide/svelte/icons/save";
export { default as Cancel } from "@lucide/svelte/icons/x-circle";

// Type exports for better TypeScript support
export type IconComponent = typeof Plus;