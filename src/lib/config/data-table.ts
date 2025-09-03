/**
 * Data table configuration constants
 */

// Threshold for switching from client-side to server-side data handling
export const DATA_TABLE_SERVER_SIDE_THRESHOLD = 5000;

// Page sizes for different modes
export const CLIENT_SIDE_PAGE_SIZES = [10, 20, 30, 40, 50, 100];
export const SERVER_SIDE_PAGE_SIZES = [25, 50, 100, 200];

// Default page size for each mode
export const DEFAULT_CLIENT_PAGE_SIZE = 50;
export const DEFAULT_SERVER_PAGE_SIZE = 50;