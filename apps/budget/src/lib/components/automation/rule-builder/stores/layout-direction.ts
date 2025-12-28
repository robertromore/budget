/**
 * Layout Direction Store
 *
 * Shared state for the current layout direction used by node components
 * to determine handle positions.
 */

import { writable } from 'svelte/store';
import type { LayoutDirection } from '../utils';

/**
 * Current layout direction for the rule builder.
 * Nodes subscribe to this to position their handles correctly.
 */
export const layoutDirection = writable<LayoutDirection>('horizontal');

/**
 * Helper to determine if the current layout is horizontal
 */
export function isHorizontalLayout(direction: LayoutDirection): boolean {
	return direction === 'horizontal';
}
